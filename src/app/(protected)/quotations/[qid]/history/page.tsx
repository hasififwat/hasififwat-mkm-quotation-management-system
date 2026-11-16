export const dynamic = "force-dynamic";

import Link from "next/link";
import { makeFunctionReference } from "convex/server";
import type { Doc, Id } from "convex/_generated/dataModel";
import { api } from "convex/_generated/api";
import { getServerConvexClient } from "~/lib/convex-server";
import { revisionDate, revisionReference } from "~/features/quotation/revision-display";

const historyQuery = makeFunctionReference<"query", {family_id: Id<"quotation_families">}, {family: Doc<"quotation_families">; revisions: Doc<"quotations">[]}>("quotationFamilies:history");

export default async function QuotationHistoryPage({params}: {params: Promise<{qid: string}>}) {
  const {qid} = await params;
  const client = await getServerConvexClient();
  const details = await client.query(api.quotations.getQuotationFullDetails, {target_quotation_id: qid});
  if (!details?.revision_context.family_id) return <section className="col-span-full space-y-3 p-6"><h1 className="text-2xl font-semibold">Revision history</h1><p>Revision history is unavailable for this legacy quotation.</p><Link className="underline" href={`/quotations/review/${qid}`}>View saved quotation</Link></section>;
  const {family, revisions} = await client.query(historyQuery, {family_id: details.revision_context.family_id});
  const references = new Map(revisions.map(row => [String(row._id), revisionReference(row)]));
  return <section className="col-span-full mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
    <header className="space-y-3"><h1 className="text-2xl font-semibold">Revision history</h1><p>{family.hijri_year}-{String(family.sequence_num).padStart(4, "0")} · {family.archived ? "Archived family" : "Current family"}</p>
      <p className="text-sm text-muted-foreground">Earliest retained quotation {revisionDate(details.revision_context.family_created_at)} in Kuala Lumpur time. Each link opens its exact saved revision.</p>
      <div className="flex flex-wrap gap-4"><Link className="underline" href={`/quotations/review/${family.current_revision_id}`}>View current revision</Link>{!family.archived && <Link className="underline" href={`/quotations/edit/${family.current_revision_id}`}>Edit current revision</Link>}<Link className="underline" href="/quotations">Quotations</Link></div>
    </header>
    {revisions.some(row => row.legacy_provenance === "legacy_unknown") && <p className="rounded-lg border bg-muted p-4 text-sm">Legacy provenance is unknown. This retained history does not establish a complete history before migration. Unknown actors, dates and sources remain not recorded.</p>}
    <ol className="space-y-4">{revisions.map(row => <li key={row._id} className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><Link href={`/quotations/review/${row._id}`} className="break-words text-lg font-semibold underline">{revisionReference(row)}</Link><span>{row._id === family.current_revision_id ? "Current revision" : "Historical revision"}</span></div>
      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">{[["Saved status",row.status], ["Saved by",row.saved_by ?? "Not recorded"], ["Revision issued (Kuala Lumpur)",revisionDate(row.issue_date)], ["Saved at (Kuala Lumpur)",revisionDate(row.created_at)], ["Total",`RM ${row.total_amount.toFixed(2)}`], ["Source revision",row.previous_revision_id ? references.get(row.previous_revision_id) ?? "Not recorded" : row.legacy_provenance === "legacy_unknown" ? "Not recorded" : "Initial revision"]].map(([label,value]) => <div key={label} className="min-w-0"><dt className="text-muted-foreground">{label}</dt><dd className="break-words">{value}</dd></div>)}</dl>
      <Link className="inline-block text-sm underline" href={`/quotations/review/${row._id}`}>View saved details and issued PDF</Link>
    </li>)}</ol>
  </section>;
}
