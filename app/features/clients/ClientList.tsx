import React, { useState, useEffect } from "react";
import { clientStore } from "./clientStore";
import type { Client } from "./types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Search, Plus, Edit2, Trash2, User, Phone, Mail } from "lucide-react";

interface Props {
  onEdit: (client: Client) => void;
  onAdd: () => void;
}

const ClientList: React.FC<Props> = ({ onEdit, onAdd }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setClients(clientStore.getAll());
  }, []);

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this client?")) {
      clientStore.delete(id);
      setClients(clientStore.getAll());
    }
  };

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 md:space-y-6 animate-fadeIn pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            Client Directory
          </h2>
          <p className="text-slate-500 text-xs md:text-sm">
            Manage your customer database and contact details.
          </p>
        </div>
        <Button onClick={onAdd} className="w-full md:w-auto gap-2">
          <Plus className="w-4 h-4" /> Add New Client
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="p-4 md:p-6 pb-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, phone or email..."
              className="pl-9 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left p-3 md:p-4 font-semibold text-slate-600">
                    Client Name
                  </th>
                  <th className="text-left p-3 md:p-4 font-semibold text-slate-600">
                    Contact
                  </th>
                  <th className="hidden lg:table-cell text-left p-4 font-semibold text-slate-600">
                    Address
                  </th>
                  <th className="text-right p-3 md:p-4 font-semibold text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="p-3 md:p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                          {client.name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 leading-tight">
                            {client.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Added{" "}
                            {new Date(client.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 md:p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="w-3 h-3" /> {client.phone}
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-3 h-3" /> {client.email}
                        </div>
                      </div>
                    </td>
                    <td className="hidden lg:table-cell p-4 text-slate-500 max-w-[200px] truncate">
                      {client.address}
                    </td>
                    <td className="p-3 md:p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onEdit(client)}
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDelete(client.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-500">
                      No clients found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientList;
