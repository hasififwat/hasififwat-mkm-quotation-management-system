import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { quotationPdfFixture } from "./fixtures/quotation-pdf.mjs";

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve("convex/package.json"))("esbuild");
const output = path.resolve(".next/quotation-pdf-browser");
await mkdir(output, { recursive: true });
await build({
  stdin: {
    contents: `import React from 'react';
import { createRoot } from 'react-dom/client';
import { pdf } from '@react-pdf/renderer';
import PDFPreview from './src/features/quotation/components/PDFPreview';
const fixture = ${JSON.stringify(quotationPdfFixture)};
function App() {
  const [state, setState] = React.useState('Ready');
  async function generate() {
    setState('Rendering');
    try {
      const blob = await pdf(PDFPreview({details: fixture, fileName: 'MKM-1448H-0062-R02.pdf'})).toBlob();
      const result = await fetch('/browser.pdf', {method: 'POST', body: blob});
      if (!result.ok) throw new Error('PDF capture failed');
      setState('Generated ' + blob.size + ' PDF bytes');
    } catch (error) { setState(String(error)); }
  }
  return React.createElement('main', null,
    React.createElement('h1', null, 'Quotation browser renderer check'),
    React.createElement('p', null, 'Synthetic fixture. Actual PDFPreview and React-pdf browser runtime. No backend.'),
    React.createElement('button', {onClick: generate}, 'Generate PDF'),
    React.createElement('p', {role: 'status'}, state),
    React.createElement('a', {href: '/browser.pdf'}, 'Open generated PDF'));
}
createRoot(document.getElementById('root')).render(React.createElement(App));`,
    resolveDir: process.cwd(), loader: "jsx",
  },
  bundle: true, platform: "browser", format: "esm", outfile: path.join(output, "client.js"),
  plugins: [{ name: "next-image-shape", setup(build) {
    build.onLoad({ filter: /\.png$/ }, async ({ path: filename }) => ({
      contents: `export default {src: ${JSON.stringify(`data:image/png;base64,${(await readFile(filename)).toString("base64")}`)}}`,
      loader: "js",
    }));
  } }],
});
const server = createServer(async (request, response) => {
  try {
    if (request.url === "/browser.pdf" && request.method === "POST") {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const bytes = Buffer.concat(chunks);
      if (bytes.subarray(0, 5).toString() !== "%PDF-") throw new Error("Expected PDF bytes");
      await writeFile(path.join(output, "browser.pdf"), bytes);
      response.end("saved");
    } else if (request.url === "/client.js" || request.url === "/browser.pdf") {
      response.setHeader("Content-Type", request.url.endsWith("pdf") ? "application/pdf" : "text/javascript");
      response.end(await readFile(path.join(output, request.url.slice(1))));
    } else {
      response.setHeader("Content-Type", "text/html");
      response.end('<!doctype html><html><head><title>Quotation PDF verification</title></head><body><div id="root"></div><script type="module" src="/client.js"></script></body></html>');
    }
  } catch (error) {
    response.statusCode = 500;
    response.end(String(error));
  }
});
server.listen(3162, "127.0.0.1", () => console.log("http://127.0.0.1:3162"));
