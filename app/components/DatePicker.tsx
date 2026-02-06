import { format, parse } from "date-fns";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

import { cn } from "~/lib/utils";

interface DatePickerProps {
	value?: string; // ISO date string (YYYY-MM-DD)
	onChange?: (value: string) => void;
	placeholder?: string;
	className?: string;
}

export function DatePicker({
	value,
	onChange,
	placeholder = "Pick a date",
	className,
}: DatePickerProps) {
	const [open, setOpen] = React.useState(false);

	// Convert string value to Date object for Calendar
	const dateValue = React.useMemo(() => {
		if (!value) return undefined;
		try {
			return parse(value, "yyyy-MM-dd", new Date());
		} catch {
			return undefined;
		}
	}, [value]);

	const handleSelect = (date: Date | undefined) => {
		if (date && onChange) {
			// Convert Date to ISO string (YYYY-MM-DD)
			onChange(format(date, "yyyy-MM-dd"));
		}
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					data-empty={!dateValue}
					className={cn(
						"w-full justify-between text-left font-normal",
						"data-[empty=true]:text-muted-foreground",
						className,
					)}
				>
					{dateValue ? (
						format(dateValue, "dd/MM/yyyy")
					) : (
						<span>{placeholder}</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					selected={dateValue}
					onSelect={handleSelect}
					defaultMonth={dateValue}
					initialFocus
				/>
			</PopoverContent>
		</Popover>
	);
}
