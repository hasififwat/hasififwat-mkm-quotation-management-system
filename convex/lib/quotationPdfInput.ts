import type { FrozenQuotationDocumentV1 } from "../quotationRevisionSaves";
import { freezeQuotationForServer } from "../../src/features/quotation/pdf/render-input";
import assets from "./quotationPdfAssetsV1.json";
import { ISSUED_TERMS_V1 } from "./quotationPdfTermsV1";

export function freezeRevisionPdf(document: FrozenQuotationDocumentV1) {
  const pkg = document.package_snapshot;
  const items = document.items.map((item, index) => ({
    id: String(index), name: item.description, room_type: item.description,
    package_room_id: item.package_room_id, price: Math.abs(item.unit_price),
    pax: item.quantity, subtotal: item.unit_price * item.quantity, type: item.item_type,
  }));
  return freezeQuotationForServer({
    reference_number: document.quotation_number, client_name: document.client_name,
    pic_name: document.pic_name, branch: document.branch, total_amount: document.total_amount,
    created_at: document.issue_date,
    selected_flight: { ...document.flight_snapshot, flight: document.flight_snapshot?.flight?.trim() || "NOT RECORDED" },
    package: {
      name: pkg?.name ?? "NOT RECORDED", duration: pkg?.duration ?? "NOT RECORDED",
      transport: pkg?.transport ?? "NOT RECORDED", inclusions: pkg?.inclusions ?? "NOT RECORDED",
      exclusions: pkg?.exclusions ?? "NOT RECORDED",
      hotels: document.hotels_snapshot?.map(h => ({...h, name: h.name ?? h.placeholder})) ?? [],
    },
    items: {
      selected_rooms: items.filter(i => i.type === "room"),
      adds_ons: items.filter(i => i.type === "addon"), discounts: items.filter(i => i.type === "discount"),
    },
  }, { assets, terms: ISSUED_TERMS_V1, termsVersion: "mkm-payment-terms-v1",
    title: document.provenance ? `Reconstruction - ${document.quotation_number}` : document.quotation_number });
}
