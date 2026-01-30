import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  GetAllQuotationsResponseSchema,
  QuotationFullDetails,
} from "~/features/quotation/schema";

export const UmrahQuotationService = {
  async getQuotations(
    client: SupabaseClient,
  ): Promise<GetAllQuotationsResponseSchema> {
    const { data, error } = await client.rpc("get_quotations");

    if (error) {
      console.error("Error fetching quotations:", error);
      throw error;
    }

    return data as GetAllQuotationsResponseSchema;
  },

  async create(client: SupabaseClient, formPayload: any) {
    const { data, error } = await client.rpc("create_quotation", {
      payload: formPayload,
    });

    if (error) {
      console.error("Error creating quotation:", error);
      throw new Error(error.message);
    }

    return data;
  },

  async getQuotationForEdit(client: SupabaseClient, quotationId: string) {
    const { data, error } = await client.rpc("get_quotation_details", {
      target_quotation_id: quotationId,
    });

    if (error) {
      console.error("Error fetching quotation details:", error);
      throw new Error(error.message);
    }

    return data;
  },

  async update(client: SupabaseClient, formPayload: any) {
    const { data, error } = await client.rpc("edit_quotation_details", {
      payload: formPayload,
    });

    if (error) {
      console.error("Error updating quotation:", error);
      throw new Error(error.message);
    }

    return data;
  },

  async getQuotationFullDetails(client: SupabaseClient, quotationId: string) {
    const { data, error } = await client.rpc("get_quotation_full_details", {
      target_quotation_id: quotationId,
    });

    if (error) {
      console.error("Error fetching full quotation details:", error);
      throw new Error(error.message);
    }

    return data as QuotationFullDetails;
  },
};
