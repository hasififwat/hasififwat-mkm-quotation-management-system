import { FileText, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { redirect } from "react-router";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Button } from "~/components/ui/button";
import SelectPackageButton from "~/features/packages/components/SelectPackageButton";
import { useExtractPackage } from "~/hooks/useExtractPackage";
import { createClient } from "~/lib/supabase/client";
import { UmrahPackageService } from "~/services/package-service";
import type { Route } from "./+types/package.create-from-schedule";

export async function clientAction({ request }: Route.ClientActionArgs) {
	const supabase = createClient();

	const data = await request.json();

	await UmrahPackageService.createPackagesWithFlights(supabase, data);

	return redirect("/packages");
}

export default function PackageCreateFromSchedule() {
	const _fileInputRef = useRef<HTMLInputElement>(null);
	const { handleFileUpload, fileName, packageData } = useExtractPackage();
	const [isDragging, setIsDragging] = useState(false);

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		const file = e.dataTransfer.files?.[0];
		if (file) {
			handleFileUpload(file);
		}
	};

	return (
		<div className="col-span-12 py-6 mx-2 sm:mx-4 lg:w-185 xl:w-250 lg:mx-auto space-y-4 md:space-y-6 animate-fadeIn pb-10">
			<div className="space-y-4">
				<div>
					<h2 className="text-xl md:text-2xl font-bold tracking-tight">
						Import Package from Flight Schedule
					</h2>
					<p className="text-slate-500 text-xs md:text-sm">
						Create a new travel package based on existing flight schedules.
					</p>
				</div>
				{!fileName && (
					<div
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
						onClick={() => _fileInputRef.current?.click()}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								_fileInputRef.current?.click();
							}
						}}
						role="button"
						tabIndex={0}
						className={`
						border-2 border-dashed rounded-lg p-10 text-center hover:bg-muted/50 transition-all cursor-pointer group outline-none focus-visible:ring-2 focus-visible:ring-primary
						${isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-muted-foreground/25"}
					`}
					>
						<input
							ref={_fileInputRef}
							onChange={handleFileUpload}
							type="file"
							accept=".csv"
							hidden
						/>
						<div className="flex flex-col items-center gap-3">
							<div
								className={`p-4 rounded-full transition-colors ${
									isDragging
										? "bg-primary/10"
										: "bg-secondary group-hover:bg-secondary/80"
								}`}
							>
								<UploadCloud
									className={`w-8 h-8 transition-colors ${
										isDragging
											? "text-primary"
											: "text-muted-foreground group-hover:text-foreground"
									}`}
								/>
							</div>
							<div className="space-y-1">
								<p className="text-sm font-medium text-foreground">
									Click to upload or drag and drop
								</p>
								<p className="text-xs text-muted-foreground">CSV files only</p>
							</div>
							<Button
								variant="secondary"
								size="sm"
								className="mt-2"
								type="button"
							>
								Select File
							</Button>
						</div>
					</div>
				)}

				{fileName && (
					<div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 border-muted-foreground/20 animate-in fade-in slide-in-from-top-2">
						<div className="p-2 ml-4 rounded-full bg-primary/10">
							<FileText className="w-5 h-5 text-primary" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-sm font-medium truncate text-foreground">
								{fileName}
							</p>
							<p className="text-xs text-muted-foreground">Ready to process</p>
						</div>
					</div>
				)}
			</div>

			{packageData && packageData.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Extracted Packages</CardTitle>
						<CardDescription>
							{packageData.length} packages found in the uploaded file.
						</CardDescription>
						<CardAction>
							<SelectPackageButton packageList={packageData} />
						</CardAction>
					</CardHeader>
					<CardContent>
						<Accordion type="single" collapsible className="w-full">
							{packageData.map((pkg, index) => (
								<AccordionItem key={index} value={`item-${index}`}>
									<AccordionTrigger className="hover:no-underline">
										<div className="flex flex-col items-start gap-1 text-left">
											<span className="font-semibold text-base">
												{pkg.name}
											</span>
											<span className="text-xs text-muted-foreground font-normal">
												{pkg.flights.length} available flight dates
											</span>
										</div>
									</AccordionTrigger>
									<AccordionContent>
										<div className="rounded-md border mt-2">
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>Code</TableHead>
														<TableHead>Month</TableHead>
														<TableHead>Departure</TableHead>
														<TableHead>Sector (Dep)</TableHead>
														<TableHead>Return</TableHead>
														<TableHead>Sector (Ret)</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{pkg.flights.map((flight, fIndex) => (
														<TableRow key={fIndex}>
															<TableCell className="font-medium">
																{flight.code}
															</TableCell>
															<TableCell>{flight.month}</TableCell>
															<TableCell>{flight.departure}</TableCell>
															<TableCell>{flight.sector_departure}</TableCell>
															<TableCell>{flight.return}</TableCell>
															<TableCell>{flight.sector_return}</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										</div>
									</AccordionContent>
								</AccordionItem>
							))}
						</Accordion>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
