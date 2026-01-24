import { Card, CardContent } from "~/components/ui/card";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Controller, useFormContext } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";

import { Button } from "~/components/ui/button";

import { Textarea } from "~/components/ui/textarea";

export default function ExclusionInclusionDetails({
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
    settingKey:
      | "inclusions"
      | "exclusions"
      | "name"
      | "id"
      | "status"
      | "duration"
      | "hotels"
      | "rooms",
  ) => React.ReactNode;
}) {
  const { control } = useFormContext();
  return (
    <div hidden={currentStep !== "inclusions"} className="space-y-6">
      <Card>
        {renderCardHeader(
          "Inclusions ",
          "Specify what is included in the package.",
          "inclusions",
        )}

        <CardContent className="space-y-2">
          <Controller
            name="inclusions"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="inclusions">Inclusions</FieldLabel>
                <Textarea
                  {...field}
                  id="inclusions"
                  aria-invalid={fieldState.invalid}
                  placeholder="e.g. Accommodation, Transportation, Meals"
                  autoComplete="off"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        {renderCardHeader(
          "Exclusions",
          "Specify what is excluded in the package.",
          "exclusions",
        )}
        <CardContent className="space-y-2">
          <Controller
            name="exclusions"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="exclusions">Exclusions</FieldLabel>
                <Textarea
                  {...field}
                  id="exclusions"
                  aria-invalid={fieldState.invalid}
                  placeholder="e.g. Visa fees, Personal expenses"
                  autoComplete="off"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
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
  );
}
