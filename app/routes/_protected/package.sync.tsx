import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  airlineName,
  buildSyncPlan,
  parseMffCsv,
  parsePriceListCsv,
} from "~/features/packages/sync/parsers";
import type {
  ApplyProgress,
  ApplyResult,
  FlightAddSpec,
  FlightRemoveSpec,
  PackageCreateSpec,
  PackageMappingRow,
  PackageUpdateSpec,
  SyncPlan,
} from "~/features/packages/sync/types";

// ─── File drop zone ───────────────────────────────────────────────────────────

function DropZone({
  label,
  description,
  fileName,
  onFile,
  onClear,
}: {
  label: string;
  description: string;
  fileName: string | null;
  onFile: (f: File) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = (f: File | null | undefined) => f && onFile(f);

  if (fileName) {
    return (
      <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 border-muted-foreground/20">
        <div className="p-2 rounded-full bg-primary/10">
          <FileText className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileName}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        <Button size="icon" variant="ghost" onClick={onClear} className="shrink-0">
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files?.[0]); }}
      className={`w-full border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary ${dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}`}
    >
      <input ref={ref} type="file" accept=".csv" hidden onChange={(e) => handle(e.target.files?.[0])} />
      <UploadCloud className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </button>
  );
}

// ─── Hotel helpers ────────────────────────────────────────────────────────────

function quotationMealLabel(meals: string[], hotelType: string): string {
  const m = meals.map((s) => s.trim()).filter(Boolean);
  const type = hotelType.toUpperCase();
  if (m.length === 0) return `TIADA MAKANAN (${type})`;
  if (m.length >= 3) return `FULL BOARD (${type})`;
  if (m.length === 2) return `HALF BOARD (${type})`;
  return `${m[0].toUpperCase()} (${type})`;
}

// ─── Create accordion ─────────────────────────────────────────────────────────

