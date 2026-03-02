import type { api } from "convex/_generated/api";
import type { FunctionReturnType } from "node_modules/convex/dist/esm-types/server/api";
import { useCallback, useState } from "react";
import { columns } from "./components/PackageListTable/columns";
import { DataTable } from "./components/PackageListTable/data-table";
import PackagePreviewModal from "./PackagePreviewModal";

interface Props {
	data: FunctionReturnType<typeof api.packages.listWithRooms>; // Receives data from parent
	isLoading?: boolean;
}

type PackageWithRooms = FunctionReturnType<
	typeof api.packages.listWithRooms
>[number];

const PackageList: React.FC<Props> = ({ data, isLoading = false }) => {
	// ✅ Only UI State remains (Modal)
	const [previewPackage, setPreviewPackage] = useState<PackageWithRooms | null>(
		null,
	);
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);

	const handlePreviewPckg = useCallback((pkg: PackageWithRooms) => {
		console.log("Previewing package:", pkg); // Debug log to verify package data
		setPreviewPackage(pkg);
		setIsPreviewOpen(true);
	}, []);

	return (
		<div>
			<DataTable
				columns={columns}
				data={data}
				handlePreview={handlePreviewPckg}
				isLoading={isLoading}
			/>

			{/* Preview Modal Logic */}
			{previewPackage && (
				<PackagePreviewModal
					pkg={previewPackage}
					open={isPreviewOpen}
					onOpenChange={setIsPreviewOpen}
				/>
			)}
		</div>
	);
};

export default PackageList;
