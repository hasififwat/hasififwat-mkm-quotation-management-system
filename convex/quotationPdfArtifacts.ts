import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { FrozenQuotationDocumentV1 } from "./quotationRevisionSaves";
import { freezeRevisionPdf } from "./lib/quotationPdfInput";
import { pdfMetadata } from "./lib/quotationPdfModel";

const LEASE_MS = 120_000;
export async function enqueueRevisionPdf(ctx: MutationCtx, revision_id: Id<"quotations">, document: FrozenQuotationDocumentV1) {
  const input = freezeRevisionPdf(document);
  const input_json = JSON.stringify(input);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input_json));
  const input_sha256 = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  const artifact_id = await ctx.db.insert("quotation_pdf_artifacts", {
    revision_id, input_json, input_sha256,
    filename: `${document.quotation_number.replace(/[^a-z0-9-]/gi, "-")}.pdf`,
    renderer_version: input.renderVersion, asset_version: input.assets.version, terms_version: input.termsVersion,
    provenance: document.provenance ? "legacy_reconstruction" : "issued_original", state: {kind: "pending"},
  });
  await ctx.scheduler.runAfter(0, internal.quotationPdfWorker.run, {artifact_id});
  return artifact_id;
}

export const claim = internalMutation({args: {artifact_id: v.id("quotation_pdf_artifacts")}, handler: async (ctx, {artifact_id}) => {
  const artifact = await ctx.db.get(artifact_id);
  if (!artifact || artifact.state.kind === "ready" || artifact.state.kind === "failed") return null;
  if (artifact.state.kind === "running") return null;
  const attempt_id = await ctx.db.insert("quotation_pdf_attempts", {artifact_id, retired: false});
  await ctx.db.patch(artifact_id, {state: {kind: "running", attempt_id, lease_until: Date.now() + LEASE_MS}});
  await ctx.scheduler.runAfter(LEASE_MS, internal.quotationPdfArtifacts.reconcile, {artifact_id});
  return {artifact, attempt_id};
}});

export const recordUpload = internalMutation({args: {attempt_id: v.id("quotation_pdf_attempts"), ...pdfMetadata}, handler: async (ctx, {attempt_id, ...candidate}) => {
  const attempt = await ctx.db.get(attempt_id);
  if (!attempt || attempt.candidate) throw new Error("Upload ownership already recorded or absent");
  const artifact = await ctx.db.get(attempt.artifact_id);
  if (!artifact || artifact.input_sha256 !== candidate.input_sha256) throw new Error("Frozen input hash mismatch");
  const stored = await ctx.db.system.get(candidate.storage_id);
  if (!stored || stored.size !== candidate.size || stored.sha256 !== btoa(String.fromCharCode(...candidate.sha256.match(/../g)!.map(byte => parseInt(byte, 16)))) || stored.contentType !== candidate.mime) throw new Error("Stored PDF metadata mismatch");
  await ctx.db.patch(attempt_id, {candidate});
  await ctx.scheduler.runAfter(0, internal.quotationPdfArtifacts.cleanup, {attempt_id});
}});

export const finalize = internalMutation({args: {attempt_id: v.id("quotation_pdf_attempts")}, handler: async (ctx, {attempt_id}) => {
  const attempt = await ctx.db.get(attempt_id);
  if (!attempt || attempt.retired || !attempt.candidate) return false;
  const artifact = await ctx.db.get(attempt.artifact_id);
  if (!artifact || artifact.state.kind !== "running" || artifact.state.attempt_id !== attempt_id) return false;
  await ctx.db.patch(artifact._id, {state: {kind: "ready", attempt_id, ...attempt.candidate}});
  return true;
}});

export const cleanup = internalMutation({args: {attempt_id: v.id("quotation_pdf_attempts")}, handler: async (ctx, {attempt_id}) => {
  const attempt = await ctx.db.get(attempt_id);
  if (!attempt) return;
  const artifact = await ctx.db.get(attempt.artifact_id);
  if (artifact?.state.kind === "ready" && artifact.state.attempt_id === attempt_id) return;
  if (artifact?.state.kind === "running" && artifact.state.attempt_id === attempt_id) return;
  if (attempt.candidate) await ctx.storage.delete(attempt.candidate.storage_id);
  await ctx.db.patch(attempt_id, {retired: true});
}});

export const fail = internalMutation({args: {attempt_id: v.id("quotation_pdf_attempts")}, handler: async (ctx, {attempt_id}) => {
  const attempt = await ctx.db.get(attempt_id);
  if (!attempt) return;
  const artifact = await ctx.db.get(attempt.artifact_id);
  if (artifact?.state.kind !== "running" || artifact.state.attempt_id !== attempt_id) return;
  if (attempt.candidate) {
    await ctx.scheduler.runAfter(0, internal.quotationPdfArtifacts.finalize, {attempt_id});
    return;
  }
  await ctx.db.patch(artifact._id, {state: {kind: "failed", reason: "PDF creation failed. Retry this saved revision."}});
}});

export const reconcile = internalMutation({args: {artifact_id: v.id("quotation_pdf_artifacts")}, handler: async (ctx, {artifact_id}) => {
  const artifact = await ctx.db.get(artifact_id);
  if (!artifact || artifact.state.kind === "ready" || artifact.state.kind === "failed") return;
  if (artifact.state.kind === "running") {
    if (artifact.state.lease_until > Date.now()) return;
    const attempt_id = artifact.state.attempt_id;
    const attempt = await ctx.db.get(attempt_id);
    if (attempt?.candidate && !attempt.retired) {
      await ctx.db.patch(artifact_id, {state: {kind: "ready", attempt_id, ...attempt.candidate}});
      return;
    }
    await ctx.db.patch(attempt_id, {retired: true});
  }
  await ctx.db.patch(artifact_id, {state: {kind: "pending"}});
  await ctx.scheduler.runAfter(0, internal.quotationPdfWorker.run, {artifact_id});
}});

export const retry = mutation({args: {revision_id: v.id("quotations")}, handler: async (ctx, {revision_id}) => {
  if (!await getAuthUserId(ctx)) throw new Error("Not authenticated");
  const artifact = await ctx.db.query("quotation_pdf_artifacts").withIndex("by_revision", q => q.eq("revision_id", revision_id)).unique();
  if (!artifact) throw new Error("Original PDF is missing. It cannot be regenerated as an issued original.");
  if (artifact.state.kind === "failed") await ctx.db.patch(artifact._id, {state: {kind: "pending"}});
  await ctx.scheduler.runAfter(0, internal.quotationPdfArtifacts.reconcile, {artifact_id: artifact._id});
}});

export const authorizedArtifact = internalQuery({args: {revision_id: v.id("quotations")}, handler: async (ctx, {revision_id}) => {
  if (!await getAuthUserId(ctx)) throw new Error("Not authenticated");
  return ctx.db.query("quotation_pdf_artifacts").withIndex("by_revision", q => q.eq("revision_id", revision_id)).unique();
}});
export const status = query({args: {revision_id: v.id("quotations")}, handler: async (ctx, {revision_id}) => {
  if (!await getAuthUserId(ctx)) throw new Error("Not authenticated");
  const artifact = await ctx.db.query("quotation_pdf_artifacts").withIndex("by_revision", q => q.eq("revision_id", revision_id)).unique();
  if (!artifact) return {kind: "missing_original" as const};
  const {input_json, _creationTime, _id, state, ...metadata} = artifact;
  if (state.kind !== "ready") return {...metadata, kind: state.kind};
  const {storage_id, attempt_id, kind, ...bytes} = state;
  return {...metadata, kind, ...bytes};
}});
