import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  FileText,
  Loader2,
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
  buildSyncPlan,
  parseFlightDiffCsv,
  parsePackageMappingCsv,
} from "~/features/packages/sync/parsers";
import type {
  ApplyProgress,
  ApplyResult,
  FlightAddSpec,
  FlightRemoveSpec,
  PackageCreateSpec,
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
          {entries.map((entry) => (
            <Collapsible key={entry.key} defaultOpen={false}>
              <CollapsibleTrigger className="w-full">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-md border text-left ${entry.flightsToAdd.length === 0 && entry.flightsToRemove.length === 0 ? "bg-muted/20 opacity-60 hover:opacity-80" : "bg-muted/40 hover:bg-muted/70"}`}>
                  {entry.action === "create" && <Plus className="w-3.5 h-3.5 text-green-600 shrink-0" />}
                  {entry.action === "update" && <RefreshCw className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                  {entry.action === "flights-only" && <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                  <span className="font-medium text-sm flex-1 truncate">{entry.name}</span>
                  <Badge variant="outline" className="text-xs shrink-0">{entry.season}</Badge>
                  {entry.action === "create" && <Badge className="text-xs bg-green-100 text-green-800 border-0 shrink-0">New package</Badge>}
                  {entry.action === "update" && <Badge className="text-xs bg-blue-100 text-blue-800 border-0 shrink-0">Updated</Badge>}
                  {entry.flightsToAdd.length > 0 && (
                    <span className="text-xs text-emerald-600 shrink-0">+{entry.flightsToAdd.length} flights</span>
                  )}
                  {entry.flightsToRemove.length > 0 && (
                    <span className="text-xs text-red-500 shrink-0">−{entry.flightsToRemove.length} flights</span>
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {(entry.flightsToAdd.length > 0 || entry.flightsToRemove.length > 0) && (
                  <div className="rounded-md border mx-1 mt-1 mb-2 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-6"></TableHead>
                          <TableHead>Departure</TableHead>
                          <TableHead>Dep. Sector</TableHead>
                          <TableHead>Return</TableHead>
                          <TableHead>Ret. Sector</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entry.flightsToAdd.map((f, i) => (
                          <TableRow key={`add-${i}`} className="bg-emerald-50 dark:bg-emerald-950/20">
                            <TableCell><Plus className="w-3 h-3 text-emerald-600" /></TableCell>
                            <TableCell className="text-xs">{f.departure_date}</TableCell>
                            <TableCell className="text-xs">{f.departure_sector}</TableCell>
                            <TableCell className="text-xs">{f.return_date}</TableCell>
                            <TableCell className="text-xs">{f.return_sector}</TableCell>
                          </TableRow>
                        ))}
                        {entry.flightsToRemove.map((f, i) => (
                          <TableRow key={`rem-${i}`} className="bg-red-50 dark:bg-red-950/20">
                            <TableCell><Trash2 className="w-3 h-3 text-red-500" /></TableCell>
                            <TableCell className="text-xs">{f.departure_date}</TableCell>
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
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PackageSyncPage() {
  const existingPackages = useQuery(api.packages.listWithHotelsAndMeals) ?? [];
  const syncPackage = useMutation(api.packages.syncPackageFromCsv);
  const addFlight = useMutation(api.packageFlights.addFlight);
  const deleteFlight = useMutation(api.packageFlights.deleteFlight);

  const [mappingText, setMappingText] = useState<string | null>(null);
  const [mappingFileName, setMappingFileName] = useState<string | null>(null);
  const [flightText, setFlightText] = useState<string | null>(null);
  const [flightFileName, setFlightFileName] = useState<string | null>(null);

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

  const handleMappingFile = useCallback(async (file: File) => {
    setMappingFileName(file.name);
    setMappingText(await readFile(file));
    setResult(null);
  }, [readFile]);

  const handleFlightFile = useCallback(async (file: File) => {
    setFlightFileName(file.name);
    setFlightText(await readFile(file));
    setResult(null);
  }, [readFile]);

  const plan = useMemo<SyncPlan | null>(() => {
    if (!mappingText && !flightText) return null;
    const mappingRows = mappingText ? parsePackageMappingCsv(mappingText) : [];
    const flightRows = flightText ? parseFlightDiffCsv(flightText) : [];
    return buildSyncPlan(mappingRows, flightRows, existingPackages);
  }, [mappingText, flightText, existingPackages]);

  const totalChanges = plan
    ? plan.packagesToCreate.length +
      plan.packagesToUpdate.length +
      plan.flightsToAdd.length +
      plan.flightsToRemove.length
    : 0;

  const applying = progress !== null && progress.phase !== "done";

  async function handleApply() {
    if (!plan) return;
    setResult(null);

    const total =
      plan.packagesToCreate.length +
      plan.packagesToUpdate.length +
      plan.flightsToAdd.length +
      plan.flightsToRemove.length;

    let done = 0;
    const errors: string[] = [];
    let created = 0;
    let updated = 0;
    let flightsAdded = 0;
    let flightsRemoved = 0;

    // Map from "name|season" → newly created package id (for no-db-package flights)
    const newPackageIdMap = new Map<string, string>();

    setProgress({ phase: "packages", done: 0, total, current: "Starting…" });

    // 1. Create packages
    for (const spec of plan.packagesToCreate) {
      setProgress({ phase: "packages", done, total, current: `Creating ${spec.name} (${spec.season})…` });
      try {
        const res = await syncPackage({
          name: spec.name,
          season: spec.season,
          year: spec.year,
          duration: spec.duration,
          transport: spec.transport,
          hotels: spec.hotels,
          rooms: spec.rooms,
          clone_from_id: spec.clone_from_id ? (spec.clone_from_id as Id<"packages">) : undefined,
        });
        newPackageIdMap.set(`${spec.name.trim().toUpperCase()}|${spec.season.trim().toUpperCase()}`, res.id);
        created++;
      } catch (e) {
        errors.push(`Create ${spec.name} (${spec.season}): ${String(e)}`);
      }
      done++;
    }

    // 2. Update packages
    for (const spec of plan.packagesToUpdate) {
      setProgress({ phase: "packages", done, total, current: `Updating ${spec.db_name}…` });
      try {
        await syncPackage({
          db_id: spec.db_id as Id<"packages">,
          name: spec.row.canonical_name,
          season: spec.row.season_code,
          year: spec.row.season_start.substring(0, 4) + "/" + (parseInt(spec.row.season_start.substring(0, 4), 10) + 1),
          duration: spec.row.duration,
          transport: spec.transport,
          hotels: spec.hotels,
          rooms: spec.rooms,
        });
        updated++;
      } catch (e) {
        errors.push(`Update ${spec.db_name}: ${String(e)}`);
      }
      done++;
    }

    // 3. Add flights
    for (const spec of plan.flightsToAdd) {
      setProgress({ phase: "flights", done, total, current: `Adding flight ${spec.package_name} ${spec.departure_date}…` });

      let packageId = spec.db_package_id;
      if (spec.needs_new_package) {
        packageId = newPackageIdMap.get(`${spec.package_name.trim().toUpperCase()}|${spec.season.trim().toUpperCase()}`) ?? "";
      }

      if (!packageId) {
        errors.push(`Flight ${spec.package_name} ${spec.departure_date}: package not found`);
        done++;
        continue;
      }

      try {
        await addFlight({
          package_id: packageId as Id<"packages">,
          month: spec.month,
          departure_date: spec.departure_date,
          departure_sector: spec.departure_sector,
          return_date: spec.return_date,
          return_sector: spec.return_sector,
        });
        flightsAdded++;
      } catch (e) {
        errors.push(`Add flight ${spec.package_name} ${spec.departure_date}: ${String(e)}`);
      }
      done++;
    }

    // 4. Remove flights
    for (const spec of plan.flightsToRemove) {
      setProgress({ phase: "flights", done, total, current: `Removing flight ${spec.package_name} ${spec.departure_date}…` });
      try {
        await deleteFlight({ id: spec.db_flight_id as Id<"package_flights"> });
        flightsRemoved++;
      } catch (e) {
        errors.push(`Remove flight ${spec.package_name} ${spec.departure_date}: ${String(e)}`);
      }
      done++;
    }

    setProgress({ phase: "done", done: total, total, current: "Done" });
    setResult({ created, updated, flightsAdded, flightsRemoved, errors });
  }

  return (
    <div className="col-span-12 py-6 mx-2 sm:mx-4 lg:w-185 xl:w-250 lg:mx-auto space-y-6 pb-10 animate-fadeIn">
      <div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">Package Sync</h2>
        <p className="text-slate-500 text-sm mt-1">
          Upload your CSV files to create and update packages in one step.
        </p>
      </div>

      {/* Upload */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DropZone
          label="Package Mapping CSV"
          description="package-mapping.csv from docs/sync-1448h"
          fileName={mappingFileName}
          onFile={handleMappingFile}
          onClear={() => { setMappingText(null); setMappingFileName(null); setResult(null); }}
        />
        <DropZone
          label="Flight Diff CSV"
          description="flight-diff.csv from docs/sync-1448h"
          fileName={flightFileName}
          onFile={handleFlightFile}
          onClear={() => { setFlightText(null); setFlightFileName(null); setResult(null); }}
        />
      </div>

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
            <CardTitle className="text-base">
              Review {totalChanges} changes
            </CardTitle>
            <Button onClick={handleApply} disabled={applying}>
              Apply {totalChanges} changes
            </Button>
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
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{plan.flightsToAdd.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Flights to add</p>
            </div>
            <div className="rounded-lg border bg-red-50 dark:bg-red-950/20 p-3 text-center">
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">{plan.flightsToRemove.length}</p>
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

      {plan && totalChanges === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
          <p className="text-sm">Nothing to sync — all packages and flights are up to date.</p>
        </div>
      )}

      {/* Apply button at bottom too when review is long */}
      {plan && totalChanges > 5 && !applying && !result && (
        <div className="flex justify-end">
          <Button onClick={handleApply} disabled={applying} size="lg">
            Apply {totalChanges} changes
          </Button>
        </div>
      )}
    </div>
  );
}
