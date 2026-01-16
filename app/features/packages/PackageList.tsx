import { useState, useEffect, useCallback } from "react";
import type {
  PackageDetails,
  SupabasePackageDetails,
} from "../quotation/types";
import { useUmrahPackageService } from "@/services/supabase-api/umrah-packages";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  FileText,
} from "lucide-react";
import PackagePreviewModal from "./PackagePreviewModal";

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

  useEffect(() => {
    loadPackages();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this package?")) {
      const result = await deletePackage(id);
      if (result.success) {
        await loadPackages();
      } else {
        alert("Failed to delete package");
      }
    }
  };

  const handleToggleStatus = async (id: string) => {
    const pkg = packages.find((p) => p.id === id);
    if (!pkg) return;

    // Transform to PackageDetails format for saving
    const packageToSave: PackageDetails = {
      id: pkg.id,
      name: pkg.name,
      duration: pkg.duration,
      transport: pkg.transport ?? "",
      status: pkg.status === "published" ? "unpublished" : "published",
      hotels: {
        makkah: pkg.hotels?.makkah
          ? {
              name: pkg.hotels.makkah.name,
              enabled: pkg.hotels.makkah.enabled,
              meals: pkg.hotels.makkah.meals,
              placeholder: pkg.hotels.makkah.placeholder,
            }
          : { name: "", enabled: false, meals: [], placeholder: "" },
        madinah: pkg.hotels?.madinah
          ? {
              name: pkg.hotels.madinah.name,
              enabled: pkg.hotels.madinah.enabled,
              meals: pkg.hotels.madinah.meals,
              placeholder: pkg.hotels.madinah.placeholder,
            }
          : { name: "", enabled: false, meals: [], placeholder: "" },
        taif: pkg.hotels?.taif
          ? {
              name: pkg.hotels.taif.name,
              enabled: pkg.hotels.taif.enabled,
              meals: pkg.hotels.taif.meals,
              placeholder: pkg.hotels.taif.placeholder,
            }
          : { name: "", enabled: false, meals: [], placeholder: "" },
      },
      inclusions: pkg.inclusions
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((i) => i.description),
      exclusions: pkg.exclusions
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((e) => e.description),
      rooms: pkg.rooms.map((r) => ({
        label: r.room_type,
        value: r.price,
        enabled: r.enabled,
      })),
    };

    const result = await savePackage(packageToSave);
    if (result.success) {
      await loadPackages();
    } else {
      alert("Failed to update package status");
    }
  };

  const filteredPackages = packages.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
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
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left p-3 md:p-4 font-semibold text-slate-600">
                      Package Name
                    </th>
                    <th className="hidden md:table-cell text-left p-4 font-semibold text-slate-600">
                      Transport
                    </th>
                    <th className="text-left p-3 md:p-4 font-semibold text-slate-600">
                      Room Prices
                    </th>
                    <th className="hidden sm:table-cell text-left p-4 font-semibold text-slate-600">
                      Status
                    </th>
                    <th className="text-right p-3 md:p-4 font-semibold text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPackages.map((pkg) => {
                    const enabledRooms = pkg.rooms.filter((r) => r.enabled);
                    return (
                      <tr
                        key={pkg.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="p-3 md:p-4">
                          <div className="font-bold text-slate-900 leading-tight">
                            {pkg.name}
                          </div>
                          <div className="text-[10px] md:text-xs text-slate-500">
                            {pkg.duration}
                          </div>
                          <div className="md:hidden mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                            {pkg.transport ? (
                              pkg.transport
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                Not configured
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="hidden md:table-cell p-4 text-slate-600">
                          <div className="flex items-center gap-2">
                            {pkg.transport ? (
                              pkg.transport
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                Not configured
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 md:p-4">
                          <div className="flex flex-col gap-0.5">
                            {enabledRooms.slice(0, 2).map((room) => (
                              <div
                                key={room.id}
                                className="flex items-center gap-1"
                              >
                                <span className="text-[11px] font-bold text-slate-400 uppercase w-12">
                                  {room.room_type}
                                </span>
                                <span className="font-medium">
                                  RM{room.price.toLocaleString()}
                                </span>
                              </div>
                            ))}
                            {enabledRooms.length > 2 && (
                              <span className="text-[11px] text-slate-400">
                                +{enabledRooms.length - 2} more
                              </span>
                            )}
                            {enabledRooms.length === 0 && (
                              <span className="text-[11px] text-slate-400">
                                Not configured
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="hidden sm:table-cell p-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              pkg.status === "published"
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {pkg.status}
                          </span>
                        </td>
                        <td className="p-3 md:p-4 text-right">
                          <div className="flex justify-end gap-0.5 md:gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleToggleStatus(pkg.id)}
                              title={
                                pkg.status === "published"
                                  ? "Unpublish"
                                  : "Publish"
                              }
                            >
                              {pkg.status === "published" ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setPreviewPackage(pkg);
                                setIsPreviewOpen(true);
                              }}
                              title="Preview Package"
                            >
                              <FileText className="w-3.5 h-3.5 text-purple-600" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                // Transform to PackageDetails format for editing
                                const packageToEdit: PackageDetails = {
                                  id: pkg.id,
                                  name: pkg.name,
                                  duration: pkg.duration,
                                  transport: pkg?.transport ?? "",
                                  status: pkg.status,
                                  hotels: {
                                    makkah: pkg.hotels?.makkah || {
                                      name: "",
                                      enabled: false,
                                      meals: [],
                                      placeholder: "",
                                    },
                                    madinah: pkg.hotels?.madinah || {
                                      name: "",
                                      enabled: false,
                                      meals: [],
                                      placeholder: "",
                                    },
                                    taif: pkg.hotels?.taif || {
                                      name: "",
                                      enabled: false,
                                      meals: [],
                                      placeholder: "",
                                    },
                                  },
                                  inclusions: pkg.inclusions
                                    .sort((a, b) => a.sort_order - b.sort_order)
                                    .map((i) => i.description),
                                  exclusions: pkg.exclusions
                                    .sort((a, b) => a.sort_order - b.sort_order)
                                    .map((e) => e.description),
                                  rooms: pkg.rooms.map((r) => ({
                                    label: r.room_type,
                                    value: r.price,
                                    enabled: r.enabled,
                                  })),
                                };
                                onEdit(packageToEdit);
                              }}
                            >
                              <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDelete(pkg.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredPackages.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-12 text-center text-slate-500"
                      >
                        No packages found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
