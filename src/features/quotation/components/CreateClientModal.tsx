"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { CreateClientForm } from "~/features/clients/CreateClientForm";

export function CreateClientModal({
	onSuccess,
}: {
	onSuccess?: (clientId: string) => void;
}) {
	const [open, setOpen] = useState(false);
	return (
		<Dialog open={open} onOpenChange={setOpen}>
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
				<DialogHeader>
					<DialogTitle>Create New Client</DialogTitle>
					<DialogDescription>
						Add a new client to the system quickly.
					</DialogDescription>
				</DialogHeader>
				{open && (
					<CreateClientForm
						onSuccess={(clientId) => {
							setOpen(false);
							onSuccess?.(clientId);
						}}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}
