"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { CreateClientForm } from "~/features/clients/CreateClientForm";

export default function ClientCreatePage() {
	const router = useRouter();

	return (
		<div className="col-span-12 mx-auto w-full max-w-lg space-y-6 p-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">New Client</h1>
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
