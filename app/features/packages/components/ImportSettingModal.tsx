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
	children: button,
	renderPreview,
	title,
	description,
	allPackages,
	handleImport,
}: {
	children: React.ReactNode;
	renderPreview: (
		selectedPackage: PackageDetailsForm | null,
	) => React.ReactNode;
	title: string;
	description: string;
	allPackages: PackageDetailsForm[];
	handleImport: (importedData: PackageDetailsForm) => void;
}) {
	const option = allPackages.map((pkg) => ({
		id: pkg.id,
		name: pkg.name,
		value: pkg.id,
	}));

	const [selectedPackage, setSelectedPackage] =
		useState<PackageDetailsForm | null>(null);

	return (
		<Dialog>
			<div>
				<DialogTrigger asChild>
					{/* Trigger Button */}
					{button}
				</DialogTrigger>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
						<DialogDescription>{description}</DialogDescription>
					</DialogHeader>
					<Label htmlFor="name-1">Package Name</Label>
					<SearchableDropdown
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
						<DialogClose asChild>
							<Button variant="outline">Cancel</Button>
						</DialogClose>
						<DialogClose asChild>
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
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</div>
		</Dialog>
	);
}
