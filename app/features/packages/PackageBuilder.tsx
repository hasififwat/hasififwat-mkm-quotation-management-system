import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Form, Link } from "react-router";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Separator } from "@/components/ui/separator";
import { TreeSelect } from "@/components/ui/tree-select";
import { Textarea } from "@/components/ui/textarea";
import { Save, ChevronLeft, ChevronRight } from "lucide-react";

import { useForm, FormProvider, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  packageDetailsSchema,
  type HotelDetails,
  type PackageDetailsForm,
} from "@/schema";

import { useLoaderData, useParams } from "react-router";

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

const PackageBuilder: React.FC = () => {
  const { initialData } = useLoaderData();
  const { pid } = useParams();

  // 1. Initialize Hook Form
  const methods = useForm<PackageDetailsForm>({
    resolver: zodResolver(packageDetailsSchema),
    defaultValues: initialData,
    mode: "onChange",
  });

  const { control, watch, setValue, getValues } = methods;

  const hotelsState = watch("hotels") as {
    makkah: HotelDetails;
    madinah: HotelDetails;
    taif: HotelDetails;
  };

  const { fields } = useFieldArray({
    control,
    name: "rooms", // Matches your schema key
  });

  const [currentStep, setCurrentStep] = useState<Step>("basic");

  const goToNextStep = () => {
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

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6 animate-slideIn">
      <div className="flex items-center gap-4">
        <Link to="/packages" className="text-sm text-muted-foreground">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => goToPreviousStep("exit")}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
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
                    currentStep === step.id && "text-primary font-semibold"
                    // : index < currentStepIndex
                    //   ? "text-primary hover:text-primary/80"
                    //   : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                      currentStep === step.id &&
                      "border-primary bg-primary text-primary-foreground"
                      // ? ""
                      // : index < currentStepIndex
                      //   ? "border-primary bg-primary text-primary-foreground"
                      //   : "border-muted-foreground"
                    }`}
                  >
                    <span className="text-sm">{index + 1}</span>
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

      <Form method="post" className="space-y-6">
        <FormProvider {...methods}>
          <Card hidden={currentStep !== "basic"}>
            <CardHeader>
              <CardTitle>Basic Details</CardTitle>
              <CardDescription>
                Package name, duration, and transportation information.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4">
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package Name</FormLabel>
                    <FormControl>
                      <div>
                        <input type="hidden" name="id" value={pid} />
                        <Input
                          placeholder="e.g. UMJ STANDARD 2026"
                          {...field}
                          name="name"
                        />
                      </div>
                    </FormControl>
                    {/* This automatically shows Zod error messages */}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration String</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 12 HARI 10 MALAM" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Link to="/packages" className="text-sm text-muted-foreground">
                <Button variant="ghost">Cancel</Button>
              </Link>

              <Button onClick={goToNextStep}>
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>

          <div hidden={currentStep !== "hotels"} className="space-y-4">
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
                  // 2. Get the specific hotel data from the watched state
                  const hotelData = hotelsState[hotelKey];
                  const hotelLabel =
                    hotelKey.charAt(0).toUpperCase() + hotelKey.slice(1);

                  return (
                    // <div key={hotelKey}> {JSON.stringify(hotelData)}</div>
                    <Card
                      key={hotelKey}
                      className={`transition-all duration-200  ${
                        hotelData.enabled
                          ? "py-4" // Active styles
                          : "py-2 opacity-60 " // Inactive styles
                      }`}
                    >
                      {/* --- TOGGLE HEADER --- */}
                      <CardHeader
                        className="cursor-pointer select-none py-0 gap-0"
                        onClick={() => {
                          // 3. Update the boolean value in RHF
                          setValue(
                            `hotels.${hotelKey}.enabled`,
                            !hotelData.enabled,
                            {
                              shouldDirty: true,
                              shouldValidate: true,
                            },
                          );
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-semibold">
                            Hotel {hotelLabel}
                          </CardTitle>
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-medium transition-colors ${
                              hotelData.enabled
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {hotelData.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                      </CardHeader>

                      {/* --- FORM CONTENT (Only show if enabled) --- */}
                      {hotelData.enabled && (
                        <CardContent className="space-y-4 animate-in slide-in-from-top-1 fade-in duration-200 ">
                          {/* 4. HOTEL NAME INPUT */}
                          <FormField
                            control={control}
                            // Dynamic path: hotels.makkah.name
                            name={`hotels.${hotelKey}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Hotel Name</FormLabel>
                                <FormControl>
                                  <div>
                                    <input
                                      type="hidden"
                                      name={`hotels.${hotelKey}.id`}
                                      value={hotelData?.id}
                                    />
                                    <Input
                                      placeholder={
                                        hotelData.placeholder ||
                                        `Enter ${hotelLabel} hotel name...`
                                      }
                                      {...field}
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* 5. MEALS SELECTOR */}
                          <FormField
                            control={control}
                            // Dynamic path: hotels.makkah.meals
                            name={`hotels.${hotelKey}.meals`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Meals</FormLabel>
                                <FormControl>
                                  {/** biome-ignore lint/complexity/noUselessFragments: <need this for hidden input> */}
                                  <div>
                                    <input type="hidden" {...field} />
                                    <TreeSelect
                                      options={MEAL_OPTIONS}
                                      value={field.value as string[]} // Pass RHF value (string[])
                                      onChange={field.onChange}
                                      placeholder="Select meals included..."
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="ghost" onClick={goToPreviousStep}>
                  Previous
                </Button>
                <Button onClick={goToNextStep}>
                  Next <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div hidden={currentStep !== "inclusions"} className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 ">
                <CardTitle className="text-sm font-bold uppercase tracking-wider">
                  Inclusions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <FormField
                  control={control}
                  // Dynamic path: hotels.makkah.name
                  name={`inclusions`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="inclusion">
                        Enter each inclusion on a new line
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          id="inclusion"
                          name="inclusions"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          placeholder="Enter inclusions, one per line..."
                          rows={12}
                          className="font-mono text-sm"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 ">
                <CardTitle className="text-sm font-bold uppercase tracking-wider">
                  Exclusions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <FormField
                  control={control}
                  // Dynamic path: hotels.makkah.name
                  name={`exclusions`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="exclusion">
                        Enter each exclusion on a new line
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          id="exclusion"
                          name="exclusions"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          placeholder="Enter exclusions, one per line..."
                          rows={12}
                          className="font-mono text-sm"
                        />
                      </FormControl>
                    </FormItem>
                  )}
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

          <Card hidden={currentStep !== "pricing"}>
            <CardHeader>
              <CardTitle>Pricing (RM)</CardTitle>
              <CardDescription>
                Enable room types and set per-person rates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {fields.map((field, index) => {
                return (
                  <div key={field.id}>
                    {/* We wrap the whole row in the "Enabled" controller logic */}
                    <FormField
                      control={control}
                      name={`rooms.${index}.enabled`}
                      render={({ field: enabledField }) => (
                        <FormItem>
                          <FormControl>
                            <div
                              className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${
                                enabledField.value
                                  ? "bg-background"
                                  : "bg-muted/30 opacity-60"
                              }`}
                            >
                              <input
                                type="hidden"
                                name={`rooms.${index}.enabled`}
                                value={enabledField.value ? "true" : "false"}
                              />
                              <input
                                type="hidden"
                                name={`rooms.${index}.id`}
                                value={field.id}
                              />
                              {/* TOGGLE BUTTON */}
                              <button
                                type="button"
                                // 2. Simply toggle the boolean value
                                onClick={() =>
                                  enabledField.onChange(!enabledField.value)
                                }
                                className="flex items-center gap-3 cursor-pointer flex-1 text-left"
                              >
                                <span
                                  className={`w-2 h-2 rounded-full transition-colors ${
                                    enabledField.value
                                      ? "bg-green-500 animate-pulse"
                                      : "bg-muted-foreground/30"
                                  }`}
                                />
                                <span className="font-medium capitalize">
                                  {field.room_type}
                                </span>
                              </button>

                              {/* PRICE INPUT */}
                              {/* Only render if enabled. Note: We use a nested FormField for the price */}
                              {enabledField.value && (
                                <FormField
                                  control={control}
                                  // 3. Bind specifically to the 'price' (price) property
                                  name={`rooms.${index}.price`}
                                  render={({ field: priceField }) => (
                                    <div className="w-full max-w-[140px]">
                                      <Input
                                        {...priceField}
                                        type="number"
                                        placeholder="0.00"
                                        className="h-9 text-right"
                                        // Prevent closing the toggle when clicking input
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                  )}
                                />
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                );
              })}
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
                      {getValues("name") || "—"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Duration:</span>{" "}
                      {getValues("duration") || "—"}
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Hotels & Meals</h3>
                  <div className="space-y-2 text-sm">
                    {HOTEL_LIST.map((hotelKey) => {
                      const pkg = getValues();

                      return (
                        pkg.hotels[hotelKey].enabled && (
                          <div key={hotelKey}>
                            <p className="font-medium">
                              {hotelKey.charAt(0).toUpperCase() +
                                hotelKey.slice(1)}
                            </p>
                            <p className="text-muted-foreground">
                              {pkg.hotels[hotelKey].name || "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Meals:{" "}
                              {pkg.hotels[hotelKey]?.meals?.length === 0
                                ? "NOT INCLUDED"
                                : pkg.hotels[hotelKey]?.meals?.length === 2
                                  ? "HALFBOARD"
                                  : pkg.hotels[hotelKey]?.meals?.length === 3
                                    ? "FULLBOARD"
                                    : pkg.hotels[hotelKey]?.meals
                                        ?.map((meal) => meal)
                                        .join(", ")}
                            </p>
                          </div>
                        )
                      );
                    })}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Inclusions</h3>
                  {getValues("inclusions").length > 0 ? (
                    <ul className="list-disc list-inside text-sm space-y-1 ">
                      {getValues("inclusions")
                        .split("\n")
                        .map((line, i) => (
                          <li key={line}>{line}</li>
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
                  {getValues("exclusions").length > 0 ? (
                    <ul className="list-disc list-inside text-sm space-y-1 ">
                      {getValues("exclusions")
                        .split("\n")
                        .map((line, i) => (
                          <li key={line}>{line}</li>
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
                  {getValues("rooms").filter((room) => room.enabled).length >
                  0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      {getValues("rooms")
                        .filter((room) => room.enabled)
                        .map((room) => (
                          <div key={room.room_type} className="space-y-1">
                            <p className="text-muted-foreground">
                              {room.room_type}
                            </p>
                            <p className="text-lg font-semibold">
                              RM {room.price.toLocaleString("en-US")}
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
                <Button className="gap-2 " type="submit">
                  <Save className="w-4 h-4" /> Save Package
                </Button>
              </CardFooter>
            </Card>
          )}
        </FormProvider>
      </Form>
    </div>
  );
};

export default PackageBuilder;
