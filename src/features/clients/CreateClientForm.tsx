"use client";

import { AlertTriangle } from "lucide-react";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

type ExistingClient = { id: string; name: string; phone_number: string };

export function CreateClientForm({
	onSuccess,
}: {
	onSuccess: (clientId: string) => void;
}) {
	const [existingClient, setExistingClient] = useState<ExistingClient | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (isSubmitting) return;
		const formData = new FormData(event.currentTarget);
		formData.set("force", existingClient ? "true" : "false");
		setError(null);
		setIsSubmitting(true);

		try {
			const res = await fetch("/api/clients/create", {
				method: "POST",
				body: formData,
			});
			const data = (await res.json()) as {
				success?: boolean;
				clientId?: string;
				alreadyExists?: boolean;
				existing?: ExistingClient;
				error?: string;
			};

			if (res.ok && data.success && typeof data.clientId === "string") {
				onSuccess(data.clientId);
				return;
			}

			if (
				res.ok &&
				data.alreadyExists &&
				data.existing &&
				typeof data.existing.id === "string" &&
				typeof data.existing.name === "string"
			) {
				setExistingClient(data.existing);
			} else {
				setError(
					typeof data.error === "string"
						? data.error
						: "Failed to create client. Please try again.",
				);
			}
		} catch {
			setError("Failed to create client. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form
			onSubmit={handleSubmit}
			onChange={() => setExistingClient(null)}
			className="space-y-4"
		>
			<fieldset disabled={isSubmitting} className="grid gap-4">
				<div className="grid gap-2">
					<Label htmlFor="name">Name</Label>
					<Input id="name" name="name" placeholder="Client Name" required />
				</div>
				<div className="grid gap-2">
					<Label htmlFor="phone_number">Phone</Label>
					<Input
						id="phone_number"
						name="phone_number"
						type="tel"
						placeholder="Phone Number"
						required
					/>
				</div>
				{existingClient && (
					<div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-sm">
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
								onClick={() => onSuccess(existingClient.id)}
							>
								Use {existingClient.name}
							</Button>
						</div>
					</div>
				)}
			</fieldset>
			{error && (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			)}
			<div className="flex justify-end">
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting
						? "Saving..."
						: existingClient
							? "Create Anyway"
							: "Create Client"}
				</Button>
			</div>
		</form>
	);
}
