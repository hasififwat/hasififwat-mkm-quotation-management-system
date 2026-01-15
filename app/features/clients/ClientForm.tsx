import React, { useState } from "react";
import type { Client } from "./types";
import { clientStore } from "./clientStore";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "../../components/ui/card";
import { ChevronLeft, Save, User, Phone, Mail, MapPin } from "lucide-react";

interface Props {
  editingClient?: Client;
  onBack: () => void;
}

const ClientForm: React.FC<Props> = ({ editingClient, onBack }) => {
  const [client, setClient] = useState<Client>(
    editingClient || {
      id: `cli-${Date.now()}`,
      name: "",
      phone: "",
      email: "",
      address: "",
      createdAt: new Date().toISOString(),
    }
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setClient((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (!client.name || !client.phone) {
      alert("Please fill in at least the Client Name and Phone Number.");
      return;
    }
    clientStore.save(client);
    onBack();
  };

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6 animate-slideIn">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">
          {editingClient ? "Edit Client Profile" : "Register New Client"}
        </h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
          <CardDescription>
            Enter essential contact and demographic details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="w-3 h-3" /> Full Name
            </Label>
            <Input
              name="name"
              value={client.name}
              onChange={handleChange}
              placeholder="e.g. AHMAD BIN ISMAIL"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="w-3 h-3" /> Phone Number
              </Label>
              <Input
                name="phone"
                value={client.phone}
                onChange={handleChange}
                placeholder="e.g. 012-3456789"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="w-3 h-3" /> Email Address
              </Label>
              <Input
                name="email"
                type="email"
                value={client.email}
                onChange={handleChange}
                placeholder="e.g. ahmad@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-3 h-3" /> Mailing Address
            </Label>
            <textarea
              name="address"
              value={client.address}
              onChange={handleChange}
              rows={3}
              className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Full address for documentation purposes..."
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t border-slate-100 p-6">
          <Button variant="outline" onClick={onBack}>
            Cancel
          </Button>
          <Button className="gap-2" onClick={handleSave}>
            <Save className="w-4 h-4" /> Save Client Profile
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ClientForm;
