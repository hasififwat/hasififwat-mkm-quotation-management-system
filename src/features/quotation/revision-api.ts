import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { ConvexError } from "convex/values";
import { api } from "convex/_generated/api";
import type { SaveCommand } from "../../../convex/quotationRevisionSaves";
import { getServerConvexClient } from "~/lib/convex-server";

export async function saveRevisionResponse(payload: unknown, operation: "create" | "append") {
  if (!await convexAuthNextjsToken()) return Response.json({error: "Not authenticated"}, {status: 401});
  const client = await getServerConvexClient();
  const availability = await client.query(api.quotationRevisionUi.availability, {});
  if (!payload || typeof payload !== "object" || !("command" in payload)) {
    return availability.mode === "legacy" ? null : Response.json({error: "Quotation saves are unavailable during revision maintenance."}, {status: 409});
  }
  if (!("expected_actor" in payload) || payload.expected_actor !== availability.actor) {
    return Response.json({code: "QUOTATION_ACTOR_CONFLICT", error: "Sign in as the original editor to recover this save."}, {status: 409});
  }
  const command = payload.command;
  if (!command || typeof command !== "object" || !("operation" in command) || command.operation !== operation) {
    return Response.json({error: "Invalid save command"}, {status: 400});
  }
  try {
    const result = await client.mutation(api.quotationRevisionSaves.save, {command: command as SaveCommand});
    return Response.json({success: true, ...result});
  } catch (error) {
    if (error instanceof ConvexError && error.data && typeof error.data === "object" && "code" in error.data) {
      return Response.json({code: error.data.code, error: "Save conflict. Your draft is retained."}, {status: 409});
    }
    const message = error instanceof Error ? error.message : "";
    if (/Not authenticated/i.test(message)) return Response.json({error: "Not authenticated"}, {status: 401});
    if (/Uncaught Error:|ArgumentValidationError|Validator error/i.test(message)) return Response.json({error: "Save validation failed. Your draft is retained."}, {status: 422});
    return Response.json({error: "Could not confirm the save"}, {status: 500});
  }
}
