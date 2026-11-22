"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { CreateClientForm } from "~/features/clients/CreateClientForm";

export default function ClientCreatePage() {
	const router = useRouter();

	return (
		<div className="workspace-page max-w-lg space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="wrap-anywhere text-xl font-bold tracking-tight md:text-2xl">New Client</h1>
				<Link href="/clients" className="text-sm underline">
					Cancel
				</Link>
			</div>
			<CreateClientForm
				onSuccess={() => {
					router.push("/clients");
					router.refresh();
				}}
			/>
		</div>
	);
}
