import { useState } from "react";
import { SearchableDropdown } from "@/components/SearchableDropdown";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

import { Label } from "@/components/ui/label";
import type { PackageDetailsForm } from "@/schema";

export function ImportSettingModal({
	renderPreview,
	title,
	description,
	allPackages,
	handleImport,
}: {
	renderPreview: (
		selectedPackage: PackageDetailsForm | null,
	) => React.ReactNode;
	title: string;
	description: string;
	allPackages: PackageDetailsForm[];
	handleImport: (importedData: PackageDetailsForm) => void;
}) {
	const option = allPackages
		.filter((pkg): pkg is PackageDetailsForm & { id: string } =>
			Boolean(pkg.id),
		)
		.map((pkg) => ({
			id: pkg.id,
			name: pkg.name,
			value: pkg.id,
		}));

	const [selectedPackage, setSelectedPackage] =
		useState<PackageDetailsForm | null>(null);

	return (
		<Dialog>
			<div>
				<DialogTrigger render={<Button variant="outline">Import</Button>} />
				<DialogContent className="sm:max-w-106.25">
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
						<DialogDescription>{description}</DialogDescription>
					</DialogHeader>
					<Label htmlFor="name-1">Package Name</Label>
					<SearchableDropdown
						value={selectedPackage?.id ?? ""}
						options={option}
						placeholder="Select a package to import"
						optionValueKey="id"
						optionsLabelKey="name"
						handleSelect={(selectedId) => {
							const selectedPackage = allPackages.find(
								(pkg) => pkg.id === selectedId,
							);
							if (selectedPackage) {
								setSelectedPackage(selectedPackage);
							}
						}}
					/>

					{renderPreview(selectedPackage)}

					<DialogFooter>
						<DialogClose render={<Button variant="outline">Cancel</Button>} />
						<DialogClose
							render={
								<Button
									type="button"
									onClick={() => {
										if (selectedPackage) {
											handleImport(selectedPackage);
										}
									}}
								>
									Import
								</Button>
							}
						/>
					</DialogFooter>
				</DialogContent>
			</div>
		</Dialog>
	);
}
