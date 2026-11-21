"use client";

import { AlertTriangle } from "lucide-react";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type { ClientSummary } from "./types";

type ExistingClient = ClientSummary & { phone_number: string };

export function CreateClientForm({
	onSuccess,
}: {
	onSuccess: (client: ClientSummary) => void;
}) {
	const [existingClient, setExistingClient] = useState<ExistingClient | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const saveClient = async (form: HTMLFormElement, force: boolean) => {
		if (isSubmitting) return;
		const formData = new FormData(form);
		formData.set("force", String(force));
		setError(null);
		setIsSubmitting(true);

		try {
			const res = await fetch("/api/clients/create", {
				method: "POST",
				body: formData,
			});
			const data = (await res.json()) as {
				success?: boolean;
				client?: ClientSummary;
				alreadyExists?: boolean;
				existing?: ExistingClient;
				error?: string;
			};

			if (
				res.ok &&
				data.success &&
				data.client &&
				typeof data.client.id === "string" &&
				typeof data.client.name === "string"
			) {
				onSuccess(data.client);
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
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				if (!existingClient) return saveClient(event.currentTarget, false);
			}}
			onKeyDown={(event) => {
				if (event.key === "Enter") event.stopPropagation();
			}}
			onChange={() => setExistingClient(null)}
			className="min-w-0 space-y-4"
		>
			<fieldset disabled={isSubmitting} className="grid min-w-0 grid-cols-1 gap-4">
				<div className="grid gap-2">
					<Label htmlFor="name">Name</Label>
					<Input id="name" name="name" placeholder="Client Name" required />
				</div>
				<div className="grid grid-cols-1 gap-2">
					<Label htmlFor="phone_number">Phone</Label>
					<Input
						id="phone_number"
						name="phone_number"
						type="tel"
						placeholder="Phone Number"
						required
					/>
					{existingClient && (
						<div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
							<AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
							<p role="alert" className="min-w-0 wrap-anywhere text-amber-800 dark:text-amber-300">
								This phone number already belongs to{" "}
								<span className="font-semibold">{existingClient.name}</span>.
							</p>
						</div>
					)}
				</div>
			</fieldset>
			{error && (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			)}
			<div className="flex flex-wrap justify-end gap-2">
				{existingClient ? (
					<>
						<Button type="button" disabled={isSubmitting} onClick={() => onSuccess(existingClient)}>
							Use existing client
						</Button>
						<Button
							type="button"
							variant="outline"
							disabled={isSubmitting}
							onClick={(event) => {
								const form = event.currentTarget.form;
								if (form?.reportValidity()) return saveClient(form, true);
							}}
						>
							{isSubmitting ? "Saving..." : "Create Anyway"}
						</Button>
					</>
				) : (
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? "Saving..." : "Create Client"}
					</Button>
				)}
			</div>
		</form>
	);
}
