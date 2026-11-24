"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { BellRing, CalendarDays, Check, ChevronRight, Clock, Eye, MoreHorizontal, Pencil, Undo2, XCircle } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { inquiryClosureLabel, inquiryStatusLabel } from "~/features/quotation/inquiry-display";
import { revisionDate } from "~/features/quotation/revision-display";
import { cn } from "~/lib/utils";

type Inquiry = FunctionReturnType<typeof api.inquiries.forClient>["inquiries"][number];
type Option = Inquiry["options"][number];
type Command = FunctionArgs<typeof api.inquiries.act>["command"];
type Intent = { inquiry: Inquiry; command: Command; option?: Option; requestKey: string };

const actionCopy = {
  accept: { title: "Accept quotation", description: "This accepts the saved revision below and closes the other active options.", success: "Quotation accepted" },
  close_option: { title: "Close option", description: "This quotation becomes read-only. The Inquiry stays open.", success: "Option closed" },
  close: { title: "Close Inquiry", description: "This closes all remaining options without accepting a quotation.", success: "Inquiry closed" },
  undo_acceptance: { title: "Undo acceptance", description: "This reopens the Inquiry and restores the accepted quotation and the options closed by its acceptance.", success: "Inquiry reopened" },
  follow_up: { title: "Record follow-up", description: "This restarts the 14-day inactivity countdown.", success: "Follow-up recorded" },
};

const currency = new Intl.NumberFormat("ms-MY", { style: "currency", currency: "MYR" });

function Countdown({ deadline, serverNow }: { deadline: number; serverNow: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = performance.now();
    const tick = window.setInterval(() => setElapsed(performance.now() - started), 1000);
    return () => window.clearInterval(tick);
  }, []);

  const minutes = Math.ceil((deadline - serverNow - elapsed) / 60_000);
  const urgent = minutes <= 3 * 1440;
  const [amount, unit] = minutes >= 1440 ? [Math.ceil(minutes / 1440), "day"]
    : minutes >= 60 ? [Math.ceil(minutes / 60), "hour"] : [minutes, "minute"];
  return <span className={cn("inline-flex items-center gap-1", urgent && "text-amber-700 dark:text-amber-400")}>
    <Clock aria-hidden="true" className="size-3 shrink-0" />
    {minutes <= 0 ? "Closing due to inactivity…" : `Closes in ${amount} ${unit}${amount === 1 ? "" : "s"}`}
  </span>;
}

function InquiryAction({ intent, onDismiss }: { intent: Intent; onDismiss: () => void }) {
  const act = useMutation(api.inquiries.act);
  const [verified, setVerified] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ text: string; rejected: boolean } | null>(null);
  const sending = useRef(false);
  const copy = actionCopy[intent.command.type];
  const accepting = intent.command.type === "accept";
  const terms = useQuery(api.quotations.getQuotationFullDetails, accepting && intent.option
    ? { target_quotation_id: intent.option.revision_id } : "skip");
  const reviewable = terms?.revision_context.is_current && terms.revision_context.inquiry?.status === "active" &&
    terms.revision_context.inquiry.cycle === intent.inquiry.cycle;

  async function confirm() {
    if (sending.current) return;
    sending.current = true;
    setPending(true);
    setError(null);
    try {
      await act({
        inquiry_id: intent.inquiry.id, expected_cycle: intent.inquiry.cycle,
        request_key: intent.requestKey, command: intent.command,
      });
      toast.success(copy.success);
      onDismiss();
    } catch (failure) {
      const message = failure instanceof ConvexError && typeof failure.data === "object" &&
        typeof failure.data?.message === "string" ? failure.data.message : null;
      setError(message ? { text: message, rejected: true } : {
        text: "Could not confirm the Inquiry action. Retry to recover the same action.", rejected: false,
      });
    } finally {
      setPending(false);
      sending.current = false;
    }
  }

  return <Dialog open onOpenChange={open => { if (!open && !pending) onDismiss(); }}>
    <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl" showCloseButton={false}>
      <DialogHeader>
        <DialogTitle>{copy.title}{intent.option ? ` ${intent.option.reference}` : ""}</DialogTitle>
        <DialogDescription>{copy.description}</DialogDescription>
      </DialogHeader>
      {accepting && <>
        {terms === undefined ? <p role="status">Loading the saved terms…</p>
          : !reviewable || !terms ? <p role="alert">This option changed. Close this dialog and review the current option.</p>
            : <div className="grid gap-3">
              <div className="space-y-1 rounded-md border p-3">
                <p className="font-medium">{terms.saved_document.package_snapshot?.name ?? "Package unavailable"}</p>
                {terms.selected_flight && <p>{terms.selected_flight.departure_date} {terms.selected_flight.departure_sector} to {terms.selected_flight.return_date} {terms.selected_flight.return_sector}</p>}
                <ul className="divide-y">
                  {terms.saved_document.items.map((item, index) => <li key={index} className="flex flex-wrap justify-between gap-x-3 py-1">
                    <span>{item.description} × {item.quantity}</span><span>{currency.format(item.unit_price * item.quantity)}</span>
                  </li>)}
                </ul>
                <p className="font-medium">Total {currency.format(terms.total_amount)}</p>
                {terms.notes && <p className="whitespace-pre-wrap break-words">{terms.notes}</p>}
              </div>
              <Link className="underline" href={`/quotations/review/${terms.id}`} target="_blank" rel="noreferrer">View full saved terms and PDF in a new tab</Link>
              <label className="flex items-start gap-2">
                <Checkbox checked={verified} onCheckedChange={value => setVerified(value === true)} />
                <span>I verified that the client accepted these exact saved terms.</span>
              </label>
            </div>}
      </>}
      {error && <p role="alert" className="text-destructive">{error.text}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDismiss} disabled={pending}>{error?.rejected ? "Close" : "Cancel"}</Button>
        <Button type="button" onClick={confirm} disabled={pending || error?.rejected || (accepting && !error && (!verified || !reviewable))}>
          {pending ? "Saving…" : error && !error.rejected ? "Retry this action" : copy.title}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}

