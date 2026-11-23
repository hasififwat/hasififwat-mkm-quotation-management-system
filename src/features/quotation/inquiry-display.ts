import type { RevisionContext } from "../../../convex/lib/savedQuotation";

export const inquiryStatusLabel = { active: "Active", closed: "Closed", accepted: "Accepted" } as const;

export const inquiryClosureLabel: Record<Extract<NonNullable<RevisionContext["inquiry"]>, { status: "closed" }>["reason"], string> = {
  individual: "Option closed by staff",
  another_accepted: "Another quotation was accepted",
  manual: "Inquiry closed without acceptance",
  inactivity: "Closed due to inactivity",
};
