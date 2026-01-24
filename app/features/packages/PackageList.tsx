import { useState } from "react";

import type { SupabasePackageDetails } from "~/features/quotation/types";
import PackagePreviewModal from "./PackagePreviewModal";
import { DataTable } from "./components/PackageListTable/data-table";
import { columns } from "./components/PackageListTable/columns";

interface Props {
  data: SupabasePackageDetails[]; // Receives data from parent
}

const PackageList: React.FC<Props> = ({ data }) => {
  // ✅ Only UI State remains (Modal)
  const [previewPackage, setPreviewPackage] =
    useState<SupabasePackageDetails | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handlePreviewPckg = (pkg: SupabasePackageDetails) => {
    setPreviewPackage(pkg);
    setIsPreviewOpen(true);
  };

  return (
    <div>
      <DataTable
        columns={columns}
        data={data}
        handlePreview={handlePreviewPckg}
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
