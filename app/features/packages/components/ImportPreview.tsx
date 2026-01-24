import React from "react";
import type { PackageDetailsForm } from "@/schema";
import { Badge } from "@/components/ui/badge";

interface ImportPreviewProps {
  selectedPackage: PackageDetailsForm | null;
  settingType: keyof PackageDetailsForm;
}

const HOTEL_LIST = ["makkah", "madinah", "taif"] as const;

export const ImportPreview: React.FC<ImportPreviewProps> = ({
  selectedPackage,
  settingType,
}) => {
  if (!selectedPackage) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        Select a package to preview import data
      </div>
    );
  }

  if (settingType === "hotels") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          The following hotel settings will be imported:
        </p>
        <div className="space-y-3">
          {HOTEL_LIST.map((hotelKey) => {
            const hotel = selectedPackage.hotels[hotelKey];
            if (!hotel.enabled) return null;

            return (
              <div key={hotelKey} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold capitalize">{hotelKey}</h4>
                  <Badge variant="secondary">Enabled</Badge>
                </div>
                <p className="text-sm">
                  <span className="text-muted-foreground">Hotel:</span>{" "}
                  {hotel.name || "—"}
                </p>
                <div className="flex flex-wrap gap-1">
                  <span className="text-sm text-muted-foreground">Meals:</span>
                  {hotel.meals && hotel.meals.length > 0 ? (
                    hotel.meals.map((meal) => (
                      <Badge key={meal} variant="outline" className="text-xs">
                        {meal}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      No meals
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (settingType === "rooms") {
    const enabledRooms = selectedPackage.rooms.filter((room) => room.enabled);
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          The following room pricing will be imported:
        </p>
        <div className="space-y-2">
          {enabledRooms.length > 0 ? (
            enabledRooms.map((room) => (
              <div
                key={room.room_type}
                className="flex items-center justify-between border rounded-lg p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="font-medium capitalize">
                    {room.room_type}
                  </span>
                </div>
                <span className="font-semibold">
                  RM {room.price.toLocaleString("en-US")}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No room types enabled in this package
            </p>
          )}
        </div>
      </div>
    );
  }

  if (settingType === "inclusions") {
    const inclusionsList = selectedPackage.inclusions
      .split("\n")
      .filter((line) => line.trim());
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          The following inclusions will be imported:
        </p>
        {inclusionsList.length > 0 ? (
          <ul className="list-disc list-inside text-sm space-y-1 max-h-64 overflow-y-auto border rounded-lg p-3">
            {inclusionsList.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No inclusions in this package
          </p>
        )}
      </div>
    );
  }

  if (settingType === "exclusions") {
    const exclusionsList = selectedPackage.exclusions
      .split("\n")
      .filter((line) => line.trim());
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          The following exclusions will be imported:
        </p>
        {exclusionsList.length > 0 ? (
          <ul className="list-disc list-inside text-sm space-y-1 max-h-64 overflow-y-auto border rounded-lg p-3">
            {exclusionsList.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No exclusions in this package
          </p>
        )}
      </div>
    );
  }

  return null;
};
