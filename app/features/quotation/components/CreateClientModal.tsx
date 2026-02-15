import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export function CreateClientModal({
	onSuccess,
}: {
	onSuccess?: (clientId: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const fetcher = useFetcher();
	const isSubmitting = fetcher.state !== "idle";

	useEffect(() => {
		if (fetcher.state === "idle" && fetcher.data?.success) {
			setOpen(false);
			if (onSuccess && fetcher.data.clientId) {
				onSuccess(fetcher.data.clientId);
			}
		}
	}, [fetcher.state, fetcher.data, onSuccess]);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
					title="Create new client"
				>
					<Plus className="h-4 w-4 mr-1" />
					Create New Client
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<fetcher.Form method="post" action="/resources/create-client">
					<DialogHeader>
						<DialogTitle>Create New Client</DialogTitle>
						<DialogDescription>
							Add a new client to the system quickly.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor="name" className="text-right">
								Name
							</Label>
							<Input
								id="name"
								name="name"
								className="col-span-3"
								placeholder="Client Name"
								required
							/>
						</div>
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor="phone_number" className="text-right">
								Phone
							</Label>
							<Input
								id="phone_number"
								name="phone_number"
								className="col-span-3"
								placeholder="Phone Number"
								required
							/>
						</div>
					</div>
					<DialogFooter>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Saving..." : "Create Client"}
						</Button>
					</DialogFooter>
				</fetcher.Form>
			</DialogContent>
		</Dialog>
	);
}
