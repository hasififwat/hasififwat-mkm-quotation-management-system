import {
  Card,
  CardContent,
  CardTitle,
  CardFooter,
  CardHeader,
} from "~/components/ui/card";

import { ChevronRight } from "lucide-react";

import { Input } from "~/components/ui/input";
import { Controller, useFormContext } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";

import { Button } from "~/components/ui/button";
import { TreeSelect } from "~/components/ui/tree-select";
import type {
  HotelDetails as HotelDetailsType,
  PackageDetailsForm,
} from "~/schema";

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

export default function HotelDetails({
  currentStep,
  goToNextStep,
  goToPreviousStep,
  renderCardHeader,
}: {
  currentStep: string;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  renderCardHeader: (
    title: string,
    description: string,
    stepKey: string,
  ) => React.ReactNode;
}) {
  const { control, setValue, watch } = useFormContext<PackageDetailsForm>();
  const hotelsState = watch("hotels") as {
    makkah: HotelDetailsType;
    madinah: HotelDetailsType;
    taif: HotelDetailsType;
  };

  return (
    <div hidden={currentStep !== "hotels"} className="space-y-4">
      <Card>
        {renderCardHeader(
          "Hotels & Meals",
          "Select hotels for each city and specify included meals.",
          "hotels",
        )}
        <CardContent className="grid grid-cols-1 gap-4">
          {HOTEL_LIST.map((hotelKey) => {
            const hotelData = hotelsState[hotelKey];
            const hotelLabel =
              hotelKey.charAt(0).toUpperCase() + hotelKey.slice(1);

            return (
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
                    setValue(`hotels.${hotelKey}.enabled`, !hotelData.enabled, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
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
                    <Controller
                      name={`hotels.${hotelKey}.name`}
                      control={control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={`hotels.${hotelKey}.name`}>
                            Hotel Name
                          </FieldLabel>
                          <Input
                            {...field}
                            id={`hotels.${hotelKey}.name`}
                            aria-invalid={fieldState.invalid}
                            placeholder={
                              hotelData.placeholder ||
                              `Enter ${hotelLabel} hotel name...`
                            }
                            autoComplete="off"
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      name={`hotels.${hotelKey}.meals`}
                      control={control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={`hotels.${hotelKey}.meals`}>
                            Meals (comma separated)
                          </FieldLabel>
                          <div>
                            <input type="hidden" {...field} />
                            <TreeSelect
                              options={MEAL_OPTIONS}
                              value={field.value as string[]} // Pass RHF value (string[])
                              onChange={field.onChange}
                              placeholder="Select meals included..."
                            />
                          </div>
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
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
  );
}
