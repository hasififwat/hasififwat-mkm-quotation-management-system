import type { Dispatch, ReactNode, SetStateAction } from "react";
import { createContext, useContext, useMemo, useState } from "react";
import type { IPackageData } from "~/hooks/useExtractPackage";
import { useExtractPackage } from "~/hooks/useExtractPackage";
import type { IRoomDetailsApi, ISeasonalPricing } from "../schema";

type PackageUploadContextValue = {
	roomTemplates: IRoomDetailsApi[];
	handleFileUpload: (e: React.ChangeEvent<HTMLInputElement> | File) => void;
	fileName: string | null;
	packageData: IPackageData[] | null;
	seasonalPrices: ISeasonalPricing[];
	setSeasonalPrices: Dispatch<SetStateAction<ISeasonalPricing[]>>;
};

const PackageUploadContext = createContext<PackageUploadContextValue | null>(
	null,
);

export function PackageUploadProvider({
	children,
	roomTemplates,
}: {
	children: ReactNode;
	roomTemplates: IRoomDetailsApi[];
}) {
	const { handleFileUpload, fileName, packageData } = useExtractPackage();
	const [seasonalPrices, setSeasonalPrices] = useState<ISeasonalPricing[]>([]);

	const contextValue = useMemo<PackageUploadContextValue>(
		() => ({
			roomTemplates,
			handleFileUpload,
			fileName,
			packageData,
			seasonalPrices,
			setSeasonalPrices,
		}),
		[roomTemplates, handleFileUpload, fileName, packageData, seasonalPrices],
	);

	return (
		<PackageUploadContext.Provider value={contextValue}>
			{children}
		</PackageUploadContext.Provider>
	);
}

export function usePackageUploadContext() {
	const context = useContext(PackageUploadContext);

	if (!context) {
		throw new Error(
			"usePackageUploadContext must be used within PackageUploadProvider",
		);
	}

	return context;
}
