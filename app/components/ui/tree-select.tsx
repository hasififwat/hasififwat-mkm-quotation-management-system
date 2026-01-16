import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ChevronRight } from "lucide-react";

export interface TreeSelectOption {
  label: string;
  value: string;
  nodes?: readonly TreeSelectOption[];
}

interface TreeSelectProps {
  options: readonly TreeSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

export const TreeSelect: React.FC<TreeSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select options",
  className,
}) => {
  const [triggerWidth, setTriggerWidth] = React.useState<number | undefined>();
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth);
    }
  }, []);

  const handleToggle = (optionValue: string) => {
    const option = options.find((opt) => opt.value === optionValue);

    if (!option) {
      // Check if it's a child node
      for (const opt of options) {
        if (opt.nodes) {
          const childNode = opt.nodes.find((n) => n.value === optionValue);
          if (childNode) {
            // Toggle individual child
            if (value.includes(optionValue)) {
              onChange(value.filter((v) => v !== optionValue));
            } else {
              onChange([...value, optionValue]);
            }
            return;
          }
        }
      }
      return;
    }

    // Handle parent options with nodes
    if (option.nodes && option.nodes.length > 0) {
      const childValues = option.nodes.map((node) => node.value);
      const hasAllChildren = childValues.every((childValue) =>
        value.includes(childValue)
      );

      if (hasAllChildren) {
        // Remove all children
        onChange(value.filter((v) => !childValues.includes(v)));
      } else {
        // Add all children
        const newValue = [...value];
        childValues.forEach((childValue) => {
          if (!newValue.includes(childValue)) {
            newValue.push(childValue);
          }
        });
        onChange(newValue);
      }
    } else {
      // Handle leaf options or options without nodes
      if (option.value === value[0] && value.length === 0) {
        // Special case for "NOT_INCLUDED" or similar clear options
        onChange([]);
      } else if (value.includes(option.value)) {
        onChange(value.filter((v) => v !== option.value));
      } else {
        onChange([...value, option.value]);
      }
    }
  };

  const getDisplay = () => {
    // Check if all children of a parent are selected
    for (const option of options) {
      if (option.nodes && option.nodes.length > 0) {
        const childValues = option.nodes.map((node) => node.value);
        if (
          childValues.length > 0 &&
          childValues.every((childValue) => value.includes(childValue))
        ) {
          return option.label;
        }
      }
    }

    // If no values selected, check for empty state option
    if (value.length === 0) {
      const emptyOption = options.find(
        (opt) => !opt.nodes || opt.nodes.length === 0
      );
      if (emptyOption) {
        return emptyOption.label;
      }
      return placeholder;
    }

    // Find labels for selected values
    const selectedLabels: string[] = [];
    options.forEach((option) => {
      if (option.nodes) {
        option.nodes.forEach((node) => {
          if (value.includes(node.value)) {
            selectedLabels.push(node.label);
          }
        });
      } else if (value.includes(option.value)) {
        selectedLabels.push(option.label);
      }
    });

    return selectedLabels.join(", ") || placeholder;
  };

  const isParentChecked = (option: TreeSelectOption): boolean => {
    if (!option.nodes || option.nodes.length === 0) {
      // For options without nodes, check if it represents empty state
      return value.length === 0;
    }
    const childValues = option.nodes.map((node) => node.value);
    return childValues.every((childValue) => value.includes(childValue));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          role="combobox"
          className={`w-full justify-between font-normal ${className || ""}`}
        >
          {getDisplay()}
          <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50 rotate-90" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-3"
        align="start"
        style={{ width: triggerWidth ? `${triggerWidth}px` : "auto" }}
      >
        <div className="space-y-3">
          {options.map((option) => (
            <React.Fragment key={option.value}>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${option.value}`}
                  checked={isParentChecked(option)}
                  onCheckedChange={() => handleToggle(option.value)}
                />
                <label
                  htmlFor={`${option.value}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {option.label}
                </label>
              </div>
              {option.nodes && option.nodes.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2 pl-4">
                    {option.nodes.map((node) => (
                      <div
                        key={node.value}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`${node.value}`}
                          checked={value.includes(node.value)}
                          onCheckedChange={() => handleToggle(node.value)}
                        />
                        <label
                          htmlFor={`${node.value}`}
                          className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {node.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </React.Fragment>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
