import { ChevronLeft, Eye, FileText, PencilIcon, Phone, Plus, User } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

type ClientQuotation = {
	id: string;
	quotation_number: string;
	status: string;
	total_amount: number;
	package_name: string;
	package_year: string | null;
	pic_name: string;
	branch: string;
	created_at: string;
	updated_at: string;
};

type ClientDetail = {
	id: string;
	name: string;
	phone_number?: string;
	created_at: string;
	updated_at: string;
	quotations: ClientQuotation[];
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	draft:      "secondary",
	sent:       "outline",
	accepted:   "default",
	revised:    "outline",
	superseded: "secondary",
	rejected:   "destructive",
};

function formatDate(iso: string) {
	const d = new Date(iso);
	return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function formatCurrency(amount: number) {
	return new Intl.NumberFormat("ms-MY", {
		style: "currency",
		currency: "MYR",
	}).format(amount);
}

export default function ClientDetailPage({ client }: { client: ClientDetail }) {
	const totalSpend = client.quotations.reduce((sum, q) => sum + q.total_amount, 0);

	return (
		<div className="col-span-12 py-6 mx-2 sm:mx-4 lg:w-185 xl:w-250 lg:mx-auto space-y-4 md:space-y-6 animate-fadeIn pb-10">
			{/* Back nav */}
			<Button variant="ghost" size="sm" asChild className="-ml-2 gap-1 text-muted-foreground">
				<Link to="/clients">
					<ChevronLeft className="h-4 w-4" />
					All Clients
				</Link>
			</Button>

			{/* Client info card */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
						<div className="flex items-center gap-3">
							<div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
								<User className="h-5 w-5 text-primary" />
							</div>
							<div>
								<CardTitle className="text-lg">{client.name}</CardTitle>
								{client.phone_number && (
									<div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
										<Phone className="h-3.5 w-3.5" />
										{client.phone_number}
									</div>
								)}
							</div>
						</div>
						<Button asChild className="gap-2 w-full md:w-auto">
							<Link to={`/quotations/create?client_id=${client.id}`}>
								<Plus className="h-4 w-4" />
								New Quotation
							</Link>
						</Button>
					</div>
				</CardHeader>
				<CardContent className="pt-0">
					<div className="flex flex-wrap gap-6 text-sm">
						<div>
							<p className="text-muted-foreground text-xs mb-0.5">Quotations</p>
							<p className="font-semibold">{client.quotations.length}</p>
						</div>
						<div>
							<p className="text-muted-foreground text-xs mb-0.5">Total Spend</p>
							<p className="font-semibold">{formatCurrency(totalSpend)}</p>
						</div>
						<div>
							<p className="text-muted-foreground text-xs mb-0.5">Client Since</p>
							<p className="font-semibold">{formatDate(client.created_at)}</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Quotation timeline */}
			<Card className="overflow-hidden">
				<CardHeader className="p-4 md:p-6 pb-3 border-b border-slate-100">
					<CardTitle className="text-base">
						Quotation History
						<span className="ml-2 text-sm font-normal text-muted-foreground">
							({client.quotations.length})
						</span>
					</CardTitle>
				</CardHeader>
				<CardContent className="p-4 md:p-6">
					{client.quotations.length === 0 ? (
						<div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
							<p className="text-sm">No quotations yet for this client.</p>
							<Button asChild size="sm" variant="outline">
								<Link to={`/quotations/create?client_id=${client.id}`}>
									Create first quotation
								</Link>
							</Button>
						</div>
					) : (
						<ol className="relative border-l border-border ml-3">
							{client.quotations.map((q) => (
								<li key={q.id} className="mb-8 ml-6 last:mb-0">
									{/* Timeline dot */}
									<span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-background border border-border ring-4 ring-background">
										<FileText className="h-3 w-3 text-muted-foreground" />
									</span>

									{/* Content row */}
									<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
										<div className="space-y-1">
											<p className="text-sm">
												<span className="text-muted-foreground">Quotation </span>
												<Link
													to={`/quotations/review/${q.id}`}
													className="font-semibold text-primary hover:underline font-mono"
												>
													{q.quotation_number}
												</Link>
												<span className="text-muted-foreground"> created for </span>
												<span className="font-medium">{q.package_name}</span>
												{q.package_year && (
													<span className="text-muted-foreground"> ({q.package_year})</span>
												)}
											</p>
											<div className="flex flex-wrap items-center gap-2">
												<Badge variant={STATUS_VARIANT[q.status] ?? "secondary"} className="text-xs">
													{q.status.charAt(0).toUpperCase() + q.status.slice(1)}
												</Badge>
												<span className="text-xs text-muted-foreground">
													{formatCurrency(q.total_amount)}
												</span>
												<span className="text-xs text-muted-foreground">·</span>
												<span className="text-xs text-muted-foreground">
													PIC: {q.pic_name}
												</span>
											</div>
										</div>

										<div className="flex items-center gap-2 shrink-0">
											<time className="text-xs text-muted-foreground whitespace-nowrap">
												{formatDate(q.created_at)}
											</time>
											<Button variant="ghost" size="sm" asChild className="h-7 w-7 p-0">
												<Link to={`/quotations/review/${q.id}`} title="Preview">
													<Eye className="h-3.5 w-3.5" />
												</Link>
											</Button>
											<Button variant="ghost" size="sm" asChild className="h-7 w-7 p-0">
												<Link to={`/quotations/edit/${q.id}`} title="Edit">
													<PencilIcon className="h-3.5 w-3.5" />
												</Link>
											</Button>
										</div>
									</div>
								</li>
							))}
						</ol>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
