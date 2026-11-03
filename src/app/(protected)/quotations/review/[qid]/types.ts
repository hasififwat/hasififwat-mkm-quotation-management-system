import type { FunctionReturnType } from "convex/server";

import { api } from "convex/_generated/api";

export type QuotationFullDetails = NonNullable<
	FunctionReturnType<typeof api.quotations.getQuotationFullDetails>
>;
