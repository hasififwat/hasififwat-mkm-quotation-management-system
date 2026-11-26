"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
import { Card, CardContent, CardDescription, CardHeader } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
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
        "relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 px-3",
        preview
          ? "gap-x-3 gap-y-2 py-3 @min-[40rem]:grid-cols-[minmax(0,1fr)_8rem_8.5rem_4.5rem] @min-[40rem]:items-center @min-[40rem]:gap-x-4 @min-[40rem]:gap-y-0 @min-[40rem]:px-4 @min-[40rem]:py-1.5"
          : "gap-y-1 py-2 @min-[29rem]:grid-cols-[minmax(0,1fr)_auto_auto_auto] @min-[29rem]:items-center",
        option.status === "accepted" && "bg-primary/5 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-primary",
      )}>
        <div className="col-start-1 row-start-1 min-w-0">
          <p className={cn("font-medium wrap-anywhere", closed && "text-muted-foreground")}>
            {option.package_name || "Package unavailable"}
          </p>
        </div>

        <div className={cn(
          "col-span-2 col-start-1 row-start-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground",
          preview ? "gap-x-3 @min-[40rem]:col-span-1" : "@min-[29rem]:col-span-1",
        )}>
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

        <div className={cn(
          "col-start-1 row-start-3 min-w-0 self-center",
          preview ? "@min-[40rem]:col-start-2 @min-[40rem]:row-span-2 @min-[40rem]:row-start-1"
            : "@min-[29rem]:col-start-2 @min-[29rem]:row-span-2 @min-[29rem]:row-start-1",
        )}>
          <StatusPill tone={optionTone[option.status]}>{inquiryStatusLabel[option.status]}</StatusPill>
          {closed && <p className="mt-1 text-xs text-muted-foreground wrap-anywhere">{inquiryClosureLabel[option.reason]}</p>}
        </div>

        <p className={cn(
          "col-start-2 row-start-1 text-right font-semibold tabular-nums whitespace-nowrap",
          preview ? "@min-[40rem]:col-start-3 @min-[40rem]:row-span-2"
            : "@min-[29rem]:col-start-3 @min-[29rem]:row-span-2",
          closed && "font-medium text-muted-foreground",
        )}>
          {money(option.total_amount)}
        </p>

        <div className={cn(
          "col-start-2 row-start-3 flex items-center self-center",
          preview ? "w-[4.125rem] justify-self-end gap-0.5 @min-[40rem]:col-start-4 @min-[40rem]:row-span-2 @min-[40rem]:row-start-1"
            : "w-24 @min-[29rem]:col-start-4 @min-[29rem]:row-span-2 @min-[29rem]:row-start-1",
        )}>
          <Button asChild variant="ghost" size="icon-sm">
            <Link href={`/quotations/review/${option.revision_id}`} aria-label={`Preview quotation ${option.reference}`} title="Preview quotation">
              <Eye aria-hidden="true" />
            </Link>
          </Button>
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

function inquiryTone(inquiry: Inquiry): Tone {
  return !inquiry.outcome ? "open" : inquiry.outcome.type === "accepted" ? "accepted" : "closed";
}

const inquiryStatus: Record<Tone, string> = { open: "Open", closed: "Closed", accepted: "Accepted" };
const timelineDot: Record<Tone, string> = {
  open: "bg-emerald-600 dark:bg-emerald-400",
  closed: "bg-muted-foreground",
  accepted: "bg-primary",
};

