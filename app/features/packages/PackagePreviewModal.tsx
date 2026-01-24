import { useState, useEffect } from "react";
import type { SupabasePackageDetails } from "../quotation/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "~/hooks/use-mobile";

interface Props {
  pkg: SupabasePackageDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PackagePreviewModal: React.FC<Props> = ({ pkg, open, onOpenChange }) => {
  const [selectedFlightId, setSelectedFlightId] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const selectedFlight = pkg.flights.find((f) => f.id === selectedFlightId);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .toUpperCase();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: "MYR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getFlightRoute = (departure: string, returnSector: string) => {
    // Extract airport codes (e.g., KULMED -> KUL MED)
    const depCodes = departure.match(/.{3}/g)?.join(" ") || departure;
    const retCodes = returnSector.match(/.{3}/g)?.join(" ") || returnSector;
    return `${depCodes} - ${retCodes}`;
  };

  const generatePreviewText = () => {
    if (!selectedFlight) return "";

    const lines: string[] = [];

    // Package name (bold in WhatsApp with *)
    lines.push(`*${pkg.name}*`);

    // Dates
    lines.push(
      `${formatDate(selectedFlight.departure_date)} - ${formatDate(
        selectedFlight.return_date,
      )}`,
    );

    // Duration
    lines.push(pkg.duration);

    // Flight route
    lines.push(
      `✈ ${getFlightRoute(
        selectedFlight.departure_sector,
        selectedFlight.return_sector,
      )}`,
    );

    // Empty line
    lines.push("");

    // Room prices
    const sortedRooms = pkg.rooms
      .filter((room) => room.enabled)
      .sort((a, b) => {
        const order: Record<string, number> = { Quad: 1, Triple: 2, Double: 3 };
        return (order[a.room_type] || 99) - (order[b.room_type] || 99);
      });

    sortedRooms.forEach((room) => {
      const roomNum =
        room.room_type === "Quad"
          ? "4"
          : room.room_type === "Triple"
            ? "3"
            : "2";
      lines.push(`Bilik ${roomNum} : ${formatPrice(room.price)}`);
    });

    // Hotels
    if (pkg.hotels?.makkah?.enabled) {
      const meals =
        pkg.hotels.makkah.meals.length === 0
          ? "Breakfast Only"
          : pkg.hotels.makkah.meals.join(", ");
      lines.push(`Makkah : ${pkg.hotels.makkah.name} (${meals})`);
    }

    if (pkg.hotels?.madinah?.enabled) {
      const meals =
        pkg.hotels.madinah.meals.length === 0
          ? "Breakfast Only"
          : pkg.hotels.madinah.meals.join(", ");
      lines.push(`Madinah : ${pkg.hotels.madinah.name} (${meals})`);
    }

    if (pkg.hotels?.taif?.enabled) {
      const meals =
        pkg.hotels.taif.meals.length === 0
          ? "Breakfast Only"
          : pkg.hotels.taif.meals.join(", ");
      lines.push(`Taif : ${pkg.hotels.taif.name} (${meals})`);
    }

    // Footer note
    lines.push("");
    lines.push(
      "(setaraf bermaksud memiliki kualiti yang setanding dengan hotel yang diberi)",
    );

    return lines.join("\n");
  };

  const isMobile = useIsMobile();

  // Shared content between Dialog and Drawer
  const previewContent = (
    <div className="space-y-4 px-4 md:px-0">
      {/* Flight Selection */}
      <div className="space-y-2">
        <Select value={selectedFlightId} onValueChange={setSelectedFlightId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose departure and return dates" />
          </SelectTrigger>
          <SelectContent>
            {pkg.flights.map((flight) => (
              <SelectItem key={flight.id} value={flight.id}>
                {formatDate(flight.departure_date)} -{" "}
                {formatDate(flight.return_date)} ({flight.month})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Preview */}
      {selectedFlight && (
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="space-y-3 font-mono text-sm whitespace-pre-line">
              <div className="font-bold text-lg">{pkg.name}</div>
              <div>
                {formatDate(selectedFlight.departure_date)} -{" "}
                {formatDate(selectedFlight.return_date)}
              </div>
              <div>{pkg.duration}</div>
              <div>
                ✈{" "}
                {getFlightRoute(
                  selectedFlight.departure_sector,
                  selectedFlight.return_sector,
                )}
              </div>

              <div className="pt-2 space-y-1">
                {pkg.rooms
                  .filter((room) => room.enabled)
                  .sort((a, b) => {
                    const order: Record<string, number> = {
                      Quad: 1,
                      Triple: 2,
                      Double: 3,
                    };
                    return (
                      (order[a.room_type] || 99) - (order[b.room_type] || 99)
                    );
                  })
                  .map((room) => (
                    <div key={room.id}>
                      Bilik{" "}
                      {room.room_type === "Quad"
                        ? "4"
                        : room.room_type === "Triple"
                          ? "3"
                          : "2"}{" "}
                      : {formatPrice(room.price)}
                    </div>
                  ))}
              </div>

              {pkg.hotels?.makkah?.enabled && (
                <div>
                  Makkah : {pkg.hotels.makkah.name} (
                  {pkg.hotels.makkah.meals.length === 0
                    ? "Breakfast Only"
                    : pkg.hotels.makkah.meals.join(", ")}
                  )
                </div>
              )}

              {pkg.hotels?.madinah?.enabled && (
                <div>
                  Madinah : {pkg.hotels.madinah.name} (
                  {pkg.hotels.madinah.meals.length === 0
                    ? "Breakfast Only"
                    : pkg.hotels.madinah.meals.join(", ")}
                  )
                </div>
              )}

              {pkg.hotels?.taif?.enabled && (
                <div>
                  Taif : {pkg.hotels.taif.name} (
                  {pkg.hotels.taif.meals.length === 0
                    ? "Breakfast Only"
                    : pkg.hotels.taif.meals.join(", ")}
                  )
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-2">
                (setaraf bermaksud memiliki kualiti yang setanding dengan hotel
                yang diberi)
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Action buttons shared between Dialog and Drawer
  const actionButtons = (
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        Close
      </Button>
      {selectedFlight && (
        <Button
          onClick={() => {
            const previewText = generatePreviewText();
            if (previewText) {
              navigator.clipboard.writeText(previewText);
              setCopied(true);
            }
          }}
          className={copied ? "bg-green-600 hover:bg-green-700" : ""}
        >
          {copied ? "Copied" : "Copy Preview"}
        </Button>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Package Preview</DrawerTitle>
            <DrawerDescription>
              Select flight dates to generate package preview
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto max-h-[60vh] pb-4">
            {previewContent}
          </div>
          <DrawerFooter>{actionButtons}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle>Package Preview</DialogTitle>
          <DialogDescription>
            Select flight dates to generate package preview
          </DialogDescription>
        </DialogHeader>
        {previewContent}
        {actionButtons}
      </DialogContent>
    </Dialog>
  );
};

export default PackagePreviewModal;
