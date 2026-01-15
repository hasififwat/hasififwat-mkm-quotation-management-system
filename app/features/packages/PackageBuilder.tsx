import React, { useState } from "react";
import type { PackageDetails } from "../quotation/types";
import { packageStore } from "./packageStore";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "../../components/ui/card";
import { X, Plus, Save, ChevronLeft } from "lucide-react";

interface Props {
  editingPackage?: PackageDetails;
  onBack: () => void;
}

const PackageBuilder: React.FC<Props> = ({ editingPackage, onBack }) => {
  const [pkg, setPkg] = useState<PackageDetails>(
    editingPackage || {
      id: `pkg-${Date.now()}`,
      name: "",
      flightType: "",
      duration: "",
      hotelMakkah: "",
      hotelMadinah: "",
      hotelTaif: "N/A",
      meals: "",
      transport: "",
      inclusions: [],
      exclusions: [],
      priceDouble: 0,
      priceTriple: 0,
      priceQuad: 0,
      status: "unpublished",
    }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPkg((prev) => ({
      ...prev,
      [name]: name.startsWith("price")
        ? value === ""
          ? 0
          : parseFloat(value)
        : value,
    }));
  };

  const handleListChange = (
    type: "inclusions" | "exclusions",
    index: number,
    value: string
  ) => {
    const newList = [...pkg[type]];
    newList[index] = value;
    setPkg((prev) => ({ ...prev, [type]: newList }));
  };

  const addListItem = (type: "inclusions" | "exclusions") => {
    setPkg((prev) => ({ ...prev, [type]: [...prev[type], ""] }));
  };

  const removeListItem = (type: "inclusions" | "exclusions", index: number) => {
    setPkg((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  };

  const handleSave = () => {
    if (!pkg.name || !pkg.flightType) {
      alert("Please fill in at least Package Name and Flight Type.");
      return;
    }
    packageStore.save(pkg);
    onBack();
  };

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6 animate-slideIn">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">
          {editingPackage ? "Edit Package" : "Create Package"}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Basic Info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Details</CardTitle>
              <CardDescription>
                Flight, hotels and general itinerary information.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Package Name</Label>
                <Input
                  name="name"
                  value={pkg.name}
                  onChange={handleChange}
                  placeholder="e.g. UMJ STANDARD 2026"
                />
              </div>
              <div className="space-y-2">
                <Label>Flight Type/Airline</Label>
                <Input
                  name="flightType"
                  value={pkg.flightType}
                  onChange={handleChange}
                  placeholder="e.g. MALAYSIA AIRLINES"
                />
              </div>
              <div className="space-y-2">
                <Label>Duration String</Label>
                <Input
                  name="duration"
                  value={pkg.duration}
                  onChange={handleChange}
                  placeholder="e.g. 12 HARI 10 MALAM"
                />
              </div>
              <div className="space-y-2">
                <Label>Hotel Makkah</Label>
                <Input
                  name="hotelMakkah"
                  value={pkg.hotelMakkah}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label>Hotel Madinah</Label>
                <Input
                  name="hotelMadinah"
                  value={pkg.hotelMadinah}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label>Meals</Label>
                <Input
                  name="meals"
                  value={pkg.meals}
                  onChange={handleChange}
                  placeholder="e.g. FULLBOARD"
                />
              </div>
              <div className="space-y-2">
                <Label>Transport</Label>
                <Input
                  name="transport"
                  value={pkg.transport}
                  onChange={handleChange}
                  placeholder="e.g. SPEED TRAIN"
                />
              </div>
            </CardContent>
          </Card>

          {/* Inclusions / Exclusions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider">
                  Inclusions
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => addListItem("inclusions")}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {pkg.inclusions.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) =>
                        handleListChange("inclusions", i, e.target.value)
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeListItem("inclusions", i)}
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider">
                  Exclusions
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => addListItem("exclusions")}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {pkg.exclusions.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) =>
                        handleListChange("exclusions", i, e.target.value)
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeListItem("exclusions", i)}
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Pricing Sidebar */}
        <div className="space-y-6">
          <Card className="border-slate-900/10 shadow-lg">
            <CardHeader>
              <CardTitle>Pricing (RM)</CardTitle>
              <CardDescription>
                Set per-person rates for each room type.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Double Room (2 Pax)</Label>
                <Input
                  type="number"
                  name="priceDouble"
                  value={pkg.priceDouble}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label>Triple Room (3 Pax)</Label>
                <Input
                  type="number"
                  name="priceTriple"
                  value={pkg.priceTriple}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label>Quad Room (4 Pax)</Label>
                <Input
                  type="number"
                  name="priceQuad"
                  value={pkg.priceQuad}
                  onChange={handleChange}
                />
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button className="w-full gap-2" onClick={handleSave}>
                <Save className="w-4 h-4" /> Save Package
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm">Summary Preview</CardTitle>
            </CardHeader>
            <CardContent className="text-xs p-4 pt-0 space-y-2 text-slate-500">
              <p>
                This package will be saved as <strong>{pkg.status}</strong> by
                default. You can publish it in the list view to make it
                available for quotations.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PackageBuilder;
