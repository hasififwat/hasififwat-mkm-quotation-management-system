import Link from "next/link";
import type { QuotationFullDetails } from "~/app/(protected)/quotations/review/[qid]/types";
import { revisionDate } from "../revision-display";
import { SavedQuotationPdf } from "./SavedQuotationPdf";

export function SavedRevisionReview({details, saved, source}: {details: QuotationFullDetails; saved: boolean; source: {id: string | null; reference: string | null}}) {
  const context = details.revision_context;
  const doc = details.saved_document;
  const rows = [...details.items.selected_rooms.map(item => ({...item, name: item.room_type, kind: "Room"})),
    ...details.items.adds_ons.map(item => ({...item, kind: "Add-on"})), ...details.items.discounts.map(item => ({...item, kind: "Discount"}))];
  return <article className="workspace-page max-w-5xl space-y-6">
    {saved && <p role="status" className="rounded border bg-muted p-3">Revision {details.reference_number} saved. PDF preparation has its own status below.</p>}
    <header className="space-y-3"><p className="text-sm text-muted-foreground">{context.is_current ? "Current revision" : "Historical revision"} · Saved status {details.status}</p>
      <h1 className="wrap-anywhere text-xl font-bold tracking-tight md:text-2xl">{details.reference_number}</h1>
      {!context.is_current && <p>This is an exact saved revision. A newer revision exists. This view is read-only.</p>}
      <nav className="flex flex-wrap gap-4"><Link className="underline" href="/quotations">Quotations</Link><Link className="underline" href={`/quotations/${details.id}/history`}>Revision history</Link>
        {context.can_append ? <Link className="underline" href={`/quotations/edit/${details.id}`}>Edit current revision</Link> : !context.is_current ? <Link className="underline" href={`/quotations/review/${context.current_revision_id}`}>View current revision</Link> : null}</nav>
    <p className="text-sm">Source revision {source.id ? <Link className="underline" href={`/quotations/review/${source.id}`}>{source.reference}</Link> : doc.provenance === "legacy_unknown" ? "Not recorded" : "Initial revision"}</p></header>
    <dl className="grid grid-cols-1 gap-4 rounded-lg border p-4 sm:grid-cols-2">
      {[["Client", doc.client_name], ["PIC", doc.pic_name], ["Branch", doc.branch], ["Saved by", doc.saved_by ?? "Not recorded"],
        ["Revision issued (Kuala Lumpur)", revisionDate(context.revision_issue_date)], ["Earliest retained quotation (Kuala Lumpur)", revisionDate(context.family_created_at)],
        ["Package", doc.package_snapshot?.name || "Not recorded"], ["Flight", doc.flight_snapshot ? `${doc.flight_snapshot.departure_date} ${doc.flight_snapshot.departure_sector} to ${doc.flight_snapshot.return_date} ${doc.flight_snapshot.return_sector}` : "Not recorded"]].map(([label,value]) => <div key={label} className="min-w-0"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="break-words">{value}</dd></div>)}
    </dl>
    {doc.provenance === "legacy_unknown" && <p className="rounded border bg-muted p-3 text-sm">Legacy provenance is unknown. This retained history does not establish a complete history before migration. Missing values remain not recorded.</p>}
    <section className="space-y-3" aria-label="Saved quotation items"><h2 className="text-lg font-semibold">Saved quotation</h2>
      {rows.map(row => <div key={row.id} className="grid grid-cols-2 gap-2 rounded border p-3 sm:grid-cols-4"><span className="break-words">{row.name || "Not recorded"}</span><span>{row.kind}</span><span>RM {row.price.toFixed(2)} × {row.pax}</span><span className="font-medium">RM {row.subtotal.toFixed(2)}</span></div>)}
      <p className="text-lg font-semibold">Total RM {details.total_amount.toFixed(2)}</p><p className="whitespace-pre-wrap break-words">{details.notes || "No notes saved."}</p>
    </section>
    <SavedQuotationPdf revisionId={details.id} />
  </article>;
}
