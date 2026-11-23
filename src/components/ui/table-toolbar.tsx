import { Loader2, Search } from "lucide-react";
import type { ChangeEventHandler, ReactNode } from "react";

import { Input } from "~/components/ui/input";

type TableToolbarProps = {
	children: ReactNode;
	search: {
		label: string;
		placeholder: string;
		value: string;
		onChange: ChangeEventHandler<HTMLInputElement>;
		isLoading?: boolean;
	};
};

export function TableToolbar({ children, search }: TableToolbarProps) {
	return (
		<div className="@container border-b border-border">
			<div className="flex flex-col gap-2 p-4 @lg:flex-row @lg:items-center @lg:gap-3">
				<div className="flex flex-wrap items-center gap-2">{children}</div>
				<form
					className="relative min-w-0 flex-1"
					role="search"
					aria-label={search.label}
					onSubmit={(event) => event.preventDefault()}
				>
					<div
						className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground"
						aria-hidden="true"
					>
						{search.isLoading ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<Search className="size-4" />
						)}
					</div>
					<Input
						type="search"
						name="q"
						aria-label={search.label}
						placeholder={search.placeholder}
						className="pl-9"
						value={search.value}
						onChange={search.onChange}
					/>
				</form>
			</div>
		</div>
	);
}
