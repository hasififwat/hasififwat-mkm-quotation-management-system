import { api } from "convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { redirect } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogClose,
} from "@/components/ui/dialog";
import { getServerClient } from "~/lib/supabase/server";
import { useState } from "react";
import type { Route } from "./+types/quotation.duplicates";

export function meta() {
	return [
		{ title: "Duplicate Quotations" },
		{ name: "description", content: "Find and manage duplicate quotations" },
	];
}

export async function loader({ request }: Route.LoaderArgs) {
	const headers = new Headers();
	const supabase = getServerClient(request, headers);
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw redirect("/", { headers });

	const convexUrl = process.env.CONVEX_URL;
	if (!convexUrl) throw new Error("CONVEX_URL not configured");
	const client = new ConvexHttpClient(convexUrl);
	const duplicates = await client.query(api.quotations.findDuplicates, {});

	return { duplicates, convexUrl };
}

export default function DuplicatesPage({
	loaderData,
}: Route.ComponentProps) {
	const { duplicates, convexUrl } = loaderData as {
		convexUrl: string;
		duplicates: {
			clientName: string;
			packageId: string;
			flightId: string;
			totalAmount: number;
			count: number;
			quotationIds: string[];
			createdDates: string[];
		}[];
	};

	const [isDeleting, setIsDeleting] = useState<string | null>(null);
	const [confirmId, setConfirmId] = useState<string | null>(null);
	const [deleteResult, setDeleteResult] = useState<{
		success: boolean;
		message: string;
	} | null>(null);

	const handleDelete = async (quotationId: string) => {
		try {
			setConfirmId(null);
			setIsDeleting(quotationId);
			const client = new ConvexHttpClient(convexUrl);
			await client.mutation(api.quotations.deleteById, {
				quotationId,
			});
			setDeleteResult({
				success: true,
				message: `Quotation ${quotationId} deleted successfully`,
			});
			// Refresh the page after successful delete
			setTimeout(() => {
				window.location.reload();
			}, 1500);
		} catch (error) {
			setDeleteResult({
				success: false,
				message: `Failed to delete: ${error instanceof Error ? error.message : "Unknown error"}`,
			});
		} finally {
			setIsDeleting(null);
		}
	};

	return (
		<div className="col-span-12 py-6 mx-2 sm:mx-4 lg:w-185 xl:w-250 lg:mx-auto space-y-4 md:space-y-6 animate-fadeIn pb-10">
			{/* Single confirmation dialog controlled by state */}
			<Dialog open={confirmId !== null} onOpenChange={(open) => { if (!open) setConfirmId(null); }}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Quotation?</DialogTitle>
						<DialogDescription>
							This will permanently delete quotation <strong>{confirmId}</strong> and all associated items and logs. This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2">
						<DialogClose className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium h-9 px-4 border border-input bg-background hover:bg-accent hover:text-accent-foreground">
							Cancel
						</DialogClose>
						<Button
							type="button"
							variant="destructive"
							disabled={isDeleting !== null}
							onClick={() => confirmId && handleDelete(confirmId)}
						>
							{isDeleting ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<div>
				<h2 className="text-2xl font-bold tracking-tight">
					Duplicate Quotations
				</h2>
				<p className="text-slate-500 text-sm">
					Found {duplicates.length} duplicate group{duplicates.length !== 1 ? "s" : ""}
				</p>
			</div>

			{deleteResult && (
				<Card
					className={
						deleteResult.success
							? "border-green-200 bg-green-50"
							: "border-red-200 bg-red-50"
					}
				>
					<CardContent className="pt-6">
						<p
							className={
								deleteResult.success
									? "text-green-700"
									: "text-red-700"
							}
						>
							{deleteResult.message}
						</p>
					</CardContent>
				</Card>
			)}

			{duplicates.length === 0 ? (
				<Card>
					<CardContent className="pt-6">
						<p className="text-center text-muted-foreground">
							No duplicates found!
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-4">
					{duplicates.map((dup) => {
						const groupKey = `${dup.clientName}|${dup.packageId}|${dup.flightId}|${dup.totalAmount}`;
						return (
							<Card key={groupKey}>
							<CardHeader>
								<CardTitle className="text-base">
									{dup.clientName} × {dup.count} copies
								</CardTitle>
								<p className="text-sm text-muted-foreground">
									Package: {dup.packageId} | Flight: {dup.flightId} |
									Amount: {dup.totalAmount.toLocaleString("ms-MY", {
										style: "currency",
										currency: "MYR",
									})}
								</p>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									<div>
										<p className="text-sm font-medium mb-2">
											Quotation IDs:
										</p>
										<div className="space-y-2">
											{dup.quotationIds.map((id, i) => (
												<div key={id} className="flex items-center justify-between bg-muted p-2 rounded">
													<code className="text-xs font-mono flex-1">
														{id} ({dup.createdDates[i]})
													</code>
													<Button
														type="button"
														variant="destructive"
														size="sm"
														disabled={isDeleting === id}
														className="ml-2"
														onClick={() => setConfirmId(id)}
													>
														{isDeleting === id ? "Deleting..." : "Delete"}
													</Button>
												</div>
											))}
										</div>
									</div>
									<p className="text-xs text-amber-600 mt-4">
										⚠️ Keep the earliest, review and delete
										the rest
									</p>
								</div>
							</CardContent>
						</Card>
						);
					})}
				</div>
			)}
		</div>
	);
}
