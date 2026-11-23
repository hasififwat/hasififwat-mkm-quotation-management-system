"use client";

import { usePathname } from "next/navigation";

import { Skeleton } from "~/components/ui/skeleton";
import { QuotationPdfSkeleton } from "~/features/quotation/components/QuotationPdfSkeleton";
import { cn } from "~/lib/utils";

import { TableSkeletonRows } from "./TableSkeletonRows";

type WorkspaceScreen = {
	label: string;
	width?: string;
} & (
	| { kind: "list"; columns: number; action?: boolean }
	| { kind: "dashboard"; columns?: number }
	| { kind: "import"; uploads: number }
	| { kind: "editor"; steps?: 3 }
	| { kind: "package-editor" | "detail" | "document" }
);

const screens: readonly [RegExp, WorkspaceScreen][] = [
	[/^\/packages$/, { kind: "list", label: "packages", columns: 6, action: true }],
	[/^\/quotations$/, { kind: "list", label: "quotations", columns: 7, action: true }],
	[/^\/clients$/, { kind: "list", label: "clients", columns: 6, action: true }],
	[/^\/flights$/, { kind: "list", label: "flights", columns: 8 }],
	[/^\/flights\/audit$/, { kind: "list", label: "flight audit", columns: 8 }],
	[/^\/dashboard$/, { kind: "dashboard", label: "dashboard" }],
	[/^\/packages\/stats$/, { kind: "dashboard", label: "package usage", columns: 6 }],
	[/^\/packages\/(?:create|edit\/[^/]+)$/, { kind: "package-editor", label: "package editor", width: "max-w-6xl" }],
	[/^\/quotations\/(?:create|edit\/[^/]+)$/, { kind: "editor", label: "quotation editor", width: "max-w-4xl", steps: 3 }],
	[/^\/clients\/create$/, { kind: "editor", label: "client form", width: "max-w-lg" }],
	[/^\/packages\/create-from-schedule$/, { kind: "import", label: "flight schedule import", uploads: 1, width: "max-w-5xl" }],
	[/^\/packages\/sync$/, { kind: "import", label: "package sync", uploads: 2 }],
	[/^\/clients\/[^/]+$/, { kind: "detail", label: "client details", width: "max-w-5xl" }],
	[/^\/quotations\/[^/]+\/history$/, { kind: "detail", label: "revision history", width: "max-w-5xl" }],
	[/^\/quotations\/duplicates$/, { kind: "detail", label: "duplicate quotations" }],
	[/^\/quotations\/review\/[^/]+$/, { kind: "document", label: "quotation preview", width: "max-w-3xl" }],
];

const defaultScreen: WorkspaceScreen = { kind: "list", label: "workspace", columns: 6 };
const panel = "rounded-xl border bg-card shadow-xs";

