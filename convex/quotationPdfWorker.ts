"use node";

import { createHash } from "node:crypto";
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { renderQuotationPdf } from "../src/features/quotation/pdf/render-server";
import type { QuotationRenderInput } from "../src/features/quotation/pdf/render-input";

export const run = internalAction({args: {artifact_id: v.id("quotation_pdf_artifacts")}, handler: async (ctx, args) => {
  const claim = await ctx.runMutation(internal.quotationPdfArtifacts.claim, args);
  if (!claim) return;
  const {artifact, attempt_id} = claim;
  try {
    const input: QuotationRenderInput = JSON.parse(artifact.input_json);
    const bytes = await renderQuotationPdf(input);
    const storage_id = await ctx.storage.store(new Blob([new Uint8Array(bytes)], {type: "application/pdf"}));
    await ctx.runMutation(internal.quotationPdfArtifacts.recordUpload, {
      attempt_id, storage_id, mime: "application/pdf", size: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      input_sha256: createHash("sha256").update(artifact.input_json).digest("hex"),
    });
    await ctx.runMutation(internal.quotationPdfArtifacts.finalize, {attempt_id});
  } catch (error) {
    console.error("PDF attempt failed", attempt_id, error);
    await ctx.runMutation(internal.quotationPdfArtifacts.fail, {attempt_id});
  } finally {
    await ctx.runMutation(internal.quotationPdfArtifacts.cleanup, {attempt_id});
  }
}});

export const download = action({args: {revision_id: v.id("quotations")}, handler: async (ctx, args): Promise<{bytes: ArrayBuffer; filename: string; sha256: string; size: number}> => {
  const artifact = await ctx.runQuery(internal.quotationPdfArtifacts.authorizedArtifact, args);
  if (!artifact) throw new Error("Original issued PDF is missing");
  if (artifact.state.kind !== "ready") throw new Error("PDF is not ready");
  const blob = await ctx.storage.get(artifact.state.storage_id);
  if (!blob) throw new Error("Original issued PDF is missing from storage");
  const bytes = await blob.arrayBuffer();
  if (bytes.byteLength !== artifact.state.size || createHash("sha256").update(new Uint8Array(bytes)).digest("hex") !== artifact.state.sha256) throw new Error("Stored PDF integrity failure");
  return {bytes, filename: artifact.filename, sha256: artifact.state.sha256, size: artifact.state.size};
}});
