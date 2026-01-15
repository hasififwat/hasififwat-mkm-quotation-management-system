import React, { useState, useEffect } from "react";
import { packageStore } from "./packageStore";
import type { PackageDetails } from "../quotation/types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import { Search, Plus, Edit2, Trash2, Eye, EyeOff, Plane } from "lucide-react";

interface Props {
  onEdit: (pkg: PackageDetails) => void;
  onAdd: () => void;
}

const PackageList: React.FC<Props> = ({ onEdit, onAdd }) => {
  const [packages, setPackages] = useState<PackageDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setPackages(packageStore.getAll());
  }, []);

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this package?")) {
      packageStore.delete(id);
      setPackages(packageStore.getAll());
    }
  };

  const handleToggleStatus = (id: string) => {
    packageStore.toggleStatus(id);
    setPackages(packageStore.getAll());
  };

  const filteredPackages = packages.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.flightType.toLowerCase().includes(searchTerm.toLowerCase())
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

      <Card className="overflow-hidden">
        <CardHeader className="p-4 md:p-6 pb-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name or airline..."
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
                    Flight
                  </th>
                  <th className="text-left p-3 md:p-4 font-semibold text-slate-600">
                    Pricing
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
                {filteredPackages.map((pkg) => (
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
                        <Plane className="w-2.5 h-2.5" /> {pkg.flightType}
                      </div>
                    </td>
                    <td className="hidden md:table-cell p-4 text-slate-600">
                      <div className="flex items-center gap-2">
                        <Plane className="w-3 h-3" /> {pkg.flightType}
                      </div>
                    </td>
                    <td className="p-3 md:p-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase w-3">
                            Q
                          </span>
                          <span className="font-medium">
                            RM{pkg.priceQuad.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase w-3">
                            T
                          </span>
                          <span className="text-slate-500">
                            RM{pkg.priceTriple.toLocaleString()}
                          </span>
                        </div>
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
                            pkg.status === "published" ? "Unpublish" : "Publish"
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
                          onClick={() => onEdit(pkg)}
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
                ))}
                {filteredPackages.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500">
                      No packages found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PackageList;
