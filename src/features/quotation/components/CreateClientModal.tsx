"use client";

import { AlertTriangle, Plus } from "lucide-react";
import { useRef, useState } from "react";

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

type ExistingClient = { id: string; name: string; phone_number: string };

export function CreateClientModal({
	onSuccess,
}: {
	onSuccess?: (clientId: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const [existingClient, setExistingClient] = useState<ExistingClient | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const formRef = useRef<HTMLFormElement>(null);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		formData.set("force", existingClient ? "true" : "false");

		setIsSubmitting(true);
		try {
			const res = await fetch("/api/clients/create", {
				method: "POST",
				body: formData,
			});
			const data = (await res.json().catch(() => ({}))) as {
				success?: boolean;
				clientId?: string;
				alreadyExists?: boolean;
				existing?: ExistingClient;
				error?: string;
			};

			if (data.success) {
				setOpen(false);
				setExistingClient(null);
				formRef.current?.reset();
				if (onSuccess && data.clientId) {
					onSuccess(data.clientId);
				}
				return;
			}

			if (data.alreadyExists && data.existing) {
				setExistingClient(data.existing);
			} else if (data.error) {
				console.error("Failed to create client:", data.error);
			}
		} catch (error) {
			console.error("Failed to create client:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleUseExisting = () => {
		if (!existingClient) return;
		setOpen(false);
		setExistingClient(null);
		onSuccess?.(existingClient.id);
	};

	const handleClose = (next: boolean) => {
		setOpen(next);
		if (!next) setExistingClient(null);
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogTrigger
				render={
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
				}
			/>
			<DialogContent className="sm:max-w-[425px]">
				<form ref={formRef} onSubmit={handleSubmit}>
					<input type="hidden" name="force" value={existingClient ? "true" : "false"} />

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

						{existingClient && (
							<div className="col-span-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-sm">
								<AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
								<div className="space-y-2 flex-1">
									<p className="text-amber-800 dark:text-amber-300">
										A client with this number already exists:{" "}
										<span className="font-semibold">{existingClient.name}</span>
									</p>
									<Button
										type="button"
										size="sm"
										variant="outline"
										className="h-7 text-xs"
										onClick={handleUseExisting}
									>
										Use {existingClient.name}
									</Button>
								</div>
							</div>
						)}
					</div>

					<DialogFooter className="bg-background">
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting
								? "Saving..."
								: existingClient
									? "Create Anyway"
									: "Create Client"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
