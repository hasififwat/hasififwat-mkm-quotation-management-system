import type React from "react";
import { useRef, useEffect, useState } from "react";
import type { QuotationData, PackageDetails } from "../types";
import { packageStore } from "../../packages/packageStore";
import { clientStore } from "../../clients/clientStore";
import type { Client } from "../../clients/types";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "../../../components/ui/card";
import { Label } from "../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { User, Package, Users, Eye, ListFilter } from "lucide-react";

interface Props {
  formData: QuotationData;
  selectedPkg: PackageDetails;
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  onRoomTypeChange: (type: "double" | "triple" | "quad") => void;
  onPreview: () => void;
}

const QuotationForm: React.FC<Props> = ({
  formData,
  selectedPkg,
  onInputChange,
  onRoomTypeChange,
  onPreview,
}) => {
  const clientNameRef = useRef<HTMLInputElement>(null);
  const paxRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  const [availablePackages, setAvailablePackages] = useState<PackageDetails[]>(
    []
  );
  const [savedClients, setSavedClients] = useState<Client[]>([]);
  const [showClientPicker, setShowClientPicker] = useState(false);

  useEffect(() => {
    clientNameRef.current?.focus();
    setAvailablePackages(
      packageStore.getAll().filter((p) => p.status === "published")
    );
    setSavedClients(clientStore.getAll());
  }, []);

  const handleKeyDown = (
    e: React.KeyboardEvent,
    nextRef?: React.RefObject<HTMLInputElement | null>
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      nextRef?.current?.focus();
    }
  };

  const currentPax = typeof formData.pax === "number" ? formData.pax : 0;
  const unitPrice =
    formData.roomType === "double"
      ? selectedPkg.priceDouble
      : formData.roomType === "triple"
      ? selectedPkg.priceTriple
      : selectedPkg.priceQuad;
  const estimatedTotal = unitPrice * currentPax;

  const handlePackageChange = (id: string) => {
    onInputChange({
      target: { name: "packageId", value: id },
    } as React.ChangeEvent<HTMLSelectElement>);
  };

  const selectClient = (client: Client) => {
    onInputChange({
      target: { name: "clientName", value: client.name.toUpperCase() },
    } as React.ChangeEvent<HTMLInputElement>);
    setShowClientPicker(false);
    paxRef.current?.focus();
  };

  return (
    <div className="max-w-2xl mx-auto py-8 animate-fadeIn">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">
            New Quotation
          </CardTitle>
          <CardDescription>
            Enter client details and select a travel package to generate a
            quote.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 text-slate-900">
                <User className="w-4 h-4" />
                <h3 className="font-semibold text-sm uppercase tracking-wider">
                  Client Information
                </h3>
              </div>
              {savedClients.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] font-bold uppercase tracking-tight"
                  onClick={() => setShowClientPicker(!showClientPicker)}
                >
                  <ListFilter className="w-3 h-3 mr-1" />
                  {showClientPicker ? "Cancel Picker" : "Pick from Directory"}
                </Button>
              )}
            </div>

            {showClientPicker ? (
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 animate-fadeIn">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">
                  Select a saved client:
                </p>
                <div className="grid grid-cols-1 gap-1 max-h-[150px] overflow-y-auto pr-1">
                  {savedClients.map((client) => (
                    <button
                      key={client.id}
                      className="text-left px-3 py-2 text-sm bg-white border border-slate-200 rounded hover:border-slate-900 transition-colors flex justify-between items-center"
                      onClick={() => selectClient(client)}
                    >
                      <span className="font-semibold">{client.name}</span>
                      <span className="text-[10px] text-slate-400">
                        {client.phone}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="clientName">Full Name</Label>
                <Input
                  id="clientName"
                  ref={clientNameRef}
                  name="clientName"
                  value={formData.clientName}
                  onChange={onInputChange}
                  onKeyDown={(e) => handleKeyDown(e, paxRef)}
                  placeholder="e.g. AHMAD BIN ISMAIL"
                />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-2">
              <Package className="w-4 h-4" />
              <h3 className="font-semibold text-sm uppercase tracking-wider">
                Package & Pax
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="packageId">Travel Package</Label>
                <Select
                  value={formData.packageId}
                  onValueChange={handlePackageChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a package..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePackages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pax">Number of Pax</Label>
                <div className="relative">
                  <Input
                    id="pax"
                    ref={paxRef}
                    type="number"
                    name="pax"
                    min="1"
                    value={formData.pax}
                    onChange={onInputChange}
                    onKeyDown={(e) => handleKeyDown(e, startDateRef)}
                    className="pr-10"
                  />
                  <Users className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Departure Date</Label>
                <Input
                  id="startDate"
                  ref={startDateRef}
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={onInputChange}
                  onKeyDown={(e) => handleKeyDown(e, endDateRef)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Return Date</Label>
                <Input
                  id="endDate"
                  ref={endDateRef}
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={onInputChange}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Accommodation Choice</Label>
              <div className="grid grid-cols-3 gap-3">
                {["double", "triple", "quad"].map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant={formData.roomType === type ? "default" : "outline"}
                    className="capitalize"
                    onClick={() => onRoomTypeChange(type as any)}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between bg-slate-50/50 border-t border-slate-100 p-8">
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Estimated Total (RM)
            </p>
            <p className="text-3xl font-bold text-slate-900">
              {estimatedTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
          <Button
            size="lg"
            onClick={onPreview}
            disabled={
              !formData.clientName || !formData.startDate || !formData.endDate
            }
            className="gap-2"
          >
            <Eye className="w-4 h-4" /> Generate Preview
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default QuotationForm;