function InquiryDetails({ inquiry, actionsEnabled, showSummary, onReview }: {
  inquiry: Inquiry;
  actionsEnabled: boolean;
  showSummary: boolean;
  onReview: (command: Command, option?: Option) => void;
}) {
  const outcome = inquiry.outcome;
  const tone = inquiryTone(inquiry);
  return <section id={`inquiry-${inquiry.id}-details`} aria-labelledby={`inquiry-${inquiry.id}-quotations`} className="min-w-0 space-y-3">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <h3 id={`inquiry-${inquiry.id}-quotations`} className="text-base font-semibold sm:text-lg">
          Quotations ({inquiry.options.length})
        </h3>
        {showSummary && <p className="text-sm text-muted-foreground">For inquiry on {revisionDate(inquiry.opened_at)}</p>}
        {outcome && outcome.type !== "accepted" && <p className="text-xs text-muted-foreground">{inquiryClosureLabel[outcome.type]}</p>}
      </div>
      {showSummary && <StatusPill tone={tone}>{inquiryStatus[tone]}</StatusPill>}
    </div>
    {actionsEnabled && (!outcome || (outcome.type === "accepted" && inquiry.can_undo)) &&
      <div className="flex flex-wrap gap-2">
        {!outcome ? <>
          <Button size="sm" variant="outline" onClick={() => onReview({ type: "follow_up" })}>
            <BellRing aria-hidden="true" />Record follow-up
          </Button>
          <Button size="sm" variant="outline" onClick={() => onReview({ type: "close" })}>
            <XCircle aria-hidden="true" />Close Inquiry
          </Button>
        </> : <Button size="sm" variant="outline"
          onClick={() => onReview({ type: "undo_acceptance", expected_acceptance_id: outcome.event_id })}>
          <Undo2 aria-hidden="true" />Undo acceptance
        </Button>}
      </div>}
    <InquiryQuotationList options={inquiry.options} actionsEnabled={actionsEnabled}
      onReview={(option, command) => onReview(command, option)} />
  </section>;
}

const splitPaneMinWidth = 880;

