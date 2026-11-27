import type { ReactNode } from "react";

type ListPageLayoutProps = {
	title: string;
	description?: string;
	primaryAction?: ReactNode;
	children: ReactNode;
};

export function StaffPageColumn({ children }: { children: ReactNode }) {
	return (
		<div className="col-span-12 py-6 mx-2 sm:mx-4 lg:w-185 xl:w-250 lg:mx-auto space-y-4 md:space-y-6 animate-fadeIn pb-10">
			{children}
		</div>
	);
}

export function ListPageLayout({
	title,
	description,
	primaryAction,
	children,
}: ListPageLayoutProps) {
	return (
		<StaffPageColumn>
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
				<div>
					<h2 className="text-xl md:text-2xl font-bold tracking-tight">{title}</h2>
					{description ? (
						<p className="text-muted-foreground text-xs md:text-sm">{description}</p>
					) : null}
				</div>
				{primaryAction ? (
					<div className="grid w-full md:w-auto">{primaryAction}</div>
				) : null}
			</div>
			{children}
		</StaffPageColumn>
	);
}
