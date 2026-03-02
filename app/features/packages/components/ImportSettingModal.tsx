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
import type { IPackageDetails } from "~/features/packages/schema";

export function ImportSettingModal({
	renderPreview,
	title,
	description,
	triggerLabel,
	allPackages,
	handleImport,
}: {
	renderPreview: (selectedPackage: IPackageDetails | null) => React.ReactNode;
	title: string;
	description: string;
	triggerLabel?: string;
	allPackages: IPackageDetails[];
	handleImport: (importedData: IPackageDetails) => void;
}) {
	const option = allPackages
		.filter((pkg): pkg is IPackageDetails & { _id: string } =>
			Boolean(pkg._id),
		)
		.map((pkg) => ({
			id: pkg._id,
			name: pkg.name,
			value: pkg._id,
		}));

	const [selectedPackage, setSelectedPackage] =
		useState<IPackageDetails | null>(null);

	return (
		<Dialog>
			<div>
				<DialogTrigger
					render={<Button variant="outline">{triggerLabel ?? "Import"}</Button>}
				/>
				<DialogContent className="sm:max-w-106.25">
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
						<DialogDescription>{description}</DialogDescription>
					</DialogHeader>
					<Label htmlFor="name-1">Package Name</Label>
					<SearchableDropdown
						value={selectedPackage?._id ?? ""}
						options={option}
						placeholder="Select a package to import"
						optionValueKey="id"
						optionsLabelKey="name"
						handleSelect={(selectedId) => {
							const selectedPackage = allPackages.find(
								(pkg) => pkg._id === selectedId,
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