function InquiryOptionActions({ option, onReview }: { option: Option; onReview: (command: Command) => void }) {
  const reviewAfterClose = useRef<(() => void) | null>(null);

  function select(type: "accept" | "close_option") {
    reviewAfterClose.current = () => onReview({
      type, family_id: option.family_id, expected_revision_id: option.revision_id,
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Actions for ${option.reference}`}>
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onCloseAutoFocus={() => {
        const review = reviewAfterClose.current;
        reviewAfterClose.current = null;
        review?.();
      }}>
        <DropdownMenuItem onSelect={() => select("accept")}>Review to accept</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => select("close_option")}>Close option</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const travelDateFormatter = new Intl.DateTimeFormat("en-MY", {
  day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
});

function travelDate(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return value;
  return travelDateFormatter.format(date);
}

function TravelDates({ departure, returnDate }: { departure?: string | null; returnDate?: string | null }) {
  if (!departure || !returnDate) {
    if (departure) return <>Departure {travelDate(departure)}</>;
    if (returnDate) return <>Return {travelDate(returnDate)}</>;
    return <>Dates not recorded</>;
  }

  return <span className="inline-flex flex-wrap gap-x-1">
    <span className="whitespace-nowrap">{travelDate(departure)}</span>
    <span aria-hidden="true">→</span>
    <span className="sr-only">to</span>
    <span className="whitespace-nowrap">{travelDate(returnDate)}</span>
  </span>;
}

function money(value: number) {
  return currency.format(value).replaceAll("\u00a0", " ");
}

function roundMoney(value: number) {
  return (Number.isInteger(value) ? wholeCurrency : currency).format(value);
}

const wholeCurrency = new Intl.NumberFormat("ms-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 0 });

type Tone = "open" | "accepted" | "closed";

const toneClass: Record<Tone, string> = {
  open: "border-emerald-600/25 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/25 dark:text-emerald-300",
  accepted: "border-primary/30 bg-primary/10 text-primary",
  closed: "border-border bg-muted text-muted-foreground",
};

function StatusPill({ tone, children }: { tone: Tone; children: string }) {
  return <Badge variant="outline" className={cn("gap-1.5", toneClass[tone])}>
    {tone === "accepted" ? <Check aria-hidden="true" strokeWidth={3} />
      : <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />}
    {children}
  </Badge>;
}

const optionTone: Record<Option["status"], Tone> = { active: "open", accepted: "accepted", closed: "closed" };

function InquiryQuotationList({ options, actionsEnabled, onReview }: {
  options: Option[];
  actionsEnabled: boolean;
  onReview?: (option: Option, command: Command) => void;
}) {
  if (options.length === 0) return <p className="text-sm text-muted-foreground">No quotations in this Inquiry.</p>;

  const preview = !onReview;
  return <ul role="list" aria-label="Quotations" className="@container divide-y overflow-hidden rounded-lg border bg-card shadow-xs">
    {options.map(option => {
      const canManage = actionsEnabled && option.status === "active";
      const closed = option.status === "closed";

      return <li key={option.family_id} className={cn(
        "relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 px-3 py-3",
        "@min-[40rem]:grid-cols-[minmax(0,1fr)_12rem_8.5rem_4.5rem] @min-[40rem]:items-center @min-[40rem]:gap-x-4 @min-[40rem]:gap-y-1 @min-[40rem]:px-4",
        preview && "@min-[40rem]:grid-cols-[minmax(0,1fr)_8rem_8.5rem_4.5rem]",
        option.status === "accepted" && "bg-primary/5 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-primary",
      )}>
        <div className="col-start-1 row-start-1 min-w-0">
          <p className={cn("font-medium wrap-anywhere", closed && "text-muted-foreground")}>
            {option.package_name || "Package unavailable"}
          </p>
        </div>

        <div className="col-span-2 col-start-1 row-start-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground @min-[40rem]:col-span-1">
          {preview ? <span className="font-mono font-semibold wrap-anywhere">{option.reference}</span>
            : <Link href={`/quotations/review/${option.revision_id}`} title="Preview quotation"
              className="rounded-sm font-mono font-semibold text-primary wrap-anywhere hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {option.reference}
            </Link>}
          {option.package_year && <span>{option.package_year}</span>}
          <span className="inline-flex items-center gap-1 tabular-nums">
            <CalendarDays aria-hidden="true" className="size-3.5 shrink-0" />
            <TravelDates departure={option.departure_date} returnDate={option.return_date} />
          </span>
        </div>

        <div className="col-start-1 row-start-3 min-w-0 self-center @min-[40rem]:col-start-2 @min-[40rem]:row-span-2 @min-[40rem]:row-start-1">
          <StatusPill tone={optionTone[option.status]}>{inquiryStatusLabel[option.status]}</StatusPill>
          {closed && <p className="mt-1 text-xs text-muted-foreground wrap-anywhere">{inquiryClosureLabel[option.reason]}</p>}
        </div>

        <p className={cn(
          "col-start-2 row-start-1 text-right font-semibold tabular-nums whitespace-nowrap @min-[40rem]:col-start-3 @min-[40rem]:row-span-2",
          closed && "font-medium text-muted-foreground",
        )}>
          {money(option.total_amount)}
        </p>

        <div className={cn(
          "col-start-2 row-start-3 flex items-center justify-end gap-0.5 self-center @min-[40rem]:col-start-4 @min-[40rem]:row-span-2 @min-[40rem]:row-start-1",
          preview && "w-[4.125rem] justify-start justify-self-end",
        )}>
          {preview && <Button asChild variant="ghost" size="icon-sm">
            <Link href={`/quotations/review/${option.revision_id}`} aria-label={`Preview quotation ${option.reference}`} title="Preview quotation">
              <Eye aria-hidden="true" />
            </Link>
          </Button>}
          {canManage && <>
            <Button asChild variant="ghost" size="icon-sm">
              <Link href={`/quotations/edit/${option.revision_id}`} aria-label={`Edit current quotation ${option.reference}`} title="Edit current quotation">
                <Pencil aria-hidden="true" />
              </Link>
            </Button>
            {onReview && <InquiryOptionActions option={option} onReview={command => onReview(option, command)} />}
          </>}
        </div>
      </li>;
    })}
  </ul>;
}

function selectPreviewInquiry(inquiries: Inquiry[]): Inquiry | null {
  let latestClosed: Inquiry | null = null;
  for (const inquiry of inquiries) {
    if (!inquiry.outcome) return inquiry;
    if (!latestClosed?.outcome || inquiry.outcome.at > latestClosed.outcome.at) latestClosed = inquiry;
  }
  return latestClosed;
}

export function ClientInquiryPreview({ clientId, children }: { clientId: Id<"clients">; children: ReactNode }) {
  const data = useQuery(api.inquiries.forClient, { client_id: clientId });
  const inquiry = data ? selectPreviewInquiry(data.inquiries) : null;
  const outcome = inquiry?.outcome;

  return <section className="min-w-0 space-y-3" aria-label="Client quotations">
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2 border-l-3 border-primary pl-3">
        <h3 className="font-semibold">{inquiry ? outcome ? "Last closed Inquiry" : "Open Inquiry" : "Current quotations"}</h3>
        {outcome?.type === "accepted" && <StatusPill tone="accepted">Accepted</StatusPill>}
        {inquiry && !outcome && data && <span className="text-xs text-muted-foreground">
          <Countdown key={`${inquiry.deadline}:${data.server_now}`} deadline={inquiry.deadline} serverNow={data.server_now} />
        </span>}
        {outcome && outcome.type !== "accepted" && <span className="text-xs text-muted-foreground">
          {inquiryClosureLabel[outcome.type]}
        </span>}
      </div>
      <Link href={`/clients/${clientId}`} className="text-sm font-medium text-primary underline underline-offset-4">View client and history</Link>
    </div>
    {!data ? <p role="status" className="py-4 text-sm text-muted-foreground">Loading Inquiries…</p>
      : inquiry ? <InquiryQuotationList options={inquiry.options} actionsEnabled={data.actions_enabled} />
        : children}
  </section>;
}

function valueSummary(inquiry: Inquiry, winner: Option | null | undefined) {
  if (winner) return roundMoney(winner.total_amount);
  const active = inquiry.options.filter(option => option.status === "active");
  const pool = active.length ? active : inquiry.options;
  if (pool.length === 0) return "—";
  const totals = pool.map(option => option.total_amount);
  const low = Math.min(...totals);
  const high = Math.max(...totals);
  return low === high ? roundMoney(low) : `${roundMoney(low)} – ${roundMoney(high)}`;
}

export default function InquiryComparison({ clientId }: { clientId: Id<"clients"> }) {
  const data = useQuery(api.inquiries.forClient, { client_id: clientId });
  const [intent, setIntent] = useState<Intent | null>(null);
  const [expandedInquiryId, setExpandedInquiryId] = useState<Inquiry["id"] | null>(null);
  const handledHash = useRef<string | null>(null);
  const scrollTarget = useRef<Inquiry["id"] | null>(null);

  useEffect(() => {
    let frame: number | undefined;
    function openHashTarget() {
      const hash = window.location.hash;
      if (handledHash.current === hash) return;
      const inquiry = data?.inquiries.find(row => hash === `#inquiry-${row.id}`);
      if (!inquiry) return;
      frame = window.requestAnimationFrame(() => {
        handledHash.current = hash;
        scrollTarget.current = inquiry.id;
        setExpandedInquiryId(inquiry.id);
      });
    }
    function hashChanged() {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      handledHash.current = null;
      openHashTarget();
    }
    openHashTarget();
    window.addEventListener("hashchange", hashChanged);
    return () => {
      window.removeEventListener("hashchange", hashChanged);
      if (frame !== undefined) window.cancelAnimationFrame(frame);
    };
  }, [data]);

  useEffect(() => {
    if (!expandedInquiryId || scrollTarget.current !== expandedInquiryId) return;
    document.getElementById(`inquiry-${expandedInquiryId}`)?.scrollIntoView({ block: "nearest" });
    scrollTarget.current = null;
  }, [expandedInquiryId]);

  function review(inquiry: Inquiry, command: Command, option?: Option) {
    setIntent({ inquiry, command, option, requestKey: crypto.randomUUID() });
  }

  if (!data) return <p role="status" className="text-sm text-muted-foreground">Loading Inquiries…</p>;
  if (data.inquiries.length === 0) return null;

  return <section className="space-y-3" aria-label="Inquiries">
    <div>
      <h2 className="text-lg font-semibold">Inquiries</h2>
      <p className="text-sm text-muted-foreground">Expand an Inquiry to compare its quotations.</p>
    </div>
    <div className="@container overflow-hidden rounded-lg border bg-card shadow-xs">
      <Table aria-label="Inquiry history" className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col" className="pl-11">Inquiry</TableHead>
            <TableHead scope="col" className="w-[42%] @min-[34rem]:w-[24%]">Status</TableHead>
            <TableHead scope="col" className="w-0 p-0 text-right @min-[34rem]:w-[24%] @min-[34rem]:pr-4">
              <span className="sr-only @min-[34rem]:not-sr-only">Value</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.inquiries.map(inquiry => {
            const isExpanded = expandedInquiryId === inquiry.id;
            const detailId = `inquiry-${inquiry.id}-details`;
            const accepted = inquiry.outcome?.type === "accepted" ? inquiry.outcome : null;
            const winner = accepted && inquiry.options.find(option => option.revision_id === accepted.revision_id);
            const canManage = data.actions_enabled && !inquiry.outcome;
            const canUndo = data.actions_enabled && inquiry.can_undo && accepted;
            const value = valueSummary(inquiry, winner);
            const count = inquiry.options.length;
            const toggle = () => setExpandedInquiryId(isExpanded ? null : inquiry.id);
            return <Fragment key={inquiry.id}>
              <TableRow id={`inquiry-${inquiry.id}`}
                className={cn("scroll-mt-4 cursor-pointer", isExpanded && "border-b-0 bg-muted/40 hover:bg-muted/40")}
                onClick={event => { if (!(event.target as HTMLElement).closest("a, button")) toggle(); }}>
                <TableHead scope="row" className="h-auto p-0 font-normal whitespace-normal">
                  <button type="button" aria-expanded={isExpanded} aria-controls={isExpanded ? detailId : undefined}
                    className="flex w-full min-w-0 items-start gap-3 rounded-sm py-3 pr-2 pl-4 text-left text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    onClick={toggle}>
                    <ChevronRight aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none", isExpanded && "rotate-90")} />
                    <span className="grid min-w-0 gap-0.5">
                      <time dateTime={inquiry.opened_at} className="font-medium wrap-anywhere">{revisionDate(inquiry.opened_at)}</time>
                      <span className="text-xs text-muted-foreground">
                        {count} {count === 1 ? "quotation" : "quotations"}
                        <span aria-hidden="true" className="@min-[34rem]:hidden"> · {value}</span>
                      </span>
                    </span>
                  </button>
                </TableHead>
                <TableCell className="py-3 align-top whitespace-normal">
                  <StatusPill tone={!inquiry.outcome ? "open" : accepted ? "accepted" : "closed"}>
                    {!inquiry.outcome ? "Open" : accepted ? "Accepted" : "Closed"}
                  </StatusPill>
                  {!inquiry.outcome && <p className="mt-1.5 text-xs text-muted-foreground">
                    <Countdown key={`${inquiry.deadline}:${data.server_now}`} deadline={inquiry.deadline} serverNow={data.server_now} />
                  </p>}
                  {accepted && <Link href={`/quotations/review/${accepted.revision_id}`}
                    aria-label={winner ? `Accepted quotation ${winner.reference}` : "Accepted quotation"}
                    className="mt-1.5 block font-mono text-xs text-primary wrap-anywhere hover:underline">
                    {winner?.reference ?? "View accepted quotation"}
                  </Link>}
                </TableCell>
                <TableCell className="p-0 text-right align-top font-semibold tabular-nums whitespace-normal @min-[34rem]:py-3 @min-[34rem]:pr-4">
                  <span className="sr-only @min-[34rem]:not-sr-only">{value}</span>
                </TableCell>
              </TableRow>
              {isExpanded && <TableRow id={detailId} className="bg-muted/40 hover:bg-muted/40">
                <TableCell colSpan={3} className="space-y-3 px-3 pt-0 pb-4 whitespace-normal @min-[34rem]:pr-4 @min-[34rem]:pl-11">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {inquiry.outcome?.type === "accepted" ? "Quotation accepted"
                        : inquiry.outcome ? inquiryClosureLabel[inquiry.outcome.type]
                          : count > 1 ? `Comparing ${count} quotations · newest first` : "Newest first"}
                    </p>
                    {canManage && <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => review(inquiry, { type: "follow_up" })}>
                        <BellRing aria-hidden="true" />Record follow-up
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => review(inquiry, { type: "close" })}>
                        <XCircle aria-hidden="true" />Close Inquiry
                      </Button>
                    </div>}
                    {canUndo && <Button size="sm" variant="outline"
                      onClick={() => review(inquiry, { type: "undo_acceptance", expected_acceptance_id: canUndo.event_id })}>
                      <Undo2 aria-hidden="true" />Undo acceptance
                    </Button>}
                  </div>
                  <InquiryQuotationList options={inquiry.options} actionsEnabled={data.actions_enabled}
                    onReview={(option, command) => review(inquiry, command, option)} />
                </TableCell>
              </TableRow>}
            </Fragment>;
          })}
        </TableBody>
      </Table>
    </div>
    {intent && <InquiryAction intent={intent} onDismiss={() => setIntent(null)} />}
  </section>;
}
