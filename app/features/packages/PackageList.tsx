import { useState, useEffect, useCallback } from "react";
import type {
  PackageDetails,
  SupabasePackageDetails,
} from "../quotation/types";
import { useUmrahPackageService } from "@/services/supabase-api/umrah-packages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Search, Plus, Copy } from "lucide-react";
import PackagePreviewModal from "./PackagePreviewModal";

import { DataTable } from "../packages/PackageListTable/data-table";
import { columns } from "../packages/PackageListTable/columns";
import { useNavigate } from "react-router";

interface Props {
  onEdit: (pkg: PackageDetails) => void;
  onAdd: () => void;
}

const PackageList: React.FC<Props> = ({ onEdit, onAdd }) => {
  const [packages, setPackages] = useState<SupabasePackageDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewPackage, setPreviewPackage] =
    useState<SupabasePackageDetails | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const { getAllPackages, deletePackage, savePackage } =
    useUmrahPackageService();

  const loadPackages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllPackages();
      setPackages(data);
    } catch (err) {
      setError("Failed to load packages");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [getAllPackages]);

  const handlePreviewPckg = (pkg: SupabasePackageDetails) => {
    setPreviewPackage(pkg);
    setIsPreviewOpen(true);
  };

  const nav = useNavigate();

  const handleEditPckg = (pkg: SupabasePackageDetails) => {
    // Transform to PackageDetails format for editing
    // const packageToEdit: PackageDetails = {
    //   id: pkg.id,
    //   name: pkg.name,
    //   duration: pkg.duration,
    //   transport: pkg?.transport ?? "",
    //   status: pkg.status,
    //   hotels: {
    //     makkah: pkg.hotels?.makkah || {
    //       name: "",
    //       enabled: false,
    //       meals: [],
    //       placeholder: "",
    //     },
    //     madinah: pkg.hotels?.madinah || {
    //       name: "",
    //       enabled: false,
    //       meals: [],
    //       placeholder: "",
    //     },
    //     taif: pkg.hotels?.taif || {
    //       name: "",
    //       enabled: false,
    //       meals: [],
    //       placeholder: "",
    //     },
    //   },
    //   inclusions: pkg.inclusions
    //     .sort((a, b) => a.sort_order - b.sort_order)
    //     .map((i) => i.description),
    //   exclusions: pkg.exclusions
    //     .sort((a, b) => a.sort_order - b.sort_order)
    //     .map((e) => e.description),
    //   rooms: pkg.rooms.map((r) => ({
    //     label: r.room_type,
    //     value: r.price,
    //     enabled: r.enabled,
    //   })),
    // };
    // onEdit(packageToEdit);
    nav(`/packages/edit/${pkg.id}`);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: <just want to run this on mount>
  useEffect(() => {
    loadPackages();
  }, []);

  const filteredPackages = packages.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-4 md:space-y-6 animate-fadeIn pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            Travel Packages
          </h2>
          <p className="text-slate-500 text-xs md:text-sm">
            Manage your Umrah offerings and custom travel bundles.
          </p>
        </div>
        <Button onClick={onAdd} className="w-full md:w-auto gap-2">
          <Plus className="w-4 h-4" /> Add New Package
        </Button>
      </div>

      {loading && (
        <Card>
          <CardContent className="p-12 text-center text-slate-500">
            Loading packages...
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="p-12 text-center text-red-500">
            {error}
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <Card className="overflow-hidden">
          <CardHeader className="p-4 md:p-6 pb-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by package name..."
                className="pl-9 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={packages}
              handlePreview={handlePreviewPckg}
              handleEdit={handleEditPckg}
            />
          </CardContent>
        </Card>
      )}

      {/* Preview Modal */}
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
