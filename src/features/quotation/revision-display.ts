export function revisionDate(value: string | null | undefined) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Not recorded";
  return new Intl.DateTimeFormat("en-MY", {dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuala_Lumpur"}).format(new Date(value));
}
export function revisionReference(row: {hijri_year: string; sequence_num: number; revision: number}) {
  return `${row.hijri_year}-${String(row.sequence_num).padStart(4, "0")}${row.revision ? `-R${row.revision}` : ""}`;
}