export default function InquiryComparison({ clientId }: { clientId: Id<"clients"> }) {
  const data = useQuery(api.inquiries.forClient, { client_id: clientId });
  const [intent, setIntent] = useState<Intent | null>(null);
  const [selectedInquiryId, setSelectedInquiryId] = useState<Inquiry["id"] | null>(null);
  const [splitPane, setSplitPane] = useState(false);
  const workspace = useRef<HTMLElement>(null);
  const handledHash = useRef<string | null>(null);
  const hasInquiries = Boolean(data?.inquiries.length);

  useEffect(() => {
    if (!hasInquiries || !workspace.current) return;
    const observer = new ResizeObserver(([entry]) => setSplitPane(entry.contentRect.width >= splitPaneMinWidth));
    observer.observe(workspace.current);
    return () => observer.disconnect();
  }, [hasInquiries]);

  useEffect(() => {
    let frame: number | undefined;
    function openHashTarget() {
      const hash = window.location.hash;
      if (handledHash.current === hash) return;
      const inquiry = data?.inquiries.find(row => hash === `#inquiry-${row.id}`);
      if (!inquiry) return;
      frame = window.requestAnimationFrame(() => {
        handledHash.current = hash;
        setSelectedInquiryId(inquiry.id);
        document.getElementById(`inquiry-${inquiry.id}`)?.scrollIntoView({ block: "nearest" });
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

  if (!data) return <p role="status" className="text-sm text-muted-foreground">Loading Inquiries…</p>;
  if (!hasInquiries) return null;

  const selected = data.inquiries.find(inquiry => inquiry.id === selectedInquiryId)
    ?? (splitPane ? data.inquiries[0] : null);
  const details = selected ? <InquiryDetails
    inquiry={selected}
    actionsEnabled={data.actions_enabled}
    showSummary={splitPane}
    onReview={(command, option) => setIntent({ inquiry: selected, command, option, requestKey: crypto.randomUUID() })}
  /> : null;

  return <section ref={workspace} aria-labelledby="inquiry-timeline-heading"
    className={cn("grid min-w-0 gap-4", splitPane && "grid-cols-[minmax(0,9fr)_minmax(0,11fr)]")}>
    <Card className="min-w-0 gap-4 py-4">
      <CardHeader className="gap-1 px-3 sm:px-4">
        <h2 id="inquiry-timeline-heading" className="text-lg font-semibold tracking-tight">Inquiry Timeline</h2>
        <CardDescription>A chronological record of inquiries and their quotations.</CardDescription>
      </CardHeader>
      <CardContent className="px-3 sm:px-4">
        <ol role="list" className="space-y-2 pl-4 sm:pl-5" aria-label="Inquiry history">
          {data.inquiries.map(inquiry => {
            const isSelected = selected?.id === inquiry.id;
            const id = `inquiry-${inquiry.id}`;
            const accepted = inquiry.outcome?.type === "accepted" ? inquiry.outcome : null;
            const winner = accepted && inquiry.options.find(option => option.revision_id === accepted.revision_id);
            const tone = inquiryTone(inquiry);
            const count = inquiry.options.length;
            return <li key={inquiry.id} id={id} className="group relative scroll-mt-20">
              <div aria-hidden="true" className="absolute -left-3 top-7 -bottom-2 border-l border-border group-last:hidden sm:-left-4" />
              <div aria-hidden="true" className="absolute -left-3 top-0 h-7 border-l border-border group-first:hidden sm:-left-4" />
              <span aria-hidden="true" className={cn(
                "absolute -left-3 top-7 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card sm:-left-4",
                timelineDot[tone],
              )} />
              <div className={cn("rounded-lg border", isSelected ? "border-primary bg-primary/5" : "border-border")}>
                <div className="relative grid min-h-14 grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] items-center gap-x-2 px-2 py-1.5 sm:px-3">
                  <button type="button"
                    aria-expanded={splitPane ? undefined : isSelected}
                    aria-pressed={splitPane ? isSelected : undefined}
                    aria-controls={isSelected ? `${id}-details` : undefined}
                    aria-describedby={`${id}-summary`}
                    className="flex min-w-0 cursor-pointer items-center gap-1.5 text-left after:absolute after:inset-0 after:rounded-lg hover:after:bg-muted/20 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring sm:gap-2"
                    onClick={() => setSelectedInquiryId(!splitPane && isSelected ? null : inquiry.id)}>
                    <ChevronRight aria-hidden="true" className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none",
                      !splitPane && isSelected && "rotate-90")} />
                    <span className="min-w-0 space-y-0.5">
                      <time dateTime={inquiry.opened_at} className="block text-xs leading-tight font-semibold">{revisionDate(inquiry.opened_at)}</time>
                      <span className="block text-xs leading-tight text-muted-foreground">{count} {count === 1 ? "quotation" : "quotations"}</span>
                    </span>
                  </button>
                  <div id={`${id}-summary`} className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center justify-between gap-x-1.5 gap-y-0.5">
                      <StatusPill tone={tone}>{inquiryStatus[tone]}</StatusPill>
                      <p className="ml-auto text-right text-xs leading-tight font-semibold tabular-nums">{valueSummary(inquiry, winner)}</p>
                    </div>
                    {!inquiry.outcome && <p className="text-xs leading-tight text-muted-foreground">
                      <Countdown key={`${inquiry.deadline}:${data.server_now}`} deadline={inquiry.deadline} serverNow={data.server_now} />
                    </p>}
                    {accepted && <Link href={`/quotations/review/${accepted.revision_id}`}
                      aria-label={winner ? `Accepted quotation ${winner.reference}` : "Accepted quotation"}
                      className="relative z-1 block w-fit font-mono text-xs leading-tight text-primary wrap-anywhere hover:underline">
                      {winner?.reference ?? "View accepted quotation"}
                    </Link>}
                  </div>
                </div>
                {!splitPane && isSelected && <div className="border-t px-2 py-3 sm:px-3">{details}</div>}
              </div>
            </li>;
          })}
        </ol>
      </CardContent>
    </Card>
    {splitPane && <Card className="min-w-0 gap-0 p-4">{details}</Card>}
    {intent && <InquiryAction intent={intent} onDismiss={() => setIntent(null)} />}
  </section>;
}
