import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { renderToBuffer } from "@react-pdf/renderer";
import { quotationPdfFixture } from "./fixtures/quotation-pdf.mjs";

const repo = process.cwd();
const output = path.resolve(process.argv[2] || "output/pdf/issue-62");
await mkdir(output, { recursive: true });
await mkdir(path.join(repo, ".next"), { recursive: true });
const temporary = await mkdtemp(path.join(repo, ".next/quotation-pdf-check-"));
const compiled = new Map();
async function compile(filename, sourceOverride) {
  const key = filename + (sourceOverride ? "-baseline" : "");
  if (compiled.has(key)) return compiled.get(key);
  const destination = path.join(temporary, `${compiled.size}.mjs`);
  compiled.set(key, destination);
  let source;
  if (filename.endsWith(".png")) {
    source = `export default ${JSON.stringify({ src: `data:image/png;base64,${(await readFile(filename)).toString("base64")}` })};`;
  } else {
    source = ts.transpileModule(sourceOverride ?? await readFile(filename, "utf8"), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    for (const match of [...source.matchAll(/from ["']([^"']+)["']/g)]) {
      if (!match[1].startsWith(".")) continue;
      let dependency = path.resolve(path.dirname(filename), match[1]);
      if (!path.extname(dependency)) {
        try { await readFile(`${dependency}.ts`); dependency += ".ts"; }
        catch { dependency += ".tsx"; }
      }
      const target = await compile(dependency);
      source = source.replace(match[0], `from ${JSON.stringify(pathToFileURL(target).href)}`);
    }
  }
  await writeFile(destination, source);
  return destination;
}
async function load(relative, source) {
  return import(pathToFileURL(await compile(path.join(repo, relative), source)).href);
}
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
try {
  const inputApi = await load("src/features/quotation/pdf/render-input.ts");
  const { renderQuotationPdf } = await load("src/features/quotation/pdf/render-server.tsx");
  const { TERMS_AND_CONDITIONS } = await load("src/features/quotation/constants.ts");
  const { default: BrowserPreview } = await load("src/features/quotation/components/PDFPreview.tsx");
  const asset = async name => `data:image/png;base64,${(await readFile(path.join(repo, `src/features/quotation/assets/mkm-quotation-${name}.png`))).toString("base64")}`;
  const context = {
    title: "MKM-1448H-0062-R02.pdf",
    assets: { version: "mkm-branding-v1", header: await asset("header"), footer: await asset("footer") },
    termsVersion: "mkm-payment-terms-v1",
    terms: TERMS_AND_CONDITIONS,
  };
  const details = structuredClone(quotationPdfFixture);
  const input = inputApi.freezeQuotationForServer(details, context);
  assert.throws(() => inputApi.freezeQuotationForServer({ ...details, created_at: "2026-11-17T01:00:00" }, context), /explicit offset/);
  assert.throws(() => inputApi.freezeQuotationForServer({ ...details, created_at: "2026-02-30" }, context), /Invalid quotation date/);
  const pending = inputApi.freezeQuotationForServer({ ...details, selected_flight: null }, context);
  assert.equal(pending.travelDateRange, "TBC");
  assert.equal(input.documentDate, "17 Nov 2026");
  assert.equal(input.travelDateRange, "01 DEC 2026 - 12 DEC 2026");
  assert.equal(input.datePolicy, "Asia/Kuala_Lumpur");
  assert.equal(input.details.total_amount, 10000.50 + 16000 + 501 - 81);
  assert.ok(Object.isFrozen(input.details.items.selected_rooms[0]));
  details.items.selected_rooms[0].price = 999;
  context.terms[0] = "Changed after freeze";
  assert.equal(input.details.items.selected_rooms[0].price, 5000.25);
  assert.notEqual(input.terms[0], context.terms[0]);
  context.terms[0] = input.terms[0];
  await assert.rejects(() => renderQuotationPdf({ ...input, renderVersion: "future" }), /Unsupported/);
  await assert.rejects(() => renderQuotationPdf({ ...input, datePolicy: "legacy-viewer-local" }), /Kuala_Lumpur/);
  await assert.rejects(() => renderQuotationPdf({ ...input, assets: { ...input.assets, header: "https://example.com/current.png" } }), /inline PNG/);
  const pdf = await renderQuotationPdf(input);
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  const pdfFile = path.join(output, context.title);
  await writeFile(pdfFile, pdf);
  const text = execFileSync("pdftotext", ["-layout", pdfFile, "-"], { encoding: "utf8" }).replace(/\s+/g, " ");
  for (const value of ["MKM/1448H/0062/R02", "17 Nov 2026", "01 DEC 2026 - 12 DEC 2026", "SYNTHETIC VERIFICATION CLIENT", "TEST AGENT", "SHAH ALAM", "UMRAH VERIFICATION", "5,000.25", "8,000.00", "26,000.50", "501.00", "81.00", "26,420.50", "ZIARAH TAMBAHAN", "DISKAUN FIXTURE", "SAUDIA SV835", "12 HARI 10 MALAM", "BAS PERSIARAN", "SYNTHETIC MAKKAH HOTEL", "SYNTHETIC MADINAH HOTEL", "FULL BOARD(MAKKAH)", "HALF BOARD(MADINAH)", "Visa umrah", "Bagasi 30kg", "Lawatan ziarah", "Perbelanjaan peribadi", "Insurans tambahan", ...input.terms]) {
    assert.ok(text.includes(value), `PDF contains ${value}`);
  }
  assert.ok(!text.includes("MUST NOT APPEAR"));
  const info = execFileSync("pdfinfo", [pdfFile], { encoding: "utf8" });
  assert.match(info, /Pages:\s+1\b/);
  const images = execFileSync("pdfimages", ["-list", pdfFile], { encoding: "utf8" });
  assert.equal(images.split("\n").filter(line => /^\s*1\s+\d+\s+image\s/.test(line)).length, 2, "actual header and footer embedded");
  execFileSync("pdftoppm", ["-scale-to", "1800", "-png", "-singlefile", pdfFile, path.join(output, "server-page")]);
  const baselineSource = execFileSync("git", ["show", "3d18ab73179abc8a4d1d6407c0e6b65d7bc9a3da:src/features/quotation/components/PDFPreview.tsx"], { encoding: "utf8" });
  const { default: BaselinePreview } = await load("src/features/quotation/components/PDFPreview.tsx", baselineSource);
  for (const [name, Preview] of [["baseline", BaselinePreview], ["browser", BrowserPreview]]) {
    const bytes = await renderToBuffer(Preview({ details: quotationPdfFixture, fileName: context.title }));
    const filename = path.join(temporary, `${name}.pdf`);
    await writeFile(filename, bytes);
    execFileSync("pdftoppm", ["-scale-to", "1800", "-png", "-singlefile", filename, path.join(temporary, name)]);
  }
  assert.equal(hash(await readFile(path.join(temporary, "baseline.png"))), hash(await readFile(path.join(temporary, "browser.png"))), "browser adapter raster matches required migration base");
  const report = {
    runtime: process.version, platform: process.platform, architecture: process.arch,
    rendererVersion: JSON.parse(await readFile(path.join(repo, "node_modules/@react-pdf/renderer/package.json"))).version,
    head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    datePolicy: input.datePolicy, documentDate: input.documentDate,
    reference: input.details.reference_number, pdfBytes: pdf.length, pdfSha256: hash(pdf),
    pageCount: 1, embeddedImageCount: 2, browserBaselineRasterEqual: true,
    convexRuntimeVerified: false,
  };
  await writeFile(path.join(output, "runtime.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
} finally {
  await rm(temporary, { recursive: true, force: true });
}