function TablePanel({ columns, search = false }: { columns: number; search?: boolean }) {
	return (
		<div className={cn(panel, "overflow-hidden")}>
			{search ? (
				<div className="border-b p-4">
					<Skeleton className="h-9 w-full" />
				</div>
			) : null}
			<table className="w-full table-fixed">
				<thead className="border-b bg-muted/35">
					<tr>
						{Array.from({ length: columns }, (_, column) => (
							<th key={column} className="p-2">
								<Skeleton className="h-3 w-2/3 max-w-24" />
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					<TableSkeletonRows columns={columns} />
				</tbody>
			</table>
		</div>
	);
}

function EditorPanel({ steps }: { steps?: 3 }) {
	return (
		<>
			{steps ? (
				<div className={cn(panel, "@container p-4 sm:p-6")}>
					<div className="grid grid-cols-3 gap-3">
						{Array.from({ length: steps }, (_, step) => (
							<div key={step} className="flex min-w-0 flex-col items-center gap-2">
								<Skeleton className="size-8 rounded-full" />
								<Skeleton className="h-3 w-16 max-w-full" />
							</div>
						))}
					</div>
				</div>
			) : null}
			<div className={cn(panel, "space-y-4 p-4 sm:p-6")}>
				<Skeleton className="h-5 w-36 max-w-full" />
				<div className={cn("grid gap-4", steps === 3 && "sm:grid-cols-2")}>
					{Array.from({ length: steps ? 4 : 2 }, (_, field) => (
						<div key={field} className="min-w-0 space-y-2">
							<Skeleton className="h-3 w-20 max-w-full" />
							<Skeleton className="h-9 w-full" />
						</div>
					))}
				</div>
			</div>
		</>
	);
}

function PackageEditorPanel() {
	return (
		<div className="@container min-w-0">
			<div className="grid min-w-0 grid-cols-1 gap-3 @min-[52rem]:grid-cols-[minmax(0,1fr)_14rem] @min-[52rem]:gap-6">
				<div className="min-w-0 rounded-lg border bg-card @min-[52rem]:sticky @min-[52rem]:top-20 @min-[52rem]:col-start-2 @min-[52rem]:row-start-1 @min-[52rem]:self-start @min-[52rem]:rounded-xl @min-[52rem]:bg-sidebar @min-[52rem]:shadow-xs">
					<div className="flex min-h-11 min-w-0 items-center gap-2 px-3 py-2 @min-[52rem]:hidden">
						<Skeleton className="size-6 shrink-0 rounded-full" />
						<div className="flex min-w-0 flex-1 items-center gap-2">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-3 w-16" />
						</div>
						<Skeleton className="size-4 shrink-0" />
					</div>
					<div className="hidden min-w-0 p-3 @min-[52rem]:block">
						<div className="mb-3 flex h-5 items-center justify-between gap-2 px-2">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-3 w-8" />
						</div>
						<div className="space-y-1">
							{Array.from({ length: 6 }, (_, step) => (
								<div key={step} className="flex min-h-10 min-w-0 items-center gap-2 px-2">
									<Skeleton className="size-6 shrink-0 rounded-full" />
									<Skeleton className="h-4 w-24 max-w-full" />
								</div>
							))}
						</div>
					</div>
				</div>
				<div className={cn(panel, "min-w-0 overflow-clip @min-[52rem]:col-start-1 @min-[52rem]:row-start-1")}>
					<div className="space-y-1 border-b bg-muted/35 px-4 py-5 sm:px-6">
						<Skeleton className="h-5 w-24 max-w-full" />
						<Skeleton className="h-5 w-80 max-w-full" />
					</div>
					<div className="grid gap-4 p-4 sm:px-6 sm:py-5">
						{Array.from({ length: 4 }, (_, field) => (
							<div key={field} className="min-w-0 space-y-3">
								<Skeleton className="h-5 w-20 max-w-full" />
								<Skeleton className="h-9 w-full" />
								{field === 2 && <Skeleton className="h-5 w-36 max-w-full" />}
							</div>
						))}
					</div>
					<div className="flex justify-between gap-3 border-t bg-muted/35 px-4 py-3.5 sm:px-6">
						<Skeleton className="h-9 w-16" />
						<Skeleton className="h-9 w-20" />
					</div>
				</div>
			</div>
		</div>
	);
}

function ImportPanel({ uploads }: { uploads: number }) {
	return (
		<div className="space-y-4">
			{Array.from({ length: uploads }, (_, upload) => (
				<div
					key={upload}
					className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed bg-card px-4 py-8"
				>
					<Skeleton className="size-12 rounded-full" />
					<Skeleton className="h-4 w-44 max-w-full" />
					<Skeleton className="h-3 w-28 max-w-full" />
				</div>
			))}
		</div>
	);
}

function DetailPanel() {
	return (
		<div className="space-y-4">
			{Array.from({ length: 2 }, (_, item) => (
				<div key={item} className={cn(panel, "space-y-4 p-4 sm:p-6")}>
					<Skeleton className="h-5 w-40 max-w-full" />
					<div className="grid gap-3 sm:grid-cols-3">
						<Skeleton className="h-4 w-4/5" />
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-4 w-3/5" />
					</div>
				</div>
			))}
		</div>
	);
}

function DashboardPanel({ columns }: { columns?: number }) {
	return (
		<>
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				{Array.from({ length: 4 }, (_, card) => (
					<div key={card} className={cn(panel, "min-w-0 space-y-3 p-4")}>
						<Skeleton className="h-3 w-24 max-w-full" />
						<Skeleton className="h-6 w-12 max-w-full" />
					</div>
				))}
			</div>
			{columns ? <TablePanel columns={columns} /> : <DetailPanel />}
		</>
	);
}

function ScreenPanel({ screen }: { screen: WorkspaceScreen }) {
	switch (screen.kind) {
		case "list":
			return <TablePanel columns={screen.columns} search />;
		case "editor":
			return <EditorPanel steps={screen.steps} />;
		case "package-editor":
			return <PackageEditorPanel />;
		case "import":
			return <ImportPanel uploads={screen.uploads} />;
		case "dashboard":
			return <DashboardPanel columns={screen.columns} />;
		case "detail":
			return <DetailPanel />;
		case "document":
			return <QuotationPdfSkeleton />;
	}
}

export function WorkspaceSkeleton() {
	const pathname = usePathname().replace(/\/$/, "");
	const screen = screens.find(([path]) => path.test(pathname))?.[1] ?? defaultScreen;
	const isPackageEditor = screen.kind === "package-editor";

	return (
		<div className={cn("workspace-page", screen.width ?? "max-w-7xl")}>
			<p role="status" className="sr-only">
				Loading {screen.label}…
			</p>
			<div aria-hidden="true" className="space-y-4 md:space-y-6">
				{!isPackageEditor && screen.kind !== "document" ? (
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="min-w-0 flex-1 space-y-2">
							<Skeleton className="h-7 w-48 max-w-full" />
							<Skeleton className="h-4 w-72 max-w-full" />
						</div>
						{screen.kind === "list" && screen.action ? (
							<Skeleton className="h-9 w-full sm:w-32" />
						) : null}
					</div>
				) : null}
				<ScreenPanel screen={screen} />
			</div>
		</div>
	);
}
