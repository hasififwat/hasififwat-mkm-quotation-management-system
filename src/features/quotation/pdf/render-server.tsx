import { renderToBuffer } from "@react-pdf/renderer";
import { QuotationDocument } from "./versions/QuotationDocumentV1";
import { type QuotationRenderInput } from "./render-input";

export async function renderQuotationPdf(input: QuotationRenderInput): Promise<Buffer> {
	if (input.renderVersion !== "mkm-quotation-v1") {
		throw new Error(`Unsupported quotation renderer ${input.renderVersion}`);
	}
	if (input.datePolicy !== "Asia/Kuala_Lumpur") {
		throw new Error("Server quotations require Asia/Kuala_Lumpur frozen dates");
	}
	for (const asset of [input.assets.header, input.assets.footer]) {
		if (!asset.startsWith("data:image/png;base64,")) {
			throw new Error("Server quotation assets must contain frozen inline PNG bytes");
		}
	}
	return renderToBuffer(<QuotationDocument input={input} />);
}
