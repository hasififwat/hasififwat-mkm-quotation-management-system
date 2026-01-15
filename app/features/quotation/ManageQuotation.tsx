import type React from "react";
import { useState, useEffect } from "react";
import { quotationStore } from "./quotationStore";
import type { SavedQuotation } from "./types";
import { packageStore } from "../packages/packageStore";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  FileText,
  Printer,
  User,
} from "lucide-react";
import { formatCurrency } from "./utils";

interface Props {
  onEdit: (quote: SavedQuotation) => void;
  onView: (quote: SavedQuotation) => void;
  onAddNew: () => void;
}

const ManageQuotation: React.FC<Props> = ({ onEdit, onView, onAddNew }) => {
  const [quotations, setQuotations] = useState<SavedQuotation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [packages, setPackages] = useState<Record<string, string>>({});

  useEffect(() => {
    setQuotations(quotationStore.getAll());
    const allPkgs = packageStore.getAll();
    const pkgMap = allPkgs.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {});
    setPackages(pkgMap);
  }, []);

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this quotation record?")) {
      quotationStore.delete(id);
      setQuotations(quotationStore.getAll());
    }
  };

  const filteredQuotes = quotations.filter(
    (q) =>
      q.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (packages[q.packageId] || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 md:space-y-6 animate-fadeIn pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            Quotation Records
          </h2>
          <p className="text-slate-500 text-xs md:text-sm">
            View and manage your past quotations generated for clients.
          </p>
        </div>
        <Button onClick={onAddNew} className="w-full md:w-auto gap-2">
          <Plus className="w-4 h-4" /> Create New Quote
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="p-4 md:p-6 pb-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by client name, ref number or package..."
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
                    Reference / Date
                  </th>
                  <th className="text-left p-3 md:p-4 font-semibold text-slate-600">
                    Client
                  </th>
                  <th className="hidden lg:table-cell text-left p-4 font-semibold text-slate-600">
                    Package
                  </th>
                  <th className="text-left p-3 md:p-4 font-semibold text-slate-600">
                    Amount
                  </th>
                  <th className="text-right p-3 md:p-4 font-semibold text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotes.map((quote) => (
                  <tr
                    key={quote.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="p-3 md:p-4">
                      <div className="font-bold text-slate-900 leading-tight">
                        {quote.referenceNumber}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Created:{" "}
                        {new Date(quote.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-3 md:p-4">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="font-medium text-slate-800 uppercase">
                          {quote.clientName}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {quote.pax} PAX • {quote.roomType.toUpperCase()}
                      </div>
                    </td>
                    <td className="hidden lg:table-cell p-4 text-slate-500">
                      {packages[quote.packageId] || "Custom Package"}
                    </td>
                    <td className="p-3 md:p-4 font-bold text-slate-900">
                      {formatCurrency(quote.totalPrice)}
                    </td>
                    <td className="p-3 md:p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onView(quote)}
                          title="View/Print"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onEdit(quote)}
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDelete(quote.id)}
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredQuotes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500">
                      No quotation records found.
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

export default ManageQuotation;
