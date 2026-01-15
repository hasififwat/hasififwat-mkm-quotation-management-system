export interface QuotationData {
  referenceNumber: string;
  date: string;
  clientName: string;
  salesperson: string;
  office: string;
  packageId: string;
  roomType: "double" | "triple" | "quad";
  pax: number | "";
  startDate: string;
  endDate: string;
}

export interface SavedQuotation extends QuotationData {
  id: string;
  createdAt: string;
  totalPrice: number;
}
const STORAGE_KEY = "mkm_quotations_history";

const getInitialQuotations = (): SavedQuotation[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return JSON.parse(stored);
  return [];
};

export const quotationStore = {
  getAll: (): SavedQuotation[] => {
    return getInitialQuotations().sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  save: (quotation: SavedQuotation) => {
    const quotations = getInitialQuotations();
    const index = quotations.findIndex((q) => q.id === quotation.id);
    if (index >= 0) {
      quotations[index] = quotation;
    } else {
      quotations.push(quotation);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quotations));
  },

  delete: (id: string) => {
    const quotations = getInitialQuotations().filter((q) => q.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quotations));
  },
};