function PackageCreateCard({ spec }: { spec: PackageCreateSpec }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center gap-3 px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
          >
            <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
            <span className="font-medium text-sm">{spec.name}</span>
            <Badge variant="outline" className="text-xs">{spec.season}</Badge>
            <span className="text-xs text-muted-foreground">{spec.duration}</span>
            <span className="text-xs text-muted-foreground ml-auto">
              {spec.hotels.length} hotel{spec.hotels.length !== 1 ? "s" : ""} · {spec.rooms.length} room type{spec.rooms.length !== 1 ? "s" : ""}
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 py-3 border-t space-y-4 text-sm">
            {/* Transport */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Transport</p>
              <p className="text-sm">{spec.transport || "—"}</p>
            </div>

            {/* Hotels & Meals */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Hotels &amp; Meals</p>
              <div className="space-y-1">
                {spec.hotels.map((h) => (
                  <div key={h.hotel_type} className="flex items-baseline gap-2 text-sm">
                    <span className="font-medium min-w-16">{h.hotel_type}</span>
                    <span>{h.name || <span className="italic text-muted-foreground/60">no name</span>}</span>
                    <span className="text-muted-foreground text-xs ml-auto">{quotationMealLabel(h.meals, h.hotel_type)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rooms */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Room Pricing</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1">
                {spec.rooms.map((r) => (
                  <div key={r.room_type} className="flex items-baseline justify-between text-sm">
                    <span className="font-medium text-muted-foreground">{r.room_type}</span>
                    <span className="font-semibold">RM {r.price.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Clone source */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Clone inclusions from</p>
              {spec.clone_from_label ? (
                <p className="text-sm text-muted-foreground">{spec.clone_from_label}</p>
              ) : (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> No match found — inclusions will be empty
                </p>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function PackagesToCreateSection({ items }: { items: PackageCreateSpec[] }) {
  if (items.length === 0) return null;
  return (
    <AccordionItem value="create">
      <AccordionTrigger className="hover:no-underline px-4">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-green-600" />
          <span className="font-semibold">Create {items.length} packages</span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-2 mx-2 mb-2">
          {items.map((spec, i) => (
            <PackageCreateCard key={i} spec={spec} />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

// ─── Update accordion ─────────────────────────────────────────────────────────

function mealLabel(meals: string[]): string {
  const s = [...meals].sort().join("+");
  if (s === "BREAKFAST+DINNER+LUNCH") return "FB";
  if (s === "BREAKFAST+DINNER") return "HB";
  if (s === "BREAKFAST") return "BB";
  return meals.join(", ") || "—";
}

function PackageUpdateCard({ spec }: { spec: PackageUpdateSpec }) {
  const changedFields = new Set(spec.changes.map((c) => c.field));

  const allTypes = [
    ...new Set([
      ...spec.current_hotels.map((h) => h.hotel_type.toUpperCase()),
      ...spec.hotels.map((h) => h.hotel_type.toUpperCase()),
    ]),
  ];

  const currByType = new Map(spec.current_hotels.map((h) => [h.hotel_type.toUpperCase(), h]));
  const nextByType = new Map(spec.hotels.map((h) => [h.hotel_type.toUpperCase(), h]));

  const transportChanged = changedFields.has("Transport");

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/30 border-b">
        <span className="font-medium text-sm">{spec.db_name}</span>
        <Badge variant="outline" className="text-xs">{spec.row.db_season}</Badge>
        <span className="text-xs text-muted-foreground ml-auto">
          {spec.changes.length} change{spec.changes.length !== 1 ? "s" : ""}
        </span>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="w-24 py-2">Field</TableHead>
            <TableHead className="py-2">Current (DB)</TableHead>
            <TableHead className="w-6 text-center py-2" />
            <TableHead className="py-2">New (CSV)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className={transportChanged ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
            <TableCell className="text-xs font-medium text-muted-foreground py-1.5">Transport</TableCell>
            <TableCell className="text-xs py-1.5">
              <span className={transportChanged ? "line-through text-red-500/80" : ""}>
                {spec.current_transport || "—"}
              </span>
            </TableCell>
            <TableCell className="text-center text-muted-foreground text-xs py-1.5">→</TableCell>
            <TableCell className="text-xs py-1.5">
              <span className={transportChanged ? "text-green-600 font-medium" : ""}>
                {spec.transport || "—"}
              </span>
            </TableCell>
          </TableRow>
          {allTypes.map((type) => {
            const curr = currByType.get(type);
            const next = nextByType.get(type);
            const nameChanged = changedFields.has(`${type} hotel`);
            const mealsChanged = changedFields.has(`${type} meals`);
            const anyChanged = nameChanged || mealsChanged;
            return (
              <TableRow key={type} className={anyChanged ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
                <TableCell className="text-xs font-medium text-muted-foreground py-1.5">{type}</TableCell>
                <TableCell className="text-xs py-1.5">
                  <span className={nameChanged ? "line-through text-red-500/80" : ""}>{curr?.name || "—"}</span>
                  <span className={`ml-1 text-muted-foreground ${mealsChanged ? "line-through text-red-500/80" : ""}`}>
                    ({mealLabel(curr?.meals ?? [])})
                  </span>
                </TableCell>
                <TableCell className="text-center text-muted-foreground text-xs py-1.5">→</TableCell>
                <TableCell className="text-xs py-1.5">
                  <span className={nameChanged ? "text-green-600 font-medium" : ""}>{next?.name || "—"}</span>
                  <span className={`ml-1 ${mealsChanged ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
                    ({mealLabel(next?.meals ?? [])})
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
          {spec.rooms.length > 0 && (
            <TableRow className="border-t">
              <TableCell className="text-xs font-medium text-muted-foreground py-1.5">Rooms</TableCell>
              <TableCell colSpan={3} className="text-xs py-1.5">
                <span className="flex flex-wrap gap-x-4 gap-y-0.5">
                  {spec.rooms.map((r) => (
                    <span key={r.room_type}>
                      <span className="font-medium">{r.room_type}</span>
                      <span className="ml-1 text-muted-foreground">RM {r.price.toLocaleString()}</span>
                    </span>
                  ))}
                </span>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function PackagesToUpdateSection({ items }: { items: PackageUpdateSpec[] }) {
  if (items.length === 0) return null;
  return (
    <AccordionItem value="update">
      <AccordionTrigger className="hover:no-underline px-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-blue-600" />
          <span className="font-semibold">Update {items.length} packages</span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-3 mx-2 mb-2">
          {items.map((spec, i) => (
            <PackageUpdateCard key={i} spec={spec} />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

// ─── Flights sections ─────────────────────────────────────────────────────────

function FlightsToAddSection({ items }: { items: FlightAddSpec[] }) {
  if (items.length === 0) return null;
  return (
    <AccordionItem value="flights-add">
      <AccordionTrigger className="hover:no-underline px-4">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-green-600" />
          <span className="font-semibold">Add {items.length} flights</span>
          {items.some((f) => f.needs_new_package) && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="text-amber-600 border-amber-300 cursor-help">
                    {items.filter((f) => f.needs_new_package).length} need new package
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-72 text-center">
                  These flights belong to packages listed in the <strong>Create packages</strong> section above — not additional packages. On Apply, those packages are created first, then these flights are linked to them.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {items.some((f) => f.unresolvable) && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="text-red-600 border-red-300 cursor-help">
                    {items.filter((f) => f.unresolvable).length} unresolvable
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-64 text-center">
                  These flights have status <strong>no_db_package</strong> in the CSV but no matching package in the Create list. They will be skipped on Apply. Check that the package name and season in the flight CSV exactly match the mapping CSV.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="rounded-md border mx-2 mb-2 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package</TableHead>
                <TableHead>Season</TableHead>
                <TableHead>Departure</TableHead>
                <TableHead>Dep. Sector</TableHead>
                <TableHead>Return</TableHead>
                <TableHead>Ret. Sector</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((spec, i) => (
                <TableRow key={i} className={spec.unresolvable ? "bg-red-50 dark:bg-red-950/20" : spec.needs_new_package ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
                  <TableCell className="font-medium">
                    <span>{spec.package_name}</span>
                    {spec.unresolvable ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="ml-1.5 inline-flex items-center gap-1 text-xs text-red-600 cursor-help">
                              <AlertTriangle className="w-3 h-3" /> no matching create spec
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-64">
                            This flight needs a new package (<strong>{spec.package_name} · {spec.season}</strong>) but no entry with that exact name and season was found in the mapping CSV. It will be skipped on Apply.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : spec.needs_new_package ? (
                      <span className="ml-1 text-xs text-amber-600">(new)</span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{spec.season}</Badge>
                  </TableCell>
                  <TableCell>{spec.departure_date}</TableCell>
                  <TableCell className="font-mono text-xs">{spec.departure_sector}</TableCell>
                  <TableCell>{spec.return_date}</TableCell>
                  <TableCell className="font-mono text-xs">{spec.return_sector}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function FlightsToRemoveSection({ items }: { items: FlightRemoveSpec[] }) {
  if (items.length === 0) return null;
  return (
    <AccordionItem value="flights-remove">
      <AccordionTrigger className="hover:no-underline px-4">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-red-600" />
          <span className="font-semibold">Remove {items.length} flights</span>
          <span className="text-xs text-muted-foreground font-normal">(2026/2027 legacy flights skipped)</span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="rounded-md border mx-2 mb-2 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package</TableHead>
                <TableHead>Season</TableHead>
                <TableHead>Departure</TableHead>
                <TableHead>Return</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((spec, i) => (
                <TableRow key={i} className="bg-red-50 dark:bg-red-950/20">
                  <TableCell className="font-medium">{spec.package_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{spec.season}</Badge>
                  </TableCell>
                  <TableCell>{spec.departure_date}</TableCell>
                  <TableCell>{spec.return_date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

// ─── Merged by-package view ──────────────────────────────────────────────────

type PackageEntry = {
  key: string;
  name: string;
  season: string;
  action: "create" | "update" | "flights-only";
  spec: PackageCreateSpec | PackageUpdateSpec | null;
  flightsToAdd: FlightAddSpec[];
  flightsToRemove: FlightRemoveSpec[];
};

function buildMergedEntries(plan: SyncPlan): PackageEntry[] {
  const map = new Map<string, PackageEntry>();

  const getOrCreate = (name: string, season: string): PackageEntry => {
    const key = `${name.trim().toUpperCase()}|${season.trim().toUpperCase()}`;
    if (!map.has(key)) {
      map.set(key, { key, name, season, action: "flights-only", spec: null, flightsToAdd: [], flightsToRemove: [] });
    }
    return map.get(key)!;
  };

  for (const spec of plan.packagesToCreate) {
    const entry = getOrCreate(spec.name, spec.season);
    entry.action = "create";
    entry.spec = spec;
  }
  for (const spec of plan.packagesToUpdate) {
    const entry = getOrCreate(spec.row.canonical_name, spec.row.season_code);
    entry.action = "update";
    entry.spec = spec;
  }
  for (const f of plan.flightsToAdd) {
    getOrCreate(f.package_name, f.season).flightsToAdd.push(f);
  }
  for (const f of plan.flightsToRemove) {
    getOrCreate(f.package_name, f.season).flightsToRemove.push(f);
  }

  return Array.from(map.values()).sort((a, b) => {
    const order = { create: 0, update: 1, "flights-only": 2 };
    return order[a.action] - order[b.action] || a.name.localeCompare(b.name);
  });
}

function MergedPlanSection({ plan }: { plan: SyncPlan }) {
  const [showNoFlights, setShowNoFlights] = useState(false);
  const allEntries = buildMergedEntries(plan);
  const withFlights = allEntries.filter((e) => e.flightsToAdd.length > 0 || e.flightsToRemove.length > 0);
  const noFlightsCount = allEntries.length - withFlights.length;
  const entries = showNoFlights ? allEntries : withFlights;
  return (
    <AccordionItem value="merged">
      <AccordionTrigger className="hover:no-underline px-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-600" />
          <span className="font-semibold">Combined view by package</span>
          <Badge variant="outline" className="text-purple-600 border-purple-300">{entries.length} packages</Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        {noFlightsCount > 0 && (
          <div className="mx-2 mb-2 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground h-7"
              onClick={() => setShowNoFlights((v) => !v)}
            >
              {showNoFlights ? `Hide ${noFlightsCount} packages with no flights` : `Show ${noFlightsCount} packages with no flights`}
            </Button>
          </div>
        )}
        <div className="space-y-2 mx-2 mb-2">
          {entries.map((entry) => {
            const pureAdds    = entry.flightsToAdd.filter(f => f.row.status !== "edited");
            const editedAdds  = entry.flightsToAdd.filter(f => f.row.status === "edited");
            const pureRemoves = entry.flightsToRemove.filter(f => f.row.status !== "edited");
            const hasFlights  = pureAdds.length > 0 || editedAdds.length > 0 || pureRemoves.length > 0;
            return (
            <Collapsible key={entry.key} defaultOpen={false}>
              <CollapsibleTrigger className="w-full">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-md border text-left ${!hasFlights ? "bg-muted/20 opacity-60 hover:opacity-80" : "bg-muted/40 hover:bg-muted/70"}`}>
                  {entry.action === "create" && <Plus className="w-3.5 h-3.5 text-green-600 shrink-0" />}
                  {entry.action === "update" && <RefreshCw className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                  {entry.action === "flights-only" && <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                  <span className="font-medium text-sm flex-1 truncate">{entry.name}</span>
                  <Badge variant="outline" className="text-xs shrink-0">{entry.season}</Badge>
                  {entry.action === "create" && <Badge className="text-xs bg-green-100 text-green-800 border-0 shrink-0">New package</Badge>}
                  {entry.action === "update" && <Badge className="text-xs bg-blue-100 text-blue-800 border-0 shrink-0">Updated</Badge>}
                  {pureAdds.length > 0 && (
                    <span className="text-xs text-emerald-600 shrink-0">+{pureAdds.length} flights</span>
                  )}
                  {editedAdds.length > 0 && (
                    <span className="text-xs text-blue-600 shrink-0">{editedAdds.length} updated</span>
                  )}
                  {pureRemoves.length > 0 && (
                    <span className="text-xs text-red-500 shrink-0">−{pureRemoves.length} flights</span>
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {hasFlights && (
                  <div className="rounded-md border mx-1 mt-1 mb-2 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-6"></TableHead>
                          <TableHead>Airline</TableHead>
                          <TableHead>Departure</TableHead>
                          <TableHead>Dep. Flight</TableHead>
                          <TableHead>Dep. Sector</TableHead>
                          <TableHead>Return</TableHead>
                          <TableHead>Ret. Sector</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pureAdds.map((f, i) => (
                          <TableRow key={`add-${i}`} className="bg-emerald-50 dark:bg-emerald-950/20">
                            <TableCell><Plus className="w-3 h-3 text-emerald-600" /></TableCell>
                            <TableCell className="text-xs font-medium">{airlineName(f.row.airline)}</TableCell>
                            <TableCell className="text-xs">{f.departure_date}</TableCell>
                            <TableCell className="text-xs font-mono">{f.row.dep_flight}</TableCell>
                            <TableCell className="text-xs">{f.departure_sector}</TableCell>
                            <TableCell className="text-xs">{f.return_date}</TableCell>
                            <TableCell className="text-xs">{f.return_sector}</TableCell>
                          </TableRow>
                        ))}
                        {editedAdds.map((f, i) => (
                          <TableRow key={`edit-${i}`} className="bg-blue-50 dark:bg-blue-950/20">
                            <TableCell><Pencil className="w-3 h-3 text-blue-500" /></TableCell>
                            <TableCell className="text-xs font-medium">{airlineName(f.row.airline)}</TableCell>
                            <TableCell className="text-xs">{f.departure_date}</TableCell>
                            <TableCell className="text-xs font-mono">{f.row.dep_flight}</TableCell>
                            <TableCell className="text-xs">{f.departure_sector}</TableCell>
                            <TableCell className="text-xs">{f.return_date}</TableCell>
                            <TableCell className="text-xs">{f.return_sector}</TableCell>
                          </TableRow>
                        ))}
                        {pureRemoves.map((f, i) => (
                          <TableRow key={`rem-${i}`} className="bg-red-50 dark:bg-red-950/20">
                            <TableCell><Trash2 className="w-3 h-3 text-red-500" /></TableCell>
                            <TableCell className="text-xs font-medium">{airlineName(f.row.airline)}</TableCell>
                            <TableCell className="text-xs">{f.departure_date}</TableCell>
                            <TableCell className="text-xs font-mono">{f.row.dep_flight}</TableCell>
                            <TableCell className="text-xs">{f.row.departure_sector}</TableCell>
                            <TableCell className="text-xs">{f.return_date}</TableCell>
                            <TableCell className="text-xs">{f.row.return_sector}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
            );
          })}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

// ─── Step 2: Flight diff verification ────────────────────────────────────────

import type { FlightDiffRow } from "~/features/packages/sync/types";

function FlightDiffStep({
  rows,
  onBack,
  onContinue,
}: {
  rows: FlightDiffRow[];
  onBack: () => void;
  onContinue: () => void;
}) {
  const added         = rows.filter(r => r.status === "added");
  const willRemove    = rows.filter(r => r.status === "removed" && r.season !== "2026/2027");
  const legacySkipped = rows.filter(r => r.status === "removed" && r.season === "2026/2027");
  const noDbPkg       = rows.filter(r => r.status === "no_db_package");
  const unchanged     = rows.filter(r => r.status === "unchanged");
  const edited        = rows.filter(r => r.status === "edited");

  // Group flights by "package|season"
  function groupByPackage(list: FlightDiffRow[]) {
    const map = new Map<string, { name: string; season: string; rows: FlightDiffRow[] }>();
    for (const r of list) {
      const key = `${r.package_name}|${r.season}`;
      if (!map.has(key)) map.set(key, { name: r.package_name, season: r.season, rows: [] });
      map.get(key)!.rows.push(r);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  function FlightGroupTable({ group, rowClass }: { group: ReturnType<typeof groupByPackage>[0]; rowClass: string }) {
    return (
      <Collapsible defaultOpen={group.rows.length <= 5}>
        <CollapsibleTrigger asChild>
          <button type="button" className="w-full flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/30 hover:bg-muted/50 text-left text-sm">
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="font-medium flex-1">{group.name}</span>
            <Badge variant="outline" className="text-xs">{group.season}</Badge>
            <span className="text-xs text-muted-foreground">{group.rows.length} flight{group.rows.length !== 1 ? "s" : ""}</span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="rounded-md border mx-1 mt-1 mb-2 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Airline</TableHead>
                  <TableHead>Departure</TableHead>
                  <TableHead>Dep. Flight</TableHead>
                  <TableHead>Dep. Sector</TableHead>
                  <TableHead>Return</TableHead>
                  <TableHead>Ret. Sector</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.rows.map((r, i) => (
                  <TableRow key={i} className={rowClass}>
                    <TableCell className="text-xs font-medium">{r.airline ? airlineName(r.airline) : "—"}</TableCell>
                    <TableCell className="text-xs">{r.departure_date}</TableCell>
                    <TableCell className="text-xs font-mono">{r.dep_flight || "—"}</TableCell>
                    <TableCell className="text-xs">{r.departure_sector}</TableCell>
                    <TableCell className="text-xs">{r.return_date}</TableCell>
                    <TableCell className="text-xs">{r.return_sector}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 p-3 text-center">
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{added.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">To add</p>
        </div>
        <div className="rounded-lg border bg-red-50 dark:bg-red-950/20 p-3 text-center">
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">{willRemove.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">To remove</p>
          {legacySkipped.length > 0 && (
            <p className="text-xs text-muted-foreground/60 mt-0.5">+{legacySkipped.length} legacy skipped</p>
          )}
        </div>
        <div className={`rounded-lg border p-3 text-center ${edited.length > 0 ? "bg-blue-50 dark:bg-blue-950/20" : ""}`}>
          <p className={`text-2xl font-bold ${edited.length > 0 ? "text-blue-700 dark:text-blue-400" : "text-muted-foreground"}`}>{edited.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Airline / sector changed</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{unchanged.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Unchanged</p>
        </div>
        <div className={`rounded-lg border p-3 text-center ${noDbPkg.length > 0 ? "bg-amber-50 dark:bg-amber-950/20" : ""}`}>
          <p className={`text-2xl font-bold ${noDbPkg.length > 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>{noDbPkg.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">No package match</p>
        </div>
      </div>

      {/* No DB package warning */}
      {noDbPkg.length > 0 && (
        <Card className="border-amber-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
              {noDbPkg.length} flight{noDbPkg.length !== 1 ? "s" : ""} could not be matched to a package
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              These MFF rows have no matching package in the DB or in the Create list. They will be skipped on Apply.
            </p>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>MFF Name</TableHead>
                  <TableHead>Canonical Name</TableHead>
                  <TableHead>Season</TableHead>
                  <TableHead>Departure</TableHead>
                  <TableHead>Return</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {noDbPkg.map((r, i) => (
                  <TableRow key={i} className="bg-amber-50/50 dark:bg-amber-950/10">
                    <TableCell className="text-xs font-mono">{r.notes}</TableCell>
                    <TableCell className="text-xs font-medium">{r.package_name}</TableCell>
                    <TableCell className="text-xs"><Badge variant="outline">{r.season}</Badge></TableCell>
                    <TableCell className="text-xs">{r.departure_date}</TableCell>
                    <TableCell className="text-xs">{r.return_date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Added flights */}
      {added.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600" />
            {added.length} flights to add
          </h3>
          {groupByPackage(added).map(g => (
            <FlightGroupTable key={g.name + g.season} group={g} rowClass="bg-emerald-50/50 dark:bg-emerald-950/10" />
          ))}
        </div>
      )}

      {/* Edited flights (airline / sector changed) */}
      {edited.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-blue-600" />
            {edited.length} flights with airline or sector changes
            <span className="text-xs font-normal text-muted-foreground">— old flight will be replaced with new</span>
          </h3>
          {groupByPackage(edited).map(group => (
            <Collapsible key={group.name + group.season} defaultOpen>
              <CollapsibleTrigger asChild>
                <button type="button" className="w-full flex items-center gap-2 px-3 py-2 rounded-md border bg-blue-50/50 dark:bg-blue-950/10 hover:bg-blue-50 text-left text-sm">
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium flex-1">{group.name}</span>
                  <Badge variant="outline" className="text-xs">{group.season}</Badge>
                  <span className="text-xs text-muted-foreground">{group.rows.length} change{group.rows.length !== 1 ? "s" : ""}</span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="rounded-md border mx-1 mt-1 mb-2 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead>Date</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead>Current (DB)</TableHead>
                        <TableHead className="w-6 text-center">→</TableHead>
                        <TableHead>New (MFF)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.rows.flatMap((r, i) => {
                        const changes: { field: string; old: string; new: string }[] = [];
                        if (r.db_airline !== undefined && r.db_airline !== r.airline)
                          changes.push({ field: "Airline", old: airlineName(r.db_airline) || "(unknown)", new: airlineName(r.airline) });
                        if (r.db_dep_sector && r.db_dep_sector !== r.departure_sector)
                          changes.push({ field: "Dep. Sector", old: r.db_dep_sector, new: r.departure_sector });
                        if (r.db_ret_sector && r.db_ret_sector !== r.return_sector)
                          changes.push({ field: "Ret. Sector", old: r.db_ret_sector, new: r.return_sector });
                        return changes.map((c, j) => (
                          <TableRow key={`${i}-${j}`} className="bg-blue-50/30 dark:bg-blue-950/10">
                            {j === 0 && (
                              <TableCell className="text-xs" rowSpan={changes.length}>{r.departure_date}</TableCell>
                            )}
                            <TableCell className="text-xs font-medium text-muted-foreground">{c.field}</TableCell>
                            <TableCell className="text-xs font-mono line-through text-red-500/70">{c.old}</TableCell>
                            <TableCell className="text-xs text-center text-muted-foreground">→</TableCell>
                            <TableCell className="text-xs font-mono text-green-600 font-medium">{c.new}</TableCell>
                          </TableRow>
                        ));
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}

      {/* Flights to remove */}
      {willRemove.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-red-600" />
            {willRemove.length} flights to remove
          </h3>
          {groupByPackage(willRemove).map(g => (
            <FlightGroupTable key={g.name + g.season} group={g} rowClass="bg-red-50/50 dark:bg-red-950/10" />
          ))}
        </div>
      )}

      {/* Legacy skipped */}
      {legacySkipped.length > 0 && (
        <div className="space-y-2">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <button type="button" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ChevronDown className="w-3.5 h-3.5" />
                {legacySkipped.length} legacy 2026/2027 flights — will NOT be removed
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <p className="text-xs text-muted-foreground mb-2 mt-1 ml-5">
                These flights belong to the old 2026/2027 season and are intentionally preserved to avoid breaking existing quotations.
              </p>
              <div className="ml-5 space-y-2">
                {groupByPackage(legacySkipped).map(g => (
                  <FlightGroupTable key={g.name + g.season} group={g} rowClass="opacity-50" />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Nothing to change */}
      {added.length === 0 && edited.length === 0 && willRemove.length === 0 && noDbPkg.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
          <p className="text-sm">All {unchanged.length} flights are already up to date.</p>
        </div>
      )}

      {unchanged.length > 0 && (added.length > 0 || edited.length > 0 || willRemove.length > 0) && (
        <p className="text-xs text-muted-foreground text-center">
          {unchanged.length} flights already in DB — no changes needed
        </p>
      )}

      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <Button onClick={onContinue}>Continue to Review →</Button>
      </div>
    </div>
  );
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

const STEPS = ["Upload Files", "Verify Mapping", "Verify Flights", "Review & Apply"];

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-2 shrink-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
              i < step  ? "bg-primary border-primary text-primary-foreground"
              : i === step ? "border-primary text-primary bg-background"
              : "border-muted-foreground/30 text-muted-foreground/50 bg-background"
            }`}>
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-sm font-medium hidden sm:block ${i === step ? "text-foreground" : "text-muted-foreground/60"}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 flex-1 mx-3 transition-colors ${i < step ? "bg-primary" : "bg-muted-foreground/20"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Mapping verification ────────────────────────────────────────────

function MappingStep({
  rows,
  onBack,
  onContinue,
}: {
  rows: PackageMappingRow[];
  onBack: () => void;
  onContinue: () => void;
}) {
  const matched = rows.filter(r => r.match_status === "MATCHED").length;
  const newCount = rows.filter(r => r.match_status === "NEW").length;

  // Group by season in order of appearance
  const bySeason = new Map<string, PackageMappingRow[]>();
  for (const r of rows) {
    if (!bySeason.has(r.season_code)) bySeason.set(r.season_code, []);
    bySeason.get(r.season_code)!.push(r);
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold">{bySeason.size}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Seasons detected</p>
        </div>
        <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-3 text-center">
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">{matched}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Matched to DB</p>
        </div>
        <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 p-3 text-center">
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{newCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">New (not in DB)</p>
        </div>
      </div>

      {/* Per-season tables */}
      {Array.from(bySeason.entries()).map(([season, seasonRows]) => {
        const first = seasonRows[0];
        return (
          <Card key={season}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-sm font-semibold">{season}</CardTitle>
                <span className="text-xs text-muted-foreground">{first.season_start} → {first.season_end}</span>
                <span className="text-xs text-muted-foreground ml-auto">{seasonRows.length} packages</span>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Package</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">QDP</TableHead>
                    <TableHead className="text-right">DBL</TableHead>
                    <TableHead>Transport</TableHead>
                    <TableHead>Makkah</TableHead>
                    <TableHead>Madinah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seasonRows.map((r, i) => (
                    <TableRow key={i} className={r.match_status === "NEW" ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}>
                      <TableCell className="text-xs font-medium">
                        {r.canonical_name}
                        {r.price_list_segment && (
                          <span className="ml-1 text-muted-foreground font-normal">({r.price_list_segment})</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.match_status === "MATCHED" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded">
                            <Check className="w-3 h-3" /> {r.db_name || r.canonical_name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                            <Plus className="w-3 h-3" /> NEW
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {r.qdp_price != null ? r.qdp_price.toLocaleString() : <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {r.dbl_price != null ? r.dbl_price.toLocaleString() : <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.transport || "—"}</TableCell>
                      <TableCell className="text-xs">{r.makkah_hotel || <span className="text-muted-foreground/50">—</span>}</TableCell>
                      <TableCell className="text-xs">{r.madinah_hotel || <span className="text-muted-foreground/50">—</span>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <Button onClick={onContinue} disabled={rows.length === 0}>
          Looks correct — Continue →
        </Button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PackageSyncPage() {
  const existingPackages = useQuery(api.packages.listWithHotelsAndMeals) ?? [];
  const dbFlights = useQuery(api.packageFlights.listAll) ?? [];
  const syncPackage = useMutation(api.packages.syncPackageFromCsv);
  const addFlight = useMutation(api.packageFlights.addFlight);
  const deleteFlight = useMutation(api.packageFlights.deleteFlight);
  const promoteToSync = useMutation(api.packageFlights.promoteToSync);

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [priceListText, setPriceListText] = useState<string | null>(null);
  const [priceListFileName, setPriceListFileName] = useState<string | null>(null);
  const [mffText, setMffText] = useState<string | null>(null);
  const [mffFileName, setMffFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState<ApplyProgress | null>(null);
  const [result, setResult] = useState<ApplyResult | null>(null);

  const readFile = useCallback((file: File): Promise<string> => {
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = (e) => res(e.target?.result as string);
      reader.onerror = rej;
      reader.readAsText(file);
    });
  }, []);

  const mappingRows = useMemo(
    () => (priceListText ? parsePriceListCsv(priceListText, existingPackages) : []),
    [priceListText, existingPackages],
  );

  const flightRows = useMemo(
    () => (mffText ? parseMffCsv(mffText, mappingRows, existingPackages, dbFlights) : []),
    [mffText, mappingRows, existingPackages, dbFlights],
  );

  const plan = useMemo<SyncPlan | null>(
    () => (step >= 3 ? buildSyncPlan(mappingRows, flightRows, existingPackages) : null),
    [mappingRows, flightRows, existingPackages, step],
  );

  const totalChanges = plan
    ? plan.packagesToCreate.length + plan.packagesToUpdate.length +
      plan.flightsToAdd.length +
      plan.flightsToRemove.filter(f => f.row.status !== "edited").length
    : 0;

  const applying = progress !== null && progress.phase !== "done";

  async function handleApply() {
    if (!plan) return;
    setResult(null);

    const total =
      plan.packagesToCreate.length + plan.packagesToUpdate.length +
      plan.flightsToAdd.length + plan.flightsToRemove.length;

    let done = 0;
    const errors: string[] = [];
    let created = 0, updated = 0, flightsAdded = 0, flightsRemoved = 0;
    const newPackageIdMap = new Map<string, string>();

    setProgress({ phase: "packages", done: 0, total, current: "Starting…" });

    for (const spec of plan.packagesToCreate) {
      setProgress({ phase: "packages", done, total, current: `Creating ${spec.name} (${spec.season})…` });
      try {
        const res = await syncPackage({
          name: spec.name, season: spec.season, year: spec.year,
          duration: spec.duration, transport: spec.transport,
          hotels: spec.hotels, rooms: spec.rooms,
          clone_from_id: spec.clone_from_id ? (spec.clone_from_id as Id<"packages">) : undefined,
        });
        newPackageIdMap.set(`${spec.name.trim().toUpperCase()}|${spec.season.trim().toUpperCase()}`, res.id);
        created++;
      } catch (e) { errors.push(`Create ${spec.name} (${spec.season}): ${String(e)}`); }
      done++;
    }

    for (const spec of plan.packagesToUpdate) {
      setProgress({ phase: "packages", done, total, current: `Updating ${spec.db_name}…` });
      try {
        await syncPackage({
          db_id: spec.db_id as Id<"packages">,
          name: spec.row.canonical_name, season: spec.row.season_code,
          year: spec.row.season_start.substring(0, 4) + "/" + (parseInt(spec.row.season_start.substring(0, 4), 10) + 1),
          duration: spec.row.duration, transport: spec.transport,
          hotels: spec.hotels, rooms: spec.rooms,
        });
        updated++;
      } catch (e) { errors.push(`Update ${spec.db_name}: ${String(e)}`); }
      done++;
    }

    for (const spec of plan.flightsToAdd) {
      setProgress({ phase: "flights", done, total, current: `Adding flight ${spec.package_name} ${spec.departure_date}…` });
      let packageId = spec.db_package_id;
      if (spec.needs_new_package) {
        packageId = newPackageIdMap.get(`${spec.package_name.trim().toUpperCase()}|${spec.season.trim().toUpperCase()}`) ?? "";
      }
      if (!packageId) {
        errors.push(`Flight ${spec.package_name} ${spec.departure_date}: package not found`);
        done++; continue;
      }
      try {
        await addFlight({
          package_id: packageId as Id<"packages">, month: spec.month,
          dep_flight: airlineName(spec.row.airline) || undefined,
          departure_date: spec.departure_date, departure_sector: spec.departure_sector,
          return_date: spec.return_date, return_sector: spec.return_sector,
          source: "sync",
        });
        flightsAdded++;
      } catch (e) { errors.push(`Add flight ${spec.package_name} ${spec.departure_date}: ${String(e)}`); }
      done++;
    }

    for (const spec of plan.flightsToRemove) {
      setProgress({ phase: "flights", done, total, current: `Removing flight ${spec.package_name} ${spec.departure_date}…` });
      try {
        await deleteFlight({ id: spec.db_flight_id as Id<"package_flights"> });
        flightsRemoved++;
      } catch (e) { errors.push(`Remove flight ${spec.package_name} ${spec.departure_date}: ${String(e)}`); }
      done++;
    }

    if (plan.flightsToPromote.length > 0) {
      setProgress({ phase: "flights", done, total, current: `Classifying ${plan.flightsToPromote.length} flights as sync…` });
      try {
        await promoteToSync({ ids: plan.flightsToPromote });
      } catch (e) { errors.push(`Promote flights: ${String(e)}`); }
    }

    setProgress({ phase: "done", done: total, total, current: "Done" });
    setResult({ created, updated, flightsAdded, flightsRemoved, errors });
  }

  function resetUpload() {
    setPriceListText(null); setPriceListFileName(null);
    setMffText(null); setMffFileName(null);
    setProgress(null); setResult(null);
    setStep(0);
  }

  return (
    <div className="col-span-12 py-6 mx-2 sm:mx-4 lg:w-185 xl:w-250 lg:mx-auto space-y-6 pb-10 animate-fadeIn">
      <div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">Package Sync</h2>
        <p className="text-slate-500 text-sm mt-1">
          Import packages and flights directly from the Master Price List and MFF flight schedule.
        </p>
      </div>

      <Stepper step={step} />

      {/* ── Step 0: Upload ── */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload source files</CardTitle>
            <p className="text-sm text-muted-foreground">
              Export both files from Excel as CSV, then drop them here.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <DropZone
              label="Master Price List CSV"
              description="MASTER PRICE LIST 2026_2027.csv — exported from Excel"
              fileName={priceListFileName}
              onFile={async (f) => { setPriceListFileName(f.name); setPriceListText(await readFile(f)); }}
              onClear={() => { setPriceListText(null); setPriceListFileName(null); }}
            />
            <DropZone
              label="MFF Flight Schedule CSV"
              description="UPDATED MFF 2026_2027 - MFF VERSION X.csv — exported from Excel"
              fileName={mffFileName}
              onFile={async (f) => { setMffFileName(f.name); setMffText(await readFile(f)); }}
              onClear={() => { setMffText(null); setMffFileName(null); }}
            />
            <div className="flex justify-end pt-2">
              <Button
                disabled={!priceListText}
                onClick={() => setStep(1)}
              >
                Parse & Continue →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 1: Mapping verification ── */}
      {step === 1 && (
        <MappingStep
          rows={mappingRows}
          onBack={() => setStep(0)}
          onContinue={() => setStep(2)}
        />
      )}

      {/* ── Step 2: Flight diff verification ── */}
      {step === 2 && (
        <FlightDiffStep
          rows={flightRows}
          onBack={() => setStep(1)}
          onContinue={() => setStep(3)}
        />
      )}

      {/* ── Step 3: Review & Apply ── */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Result banner */}
          {result && (
            <Card className={result.errors.length > 0 ? "border-amber-400" : "border-green-400"}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Sync complete
                </div>
                <div className="text-sm text-muted-foreground grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <span>Packages created: <strong>{result.created}</strong></span>
                  <span>Packages updated: <strong>{result.updated}</strong></span>
                  <span>Flights added: <strong>{result.flightsAdded}</strong></span>
                  <span>Flights removed: <strong>{result.flightsRemoved}</strong></span>
                </div>
                {result.errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm font-medium text-amber-700">{result.errors.length} error(s):</p>
                    {result.errors.map((e, i) => (
                      <p key={i} className="text-xs text-amber-700 font-mono">{e}</p>
                    ))}
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={resetUpload} className="mt-2">
                  Start over
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Progress */}
          {applying && progress && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {progress.current}
                </div>
                <Progress value={(progress.done / Math.max(progress.total, 1)) * 100} />
                <p className="text-xs text-muted-foreground">{progress.done} / {progress.total}</p>
              </CardContent>
            </Card>
          )}

          {/* Review */}
          {plan && totalChanges > 0 && !applying && !result && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Review {totalChanges} changes</CardTitle>
                <Button onClick={handleApply}>Apply {totalChanges} changes</Button>
              </CardHeader>
              <div className="px-6 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b">
                <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-3 text-center">
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">{plan.packagesToCreate.length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Packages to create</p>
                </div>
                <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{plan.packagesToUpdate.length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Packages to update</p>
                </div>
                <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{plan.flightsToAdd.filter(f => f.row.status !== "edited").length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Flights to add</p>
                </div>
                <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{plan.flightsToAdd.filter(f => f.row.status === "edited").length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Flights to update</p>
                </div>
                <div className="rounded-lg border bg-red-50 dark:bg-red-950/20 p-3 text-center">
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400">{plan.flightsToRemove.filter(f => f.row.status !== "edited").length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Flights to remove</p>
                </div>
              </div>
              <CardContent className="p-0">
                <Accordion type="multiple" defaultValue={["merged"]}>
                  <MergedPlanSection plan={plan} />
                  <PackagesToCreateSection items={plan.packagesToCreate} />
                  <PackagesToUpdateSection items={plan.packagesToUpdate} />
                  <FlightsToAddSection items={plan.flightsToAdd} />
                  <FlightsToRemoveSection items={plan.flightsToRemove} />
                </Accordion>
              </CardContent>
            </Card>
          )}

          {plan && totalChanges === 0 && !applying && !result && (
            <div className="text-center py-10 text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="text-sm">Nothing to sync — all packages and flights are up to date.</p>
            </div>
          )}

          {plan && totalChanges > 5 && !applying && !result && (
            <div className="flex justify-end">
              <Button onClick={handleApply} size="lg">Apply {totalChanges} changes</Button>
            </div>
          )}

          {!applying && !result && (
            <div className="flex justify-start">
              <Button variant="outline" onClick={() => setStep(2)}>← Back to Flights</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
