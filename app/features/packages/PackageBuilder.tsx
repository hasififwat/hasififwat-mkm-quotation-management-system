import React, { useEffect, useState } from "react";
import type { PackageDetails } from "../quotation/types";
import { packageStore } from "./packageStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { TreeSelect } from "@/components/ui/tree-select";
import { Textarea } from "@/components/ui/textarea";
import { Save, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useUmrahPackageService } from "~/services/supabase-api/umrah-packages";
import { useParams } from "react-router";

interface Props {
  editingPackage?: PackageDetails;
  onBack: () => void;
}

type Step = "basic" | "hotels" | "inclusions" | "pricing" | "preview";

const STEPS: { id: Step; label: string }[] = [
  { id: "basic", label: "Basic Details" },
  { id: "hotels", label: "Hotels & Meals" },
  { id: "inclusions", label: "Inclusions & Exclusions" },
  { id: "pricing", label: "Pricing" },
  { id: "preview", label: "Preview" },
];

const HOTEL_LIST = ["makkah", "madinah", "taif"] as const;

const MEAL_OPTIONS = [
  {
    label: "FULLBOARD",
    value: "FULLBOARD",
    nodes: [
      { label: "BREAKFAST", value: "BREAKFAST" },
      { label: "LUNCH", value: "LUNCH" },
      { label: "DINNER", value: "DINNER" },
    ],
  },
] as const;

const ROOM_TYPES = [
  { label: "Double", value: 0, enabled: true },
  { label: "Triple", value: 0, enabled: true },
  { label: "Quad", value: 0, enabled: true },
  { label: "Queen", value: 0, enabled: false },
  { label: "Suite", value: 0, enabled: false },
];

export async function clientLoader() {
  const { pid } = useParams();
  const { getPackageById } = useUmrahPackageService();

  // And/or fetch data on the client
  if (!pid) return null;

  const data = getPackageById(pid);
  // Return the data to expose through useLoaderData()
  return data;
}

