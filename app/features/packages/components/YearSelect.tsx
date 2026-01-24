import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function UmrahYearSelect() {
  return (
    <Field className="w-full ">
      <FieldLabel>Umrah Year</FieldLabel>
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Choose Umrah year" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="2025/2026">2025/2026</SelectItem>
            <SelectItem value="2026/2027">2026/2027</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <FieldDescription>Select your Umrah year.</FieldDescription>
    </Field>
  );
}
