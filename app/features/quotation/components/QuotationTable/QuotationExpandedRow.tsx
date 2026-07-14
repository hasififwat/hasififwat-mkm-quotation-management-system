import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Quotation } from "./columns";

function formatDate(isoDate: string): string {
	const [year, month, day] = isoDate.split("-").map(Number);
	const date = new Date(year, month - 1, day);
	const dd = String(date.getDate()).padStart(2, "0");
	const mmm = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
	return `${dd} ${mmm} ${year}`;
}

function formatDateTime(isoString: string): string {
	const date = new Date(isoString);
	const dd = String(date.getDate()).padStart(2, "0");
	const mm = String(date.getMonth() + 1).padStart(2, "0");
	const yyyy = date.getFullYear();
	return `${dd}/${mm}/${yyyy}`;
}

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat("ms-MY", {
		style: "currency",
		currency: "MYR",
	}).format(Math.abs(amount));
}

function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
			{children}
		</p>
	);
}

interface Props {
	quotation: Quotation;
}

export function QuotationExpandedRow({ quotation }: Props) {
	const items = useQuery(api.quotations.getItemsByQuotationId, {
		id: quotation.id,
	});

	const snap = quotation.flight_snapshot;
	const flight = snap ?? quotation.selected_flight;
	const airline =
		(snap as { flight?: string } | null)?.flight ??
		(quotation.selected_flight as { flight?: string } | null)?.flight;

	const addons = items?.filter((i) => i.item_type === "addon") ?? [];
	const discounts = items?.filter((i) => i.item_type === "discount") ?? [];
	const hasItems = addons.length > 0 || discounts.length > 0;

	return (
		<div className="px-6 py-4 bg-muted/20 space-y-4">

			{/* Row 1: three equal columns */}
			<div className="grid grid-cols-3 gap-6">
				{/* Umrah Dates */}
				<div>
					<SectionLabel>Umrah Dates</SectionLabel>
					{flight?.departure_date && flight?.return_date ? (
						<div className="space-y-0.5">
							<p className="text-sm">
								{formatDate(flight.departure_date)}
								<span className="mx-1.5 text-muted-foreground">–</span>
								{formatDate(flight.return_date)}
							</p>
							{airline && (
								<p className="text-xs text-muted-foreground">{airline}</p>
							)}
							{(flight as { departure_sector?: string }).departure_sector && (
								<p className="text-xs text-muted-foreground">
									{(flight as { departure_sector: string }).departure_sector}
									{" → "}
									{(flight as { return_sector: string }).return_sector}
								</p>
							)}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">—</p>
					)}
				</div>

				{/* PIC & Branch */}
				<div>
					<SectionLabel>PIC & Branch</SectionLabel>
					<p className="text-sm">{quotation.pic_name}</p>
					<p className="text-xs text-muted-foreground">{quotation.branch}</p>
				</div>

				{/* Timestamps */}
				<div>
					<SectionLabel>Record Info</SectionLabel>
					<div className="space-y-0.5">
						<p className="text-xs text-muted-foreground">
							Created: <span className="text-foreground">{formatDateTime(quotation.created_at)}</span>
						</p>
						<p className="text-xs text-muted-foreground">
							Updated: <span className="text-foreground">{formatDateTime(quotation.updated_at)}</span>
						</p>
						<p className="text-xs text-muted-foreground">
							Year: <span className="text-foreground">{quotation.hijri_year}</span>
						</p>
					</div>
				</div>
			</div>

			{/* Notes */}
			{quotation.notes && (
				<>
					<Separator />
					<div>
						<SectionLabel>Notes</SectionLabel>
						<p className="text-sm whitespace-pre-wrap">{quotation.notes}</p>
					</div>
				</>
			)}

			{/* Add-ons & Discounts */}
			{items === undefined ? (
				<>
					<Separator />
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
						Loading items...
					</div>
				</>
			) : hasItems ? (
				<>
					<Separator />
					<div className="grid grid-cols-2 gap-6">
						{/* Additional Costs */}
						<div>
							<SectionLabel>Additional Costs</SectionLabel>
							{addons.length > 0 ? (
								<div className="space-y-1.5">
									{addons.map((item, i) => (
										<div key={i} className="flex items-center justify-between gap-3 text-sm">
											<span className="flex-1 truncate">{item.description}</span>
											<span className="text-muted-foreground text-xs shrink-0">
												{item.quantity} pax × {formatCurrency(item.unit_price)}
											</span>
											<Badge variant="outline" className="text-[10px] shrink-0">
												{formatCurrency(item.unit_price * item.quantity)}
											</Badge>
										</div>
									))}
								</div>
							) : (
								<p className="text-xs text-muted-foreground">None</p>
							)}
						</div>

						{/* Discounts */}
						<div>
							<SectionLabel>Discounts</SectionLabel>
							{discounts.length > 0 ? (
								<div className="space-y-1.5">
									{discounts.map((item, i) => (
										<div key={i} className="flex items-center justify-between gap-3 text-sm">
											<span className="flex-1 truncate">{item.description}</span>
											<span className="text-muted-foreground text-xs shrink-0">
												{item.quantity} pax × {formatCurrency(item.original_price ?? Math.abs(item.unit_price))}
											</span>
											<Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 shrink-0">
												−{formatCurrency((item.original_price ?? Math.abs(item.unit_price)) * item.quantity)}
											</Badge>
										</div>
									))}
								</div>
							) : (
								<p className="text-xs text-muted-foreground">None</p>
							)}
						</div>
					</div>
				</>
			) : null}
		</div>
	);
}
