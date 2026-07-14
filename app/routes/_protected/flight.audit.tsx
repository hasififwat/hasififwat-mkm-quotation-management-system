import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { Plane, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";

export function meta() {
  return [{ title: "Flight Audit - MKM Quotation" }];
}

const SOURCE_OPTIONS = ["all", "sync", "manual"] as const;
type SourceFilter = (typeof SOURCE_OPTIONS)[number];

export default function FlightAuditPage() {
  const flights = useQuery(api.packageFlights.listAll) ?? [];

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [seasonFilter, setSeasonFilter] = useState("all");

  const seasons = useMemo(() => {
    const s = new Set(flights.map((f) => f.package_season).filter(Boolean));
    return ["all", ...Array.from(s).sort()];
  }, [flights]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return flights.filter((f) => {
      if (sourceFilter !== "all" && (f.source ?? "manual") !== sourceFilter) return false;
      if (seasonFilter !== "all" && f.package_season !== seasonFilter) return false;
      if (q) {
        return (
          f.package_name.toLowerCase().includes(q) ||
          f.departure_sector.toLowerCase().includes(q) ||
          f.return_sector.toLowerCase().includes(q) ||
          (f.flight ?? "").toLowerCase().includes(q) ||
          f.departure_date.includes(q)
        );
      }
      return true;
    });
  }, [flights, search, sourceFilter, seasonFilter]);

  const syncCount   = flights.filter((f) => (f.source ?? "manual") === "sync").length;
  const manualCount = flights.filter((f) => (f.source ?? "manual") === "manual").length;

  return (
    <div className="col-span-12 py-6 mx-2 sm:mx-4 lg:w-185 xl:w-250 lg:mx-auto space-y-6 pb-10 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Plane className="w-6 h-6 text-muted-foreground" />
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Flight Audit</h2>
          <p className="text-sm text-muted-foreground">All flights in the database</p>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold">{flights.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total flights</p>
        </div>
        <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-4 text-center">
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{syncCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">From MFF sync</p>
        </div>
        <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 p-4 text-center">
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{manualCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Manually added</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search package, sector, date…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Source filter tabs */}
        <div className="flex rounded-md border overflow-hidden text-sm">
          {SOURCE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setSourceFilter(opt)}
              className={`px-3 py-1.5 capitalize transition-colors ${
                sourceFilter === opt
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted/50"
              }`}
            >
              {opt === "all" ? "All sources" : opt}
            </button>
          ))}
        </div>

        {/* Season filter */}
        <select
          value={seasonFilter}
          onChange={(e) => setSeasonFilter(e.target.value)}
          className="rounded-md border px-3 py-1.5 text-sm bg-background"
        >
          {seasons.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All seasons" : s}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Package</TableHead>
              <TableHead>Season</TableHead>
              <TableHead>Airline</TableHead>
              <TableHead>Departure</TableHead>
              <TableHead>Dep. Sector</TableHead>
              <TableHead>Return</TableHead>
              <TableHead>Ret. Sector</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                  No flights found
                </TableCell>
              </TableRow>
            )}
            {filtered
              .slice()
              .sort((a, b) => a.package_name.localeCompare(b.package_name) || a.departure_date.localeCompare(b.departure_date))
              .map((f) => {
                const source = f.source ?? "manual";
                return (
                  <TableRow key={f._id}>
                    <TableCell className="font-medium text-sm">{f.package_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{f.package_season}</TableCell>
                    <TableCell className="text-sm">{f.flight || <span className="text-muted-foreground/50">—</span>}</TableCell>
                    <TableCell className="text-sm tabular-nums">{f.departure_date}</TableCell>
                    <TableCell className="text-xs font-mono">{f.departure_sector}</TableCell>
                    <TableCell className="text-sm tabular-nums">{f.return_date}</TableCell>
                    <TableCell className="text-xs font-mono">{f.return_sector}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={source === "sync"
                          ? "text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950/30"
                          : "text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30"}
                      >
                        {source}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          Showing {filtered.length} of {flights.length} flights
        </p>
      )}
    </div>
  );
}
