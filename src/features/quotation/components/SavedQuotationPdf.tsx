"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { Button } from "~/components/ui/button";

export function SavedQuotationPdf({revisionId}: {revisionId: string}) {
  const status = useQuery(api.quotationPdfArtifacts.status, {revision_id: revisionId as Id<"quotations">});
  const retry = useMutation(api.quotationPdfArtifacts.retry);
  const [retryState, setRetryState] = useState<"idle" | "pending" | "failed">("idle");
  const url = `/api/quotations/${encodeURIComponent(revisionId)}/pdf`;
  return <section className="space-y-4 rounded-lg border p-4" aria-label="Issued PDF">
    <h2 className="text-lg font-semibold">Issued PDF</h2>
    {!status || status.kind === "pending" || status.kind === "running" ? <p role="status">The revision is saved. Its PDF is being prepared. You can leave this page and return later.</p>
      : status.kind === "missing_original" ? <p role="status">The original PDF was not recorded. It cannot be regenerated as an issued original.</p>
      : status.kind === "failed" ? <div className="space-y-3"><p role="alert">The revision is saved, but its PDF could not be prepared. Retry prepares the PDF only and creates no revision.</p>
        <Button type="button" disabled={retryState === "pending"} onClick={async () => {
          setRetryState("pending");
          try { await retry({revision_id: revisionId as Id<"quotations">}); setRetryState("idle"); }
          catch { setRetryState("failed"); }
        }}>{retryState === "pending" ? "Retrying PDF..." : "Retry PDF"}</Button>
        {retryState === "failed" && <p role="alert">PDF retry could not be confirmed. The saved revision is unchanged. Try again after checking your sign-in.</p>}
      </div>
      : <><p role="status">The issued PDF is ready. These are the preserved bytes for this exact revision.</p>
        <div className="flex flex-wrap gap-4"><a href={url} target="_blank" rel="noopener noreferrer" className="underline">Open issued PDF</a><a href={`${url}?download=1`} className="underline">Download issued PDF</a></div>
        <iframe title="Preserved issued quotation PDF" src={url} className="hidden h-[760px] w-full rounded border md:block" />
      </>}
  </section>;
}
