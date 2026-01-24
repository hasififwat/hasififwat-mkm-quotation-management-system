import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
  CardFooter,
  CardHeader,
} from "~/components/ui/card";

import { ChevronRight } from "lucide-react";

import { Input } from "~/components/ui/input";
import { Controller, useFormContext } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import type { PackageDetailsForm } from "~/schema";

export default function BasicDetails({
  currentStep,

  goToNextStep,
}: {
  currentStep: string;

  goToNextStep: () => void;
}) {
  const { control } = useFormContext<PackageDetailsForm>();
  return (
    <Card hidden={currentStep !== "basic"}>
      <CardHeader>
        <CardTitle>Basic Details</CardTitle>
        <CardDescription>
          Package name, duration, and transportation information.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4">
        <Controller
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                {...field}
                id="name"
                aria-invalid={fieldState.invalid}
                placeholder="e.g. UMJ STANDARD 2026"
                autoComplete="off"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="duration"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="duration">Duration</FieldLabel>
              <Input
                {...field}
                id="duration"
                aria-invalid={fieldState.invalid}
                placeholder="e.g. 12 HARI 10 MALAM"
                autoComplete="off"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="year"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="year">Year </FieldLabel>
              <Input
                {...field}
                id="year"
                aria-invalid={fieldState.invalid}
                placeholder="eg: 2026/2027"
                autoComplete="off"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
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
  );
}
