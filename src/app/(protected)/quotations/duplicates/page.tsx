"use client";

import { api } from "convex/_generated/api";
import { useConvex, useConvexAuth } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { revisionDate } from "@/features/quotation/revision-display";

type DuplicateGroup = FunctionReturnType<typeof api.quotations.findDuplicates>[number];
type Candidate = DuplicateGroup["candidates"][number];

export default function DuplicatesPage() {
	const convex = useConvex();
	const { isAuthenticated } = useConvexAuth();
	const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
	const [loadStatus, setLoadStatus] = useState<"loading" | "loaded" | "failed">("loading");
	const [archivingId, setArchivingId] = useState<Candidate["id"] | null>(null);
	const [confirmCandidate, setConfirmCandidate] = useState<Candidate | null>(null);
	const [archiveResult, setArchiveResult] = useState<{
		success: boolean;
		message: string;
	} | null>(null);

	useEffect(() => {
		if (!isAuthenticated) return;
		let cancelled = false;
		const load = async () => {
			setLoadStatus("loading");
			try {
				const result = await convex.query(api.quotations.findDuplicates, {});
				if (cancelled) return;
				setDuplicates(result);
				setLoadStatus("loaded");
			} catch {
				if (!cancelled) setLoadStatus("failed");
			}
		};
		void load();
		return () => {
			cancelled = true;
		};
	}, [convex, isAuthenticated]);

	const handleArchive = async (candidate: Candidate) => {
		if (archivingId !== null) return;
		setConfirmCandidate(null);
		setArchivingId(candidate.id);
		setArchiveResult(null);
		try {
			await convex.mutation(api.quotations.archiveQuotation, {
				id: candidate.id,
			});
			setDuplicates((groups) => groups
				.map((group) => ({
					...group,
					candidates: group.candidates.filter((row) => row.id !== candidate.id),
				}))
				.filter((group) => group.candidates.length >= 2));
			setArchiveResult({
				success: true,
				message: `Quotation ${candidate.reference} archived successfully.`,
			});
		} catch {
			setArchiveResult({
				success: false,
				message: `Could not archive quotation ${candidate.reference}. Reload this page to check its status.`,
			});
		} finally {
			setArchivingId(null);
		}
	};

	const showSkeleton = loadStatus === "loading" && duplicates.length === 0;

	return (
		<div className="workspace-page max-w-7xl space-y-4 md:space-y-6 animate-fadeIn">
			<Dialog
				open={confirmCandidate !== null}
				onOpenChange={(open) => {
					if (!open) setConfirmCandidate(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Archive Quotation?</DialogTitle>
						<DialogDescription>
							Quotation <strong>{confirmCandidate?.reference}</strong> will move to the archived list. Its saved details will remain available.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2">
						<DialogClose className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium h-9 px-4 border border-input bg-background hover:bg-accent hover:text-accent-foreground">
							Cancel
						</DialogClose>
						<Button
							type="button"
							disabled={archivingId !== null}
							onClick={() => confirmCandidate && handleArchive(confirmCandidate)}
						>
							Archive
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<div>
				<h2 className="wrap-anywhere text-xl font-bold tracking-tight md:text-2xl">
					Duplicate Quotations
				</h2>
				<p role="status" className="sr-only">
					{loadStatus === "loading" ? "Loading duplicate quotations…" : ""}
				</p>
				{showSkeleton ? (
					<Skeleton aria-hidden="true" className="my-1 h-4 w-44" />
				) : loadStatus === "failed" ? (
					<p role="alert" className="text-muted-foreground text-sm">
						Unable to load duplicate quotations.
					</p>
				) : (
					<p className="text-muted-foreground text-sm">
						Found {duplicates.length} duplicate group{duplicates.length !== 1 ? "s" : ""}
					</p>
				)}
			</div>

			{archiveResult && (
				<Card
					className={
						archiveResult.success
							? "border-green-200 bg-green-50"
							: "border-red-200 bg-red-50"
					}
				>
					<CardContent className="pt-6">
						<p
							role={archiveResult.success ? "status" : "alert"}
							className={
								archiveResult.success ? "text-green-700" : "text-red-700"
							}
						>
							{archiveResult.message}
						</p>
					</CardContent>
				</Card>
			)}

			{showSkeleton ? (
				<Card aria-hidden="true">
					<CardHeader>
						<Skeleton className="h-4 w-40" />
						<Skeleton className="h-4 w-full max-w-xs" />
					</CardHeader>
					<CardContent className="space-y-2">
						<Skeleton className="h-9 w-full" />
						<Skeleton className="h-9 w-full" />
					</CardContent>
				</Card>
			) : loadStatus === "loaded" && duplicates.length === 0 ? (
				<Card>
					<CardContent className="pt-6">
						<p className="text-center text-muted-foreground">
							No duplicates found!
						</p>
					</CardContent>
				</Card>
			) : duplicates.length > 0 ? (
				<div className="space-y-4">
					{duplicates.map((dup) => {
						const groupKey = `${dup.clientName}|${dup.packageId}|${dup.flightId}|${dup.totalAmount}`;
						return (
							<Card key={groupKey}>
								<CardHeader>
									<CardTitle className="text-base">
										{dup.clientName} × {dup.candidates.length} candidates
									</CardTitle>
									<p className="wrap-anywhere text-sm text-muted-foreground">
										Package: {dup.packageId} | Flight: {dup.flightId} | Amount:{" "}
										{dup.totalAmount.toLocaleString("ms-MY", {
											style: "currency",
											currency: "MYR",
										})}
									</p>
								</CardHeader>
								<CardContent>
									<div className="space-y-2">
										<div>
											<p className="text-sm font-medium mb-2">Saved quotations:</p>
											<div className="space-y-2">
												{dup.candidates.map((candidate) => (
													<div
														key={candidate.id}
														className="flex flex-col items-start gap-2 rounded-md bg-muted px-3 py-2 sm:flex-row sm:items-center"
													>
														<div className="min-w-0 flex-1 wrap-anywhere text-sm">
															<Link
																href={`/quotations/review/${candidate.id}`}
																className="font-medium underline underline-offset-4"
															>
																{candidate.reference}
															</Link>
															<p className="text-xs text-muted-foreground">
																Saved at (Kuala Lumpur): {revisionDate(candidate.createdAt)}
															</p>
														</div>
														<Button
															type="button"
																	variant="outline"
															size="sm"
																	aria-label={`Archive ${candidate.reference}`}
															disabled={archivingId !== null}
															className="self-end sm:self-auto"
															onClick={() => setConfirmCandidate(candidate)}
														>
															{archivingId === candidate.id ? "Archiving..." : "Archive"}
														</Button>
													</div>
												))}
											</div>
										</div>
										<p className="mt-4 text-xs text-amber-800 dark:text-amber-300">
											Open and compare the saved quotations before deciding which to archive.
										</p>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			) : null}
		</div>
	);
}
