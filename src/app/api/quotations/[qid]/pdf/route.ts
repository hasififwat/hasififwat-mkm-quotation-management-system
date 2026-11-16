import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { getServerConvexClient } from "~/lib/convex-server";

export async function GET(request: Request, context: {params: Promise<{qid: string}>}) {
  const headers = {"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"};
  if (!await convexAuthNextjsToken()) return new Response("Not authenticated", {status: 401, headers});
  const {qid} = await context.params;
  const client = await getServerConvexClient();
  try {
    const pdf = await client.action(api.quotationPdfWorker.download, {revision_id: qid as Id<"quotations">});
    const disposition = new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline";
    return new Response(pdf.bytes, {headers: {
      ...headers, "Content-Type": "application/pdf", "Content-Length": String(pdf.size),
      "Content-Disposition": `${disposition}; filename="${pdf.filename}"`, "ETag": `"${pdf.sha256}"`,
    }});
  } catch {
    return new Response("Issued PDF is unavailable. Check its saved revision status.", {status: 409, headers});
  }
}
