"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { inquiryClosureLabel, inquiryStatusLabel } from "~/features/quotation/inquiry-display";
import { revisionDate } from "~/features/quotation/revision-display";

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
  if (minutes <= 0) return <span>Closing due to inactivity…</span>;
  const [amount, unit] = minutes >= 1440 ? [Math.ceil(minutes / 1440), "day"]
    : minutes >= 60 ? [Math.ceil(minutes / 60), "hour"] : [minutes, "minute"];
  return <span>Closes in {amount} {unit}{amount === 1 ? "" : "s"}</span>;
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

export default function InquiryComparison({ clientId }: { clientId: Id<"clients"> }) {
  const data = useQuery(api.inquiries.forClient, { client_id: clientId });
  const [intent, setIntent] = useState<Intent | null>(null);

  function review(inquiry: Inquiry, command: Command, option?: Option) {
    setIntent({ inquiry, command, option, requestKey: crypto.randomUUID() });
  }

  if (!data) return <p role="status" className="text-sm text-muted-foreground">Loading Inquiries…</p>;
  if (data.inquiries.length === 0) return null;

  return <section className="space-y-4" aria-label="Inquiries">
    <h2 className="text-lg font-semibold">Inquiries</h2>
    {data.inquiries.map(inquiry => {
      return <Card key={inquiry.id} id={`inquiry-${inquiry.id}`}>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">{!inquiry.outcome ? "Open Inquiry" : inquiry.outcome.type === "accepted" ? "Accepted Inquiry" : "Closed Inquiry"}</CardTitle>
              <p className="text-sm text-muted-foreground">Opened {revisionDate(inquiry.opened_at)}</p>
            </div>
            <p className="text-sm font-medium">
              {!inquiry.outcome ? <Countdown key={`${inquiry.deadline}:${data.server_now}`} deadline={inquiry.deadline} serverNow={data.server_now} />
                : inquiry.outcome.type === "accepted" ? "Quotation accepted" : inquiryClosureLabel[inquiry.outcome.type]}
            </p>
          </div>
          {data.actions_enabled && <div className="flex flex-wrap gap-2">
            {!inquiry.outcome && <>
              <Button size="sm" variant="outline" onClick={() => review(inquiry, { type: "follow_up" })}>Record follow-up</Button>
              <Button size="sm" variant="outline" onClick={() => review(inquiry, { type: "close" })}>Close Inquiry</Button>
            </>}
            {inquiry.can_undo && inquiry.outcome?.type === "accepted" &&
              <Button size="sm" variant="outline" onClick={() => {
                if (inquiry.outcome?.type === "accepted") review(inquiry, { type: "undo_acceptance", expected_acceptance_id: inquiry.outcome.event_id });
              }}>Undo acceptance</Button>}
          </div>}
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="@container overflow-hidden rounded-md border">
            <Table aria-label="Quotation options" className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className="@min-[47rem]:w-[14%]">Quotation</TableHead>
                  <TableHead scope="col" className="hidden w-[25%] @min-[47rem]:table-cell">Package</TableHead>
                  <TableHead scope="col" className="hidden w-[14%] @min-[42rem]:table-cell">Departure</TableHead>
                  <TableHead scope="col" className="hidden w-[14%] @min-[42rem]:table-cell">Return</TableHead>
                  <TableHead scope="col" className="w-[27%] text-right @min-[42rem]:w-[14%]">Total</TableHead>
                  <TableHead scope="col" className="w-[27%] @max-[18rem]:w-[84px] @min-[42rem]:w-[19%]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inquiry.options.map(option => {
                  const departure = option.departure_date ?? "Not recorded";
                  const returnDate = option.return_date ?? "Not recorded";

                  return <TableRow key={option.family_id}>
                    <TableHead scope="row" className="h-auto wrap-anywhere p-2 align-top font-normal whitespace-normal text-foreground @min-[47rem]:align-middle">
                      <Link href={`/quotations/review/${option.revision_id}`} className="font-mono font-medium text-primary underline">{option.reference}</Link>
                      <p className="mt-0.5 font-medium @min-[47rem]:hidden">{option.package_name ?? "Package unavailable"}</p>
                      <div className="mt-1 text-xs text-muted-foreground @min-[42rem]:hidden">
                        <p>Departure <span className="whitespace-nowrap">{departure}</span></p>
                        <p>Return <span className="whitespace-nowrap">{returnDate}</span></p>
                      </div>
                    </TableHead>
                    <TableCell className="hidden wrap-anywhere font-medium whitespace-normal @min-[47rem]:table-cell">{option.package_name ?? "Package unavailable"}</TableCell>
                    <TableCell className="hidden wrap-anywhere whitespace-normal tabular-nums @min-[42rem]:table-cell">{departure}</TableCell>
                    <TableCell className="hidden wrap-anywhere whitespace-normal tabular-nums @min-[42rem]:table-cell">{returnDate}</TableCell>
                    <TableCell className="wrap-break-word px-1.5 text-right align-top text-xs font-medium whitespace-normal tabular-nums @min-[42rem]:text-sm @min-[47rem]:align-middle">
                      {currency.format(option.total_amount).replaceAll("\u00a0", " ")}
                    </TableCell>
                    <TableCell className="align-top whitespace-normal @min-[47rem]:align-middle">
                      <div className="flex flex-wrap items-center justify-between gap-x-1">
                        <Badge variant={option.status === "accepted" ? "default" : "secondary"} className="px-1.5 @min-[42rem]:px-2">
                          {inquiryStatusLabel[option.status]}
                        </Badge>
                        {data.actions_enabled && option.status === "active" && <InquiryOptionActions option={option} onReview={command => review(inquiry, command, option)} />}
                      </div>
                      {option.status === "closed" && <p className="mt-1 text-xs text-muted-foreground">{inquiryClosureLabel[option.reason]}</p>}
                    </TableCell>
                  </TableRow>;
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>;
    })}
    {intent && <InquiryAction intent={intent} onDismiss={() => setIntent(null)} />}
  </section>;
}