const PackageBuilder: React.FC<Props> = ({ editingPackage, onBack }) => {
  const { savePackage } = useUmrahPackageService();
  const { pid } = useParams();

  const [currentStep, setCurrentStep] = useState<Step>("basic");
  const [pkg, setPkg] = useState<PackageDetails>(() => {
    if (editingPackage) {
      return {
        ...editingPackage,
        rooms: editingPackage.rooms || ROOM_TYPES.map((rt) => ({ ...rt })),
      };
    }
    return {
      id: `pkg-${Date.now()}`,
      name: "",
      duration: "",
      hotels: {
        makkah: {
          name: "",
          enabled: true,
          meals: [],
          placeholder:
            "eg: MOVEPICK HOTEL @ SETARAF (+-50 METER DARI DATARAN MASJIDIL HARAM)",
        },
        madinah: {
          name: "",
          enabled: true,
          meals: [],
          placeholder:
            "eg: EMAAR ELITE HOTEL @ SETARAF (+-100 METER DARI DATARAN MASJID NABAWI)",
        },
        taif: {
          name: "",
          enabled: false,
          meals: [],
          placeholder: "eg: IRIS BOUTIQUE HALL @ SETARAF ",
        },
      },
      transport: "",
      inclusions: [],
      exclusions: [],
      rooms: ROOM_TYPES.map((rt) => ({ ...rt })),
      status: "unpublished",
    };
  });

  const [availablePackages] = useState<PackageDetails[]>(packageStore.getAll());

  // State for textarea inputs
  const [inclusionsText, setInclusionsText] = useState<string>(
    editingPackage?.inclusions.join("\n") || ""
  );
  const [exclusionsText, setExclusionsText] = useState<string>(
    editingPackage?.exclusions.join("\n") || ""
  );

  // Update form when editingPackage changes
  useEffect(() => {
    if (editingPackage) {
      setPkg({
        ...editingPackage,
        rooms: editingPackage.rooms || ROOM_TYPES.map((rt) => ({ ...rt })),
      });
      setInclusionsText(editingPackage.inclusions.join("\n"));
      setExclusionsText(editingPackage.exclusions.join("\n"));
    }
  }, [editingPackage]);

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

  const handleSave = async () => {
    try {
      if (!pkg.name || !pkg.duration) {
        alert("Please fill in at least Package Name and Duration.");
        return;
      }

      // Parse textarea content into arrays before saving
      const inclusions = inclusionsText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      const exclusions = exclusionsText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      const packageToSave = {
        ...pkg,
        inclusions,
        exclusions,
      };

      await savePackage(packageToSave);
      onBack();
    } catch (error) {
      console.error("Error saving package:", error);
    }
  };

  const importFromPackage = (
    type: "inclusions" | "exclusions",
    sourcePackageId: string
  ) => {
    const sourcePackage = availablePackages.find(
      (p) => p.id === sourcePackageId
    );
    if (sourcePackage) {
      if (type === "inclusions") {
        const currentItems = inclusionsText ? inclusionsText.split("\n") : [];
        const newItems = [...currentItems, ...sourcePackage.inclusions];
        setInclusionsText(newItems.join("\n"));
      } else {
        const currentItems = exclusionsText ? exclusionsText.split("\n") : [];
        const newItems = [...currentItems, ...sourcePackage.exclusions];
        setExclusionsText(newItems.join("\n"));
      }
    }
  };

  const goToNextStep = () => {
    // Parse textarea content into arrays when leaving inclusions step
    if (currentStep === "inclusions") {
      const inclusions = inclusionsText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      const exclusions = exclusionsText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      setPkg((prev) => ({
        ...prev,
        inclusions,
        exclusions,
      }));
    }

    const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1].id);
    }
  };

  const goToPreviousStep = () => {
    const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id);
    }
  };

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const handleMealChange = (
    hotelKey: (typeof HOTEL_LIST)[number],
    meals: string[]
  ) => {
    setPkg((prev) => ({
      ...prev,
      hotels: {
        ...prev.hotels,
        [hotelKey]: {
          ...prev.hotels[hotelKey],
          meals,
        },
      },
    }));
  };

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6 animate-slideIn">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">
          {pid ? "Edit Package" : "Create Package"}
        </h2>
      </div>

      {/* Step Navigation Header */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex items-center gap-2 transition-colors ${
                    currentStep === step.id
                      ? "text-primary font-semibold"
                      : index < currentStepIndex
                      ? "text-primary hover:text-primary/80"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                      currentStep === step.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : index < currentStepIndex
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground"
                    }`}
                  >
                    {index < currentStepIndex ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span className="text-sm">{index + 1}</span>
                    )}
                  </div>
                  <span className="hidden md:inline text-sm">{step.label}</span>
                </button>
                {index < STEPS.length - 1 && (
                  <Separator className="flex-1 mx-2" />
                )}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <div className="space-y-6">
        {currentStep === "basic" && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Details</CardTitle>
              <CardDescription>
                Package name, duration, and transportation information.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Package Name</Label>
                <Input
                  name="name"
                  value={pkg.name}
                  onChange={handleChange}
                  placeholder="e.g. UMJ STANDARD 2026"
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
                <Label>Transport</Label>
                <Input
                  name="transport"
                  value={pkg.transport}
                  onChange={handleChange}
                  placeholder="e.g. SPEED TRAIN"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="ghost" onClick={onBack}>
                Cancel
              </Button>
              <Button onClick={goToNextStep}>
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {currentStep === "hotels" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Hotels Details</CardTitle>
                <CardDescription>
                  Click on a hotel name to enable or disable it from the
                  package.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4">
                {HOTEL_LIST.map((hotelKey) => {
                  const hotel = pkg.hotels[hotelKey];
                  const hotelLabel =
                    hotelKey.charAt(0).toUpperCase() + hotelKey.slice(1);

                  return (
                    <Card
                      key={hotelKey}
                      className={`cursor-pointer transition-all  ${
                        hotel.enabled ? "" : "opacity-50 py-2"
                      }`}
                    >
                      <CardHeader
                        className="gap-0"
                        onClick={() =>
                          setPkg((prev) => ({
                            ...prev,
                            hotels: {
                              ...prev.hotels,
                              [hotelKey]: {
                                ...prev.hotels[hotelKey],
                                enabled: !prev.hotels[hotelKey].enabled,
                              },
                            },
                          }))
                        }
                      >
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            Hotel {hotelLabel}
                          </CardTitle>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              hotel.enabled
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {hotel.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                      </CardHeader>
                      {hotel.enabled && (
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <Label>Hotel Name</Label>
                            <Input
                              value={hotel.name}
                              onChange={(e) =>
                                setPkg((prev) => ({
                                  ...prev,
                                  hotels: {
                                    ...prev.hotels,
                                    [hotelKey]: {
                                      ...prev.hotels[hotelKey],
                                      name: e.target.value,
                                    },
                                  },
                                }))
                              }
                              placeholder={hotel.placeholder}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Meals</Label>
                            <TreeSelect
                              options={MEAL_OPTIONS}
                              value={hotel.meals}
                              onChange={(meals) =>
                                handleMealChange(hotelKey, meals)
                              }
                              placeholder="Select meals"
                            />
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="ghost" onClick={onBack}>
                  Cancel
                </Button>
                <Button onClick={goToNextStep}>
                  Next <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {currentStep === "inclusions" && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-sm font-bold uppercase tracking-wider">
                  Inclusions
                </CardTitle>
                <div className="flex gap-2">
                  <Select
                    onValueChange={(id) => importFromPackage("inclusions", id)}
                  >
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue placeholder="Import..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePackages
                        .filter((p) => p.id !== pkg.id)
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label>Enter each inclusion on a new line</Label>
                <Textarea
                  value={inclusionsText}
                  onChange={(e) => setInclusionsText(e.target.value)}
                  placeholder="Enter inclusions, one per line..."
                  rows={8}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-sm font-bold uppercase tracking-wider">
                  Exclusions
                </CardTitle>
                <div className="flex gap-2">
                  <Select
                    onValueChange={(id) => importFromPackage("exclusions", id)}
                  >
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue placeholder="Import..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePackages
                        .filter((p) => p.id !== pkg.id)
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label>Enter each exclusion on a new line</Label>
                <Textarea
                  value={exclusionsText}
                  onChange={(e) => setExclusionsText(e.target.value)}
                  placeholder="Enter exclusions, one per line..."
                  rows={8}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>
            <div className="flex justify-between">
              <Button variant="outline" onClick={goToPreviousStep}>
                <ChevronLeft className="w-4 h-4 mr-2" /> Previous
              </Button>
              <Button onClick={goToNextStep}>
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {currentStep === "pricing" && (
          <Card>
            <CardHeader>
              <CardTitle>Pricing (RM)</CardTitle>
              <CardDescription>
                Enable room types and set per-person rates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pkg.rooms.map((room, index) => (
                <div
                  key={room.label}
                  className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${
                    room.enabled ? "bg-background" : "bg-muted/30 opacity-60"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setPkg((prev) => ({
                        ...prev,
                        rooms: prev.rooms.map((r, i) =>
                          i === index ? { ...r, enabled: !r.enabled } : r
                        ),
                      }))
                    }
                    className="flex items-center gap-3 cursor-pointer flex-1 text-left"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        room.enabled
                          ? "bg-green-500 animate-pulse"
                          : "bg-muted-foreground/30"
                      }`}
                    />
                    <span className="font-medium">{room.label}</span>
                  </button>
                  {room.enabled && (
                    <div className="w-full max-w-sm">
                      <Input
                        type="number"
                        value={room.value}
                        onChange={(e) =>
                          setPkg((prev) => ({
                            ...prev,
                            rooms: prev.rooms.map((r, i) =>
                              i === index
                                ? {
                                    ...r,
                                    value: parseFloat(e.target.value) || 0,
                                  }
                                : r
                            ),
                          }))
                        }
                        placeholder="0.00"
                        className="h-9"
                      />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={goToPreviousStep}>
                <ChevronLeft className="w-4 h-4 mr-2" /> Previous
              </Button>
              <Button onClick={goToNextStep}>
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {currentStep === "preview" && (
          <Card>
            <CardHeader>
              <CardTitle>Package Preview</CardTitle>
              <CardDescription>
                Review your package details before saving.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Basic Information</h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Name:</span>{" "}
                    {pkg.name || "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Duration:</span>{" "}
                    {pkg.duration || "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Transport:</span>{" "}
                    {pkg.transport || "—"}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Hotels & Meals</h3>
                <div className="space-y-2 text-sm">
                  {pkg.hotels.makkah.enabled && (
                    <div>
                      <p className="font-medium">Makkah</p>
                      <p className="text-muted-foreground">
                        {pkg.hotels.makkah.name || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Meals:{" "}
                        {pkg.hotels.makkah.meals.length === 0
                          ? "NOT INCLUDED"
                          : pkg.hotels.makkah.meals.join(", ")}
                      </p>
                    </div>
                  )}
                  {pkg.hotels.madinah.enabled && (
                    <div>
                      <p className="font-medium">Madinah</p>
                      <p className="text-muted-foreground">
                        {pkg.hotels.madinah.name || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Meals:{" "}
                        {pkg.hotels.madinah.meals.length === 0
                          ? "NOT INCLUDED"
                          : pkg.hotels.madinah.meals.join(", ")}
                      </p>
                    </div>
                  )}
                  {pkg.hotels.taif.enabled && (
                    <div>
                      <p className="font-medium">Taif</p>
                      <p className="text-muted-foreground">
                        {pkg.hotels.taif.name || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Meals:{" "}
                        {pkg.hotels.taif.meals.length === 0
                          ? "NOT INCLUDED"
                          : pkg.hotels.taif.meals.join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Inclusions</h3>
                {pkg.inclusions.length > 0 ? (
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {pkg.inclusions.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No inclusions added
                  </p>
                )}
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Exclusions</h3>
                {pkg.exclusions.length > 0 ? (
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {pkg.exclusions.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No exclusions added
                  </p>
                )}
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Pricing (RM)</h3>
                {pkg.rooms.filter((room) => room.enabled).length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    {pkg.rooms
                      .filter((room) => room.enabled)
                      .map((room) => (
                        <div key={room.label}>
                          <p className="text-muted-foreground">{room.label}</p>
                          <p className="text-lg font-semibold">
                            RM {room.value.toFixed(2)}
                          </p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No room types enabled
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={goToPreviousStep}>
                <ChevronLeft className="w-4 h-4 mr-2" /> Previous
              </Button>
              <Button className="gap-2" onClick={handleSave}>
                <Save className="w-4 h-4" /> Save Package
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PackageBuilder;
