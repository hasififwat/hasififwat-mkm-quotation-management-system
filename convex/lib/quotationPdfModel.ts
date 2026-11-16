import { v } from "convex/values";

export const pdfMetadata = {
  storage_id: v.id("_storage"), mime: v.literal("application/pdf"),
  size: v.number(), sha256: v.string(), input_sha256: v.string(),
};
export const pdfState = v.union(
  v.object({ kind: v.literal("pending") }),
  v.object({ kind: v.literal("running"), attempt_id: v.id("quotation_pdf_attempts"), lease_until: v.number() }),
  v.object({ kind: v.literal("failed"), reason: v.string() }),
  v.object({ kind: v.literal("ready"), attempt_id: v.id("quotation_pdf_attempts"), ...pdfMetadata }),
);
