# Issue 39 verification

Staff need continuous quotation pricing rows when package names or prices wrap.

Tested product commit `27d74214270a3ccbcb751e1166173f2a8f6ea3c7`.
Baseline commit `5d9745e0` with reproduction artifact commit `69590b0d`.

The isolated Next.js fixture at http://127.0.0.1:3939/ imports the actual
PDFPreviewMobile and PDFPreview components. Synthetic data passes
quotationFullDetailsSchema.parse. It has no environment file, authentication,
cloud connection, or backend writes. The fixture source lives outside the app
at `/private/tmp/mkm-issue39-fixture`. This verifies components with fixtures,
not the full authenticated journey or persistence.

At the 1402 × 876 browser viewport, package wrapping produced:

```text
Before heights [34,21.5,21.5,21.5], pass false
After heights [34,34,34,34], pass true
```

The same reusable `scripts/check-pricing-row.mjs` browser function checks equal
top and bottom edges, adjacent cell edges, bottom borders, the total background,
and total-column alignment through add-on, discount, and grand total rows.
Import the function into a browser evaluator or paste it without `export`, then
call `checkPricingRow(document.querySelector('#package'))` on the fixture.

All five cases passed after the fix. The short case stays at 21.5px. One room
with a wrapped package stays aligned at 34px. Six rooms force price wrapping
and all eight cells reach 34px. Long room headers wrap in a shared header row.
Before the fix, all except the short-label control failed. Values remain
RM1,200 × 2 and RM1,800 × 1, RM4,200 subtotal, TRANSFER +RM25, PROMO -RM25,
and RM4,200 grand total.

The fixture at http://127.0.0.1:3939/review mounts actual ReviewClient.
At 390 × 844 its scaled pricing cells all measured 14.68765px and shared bottom
152.09320px. At 1440 × 900 the desktop PDF iframe rendered successfully.
The actual PDF blob downloaded through the browser and rendered to pdf.png.
It has one page, continuous pricing borders, and the expected values.
PDFPreview.tsx remains unchanged.

Images were visually inspected. before.png shows the gap above TRANSFER;
after.png shows continuous borders and subtotal background. mobile.png shows
the actual scaled mobile review. desktop.png shows the actual PDF iframe.
pdf.png is a raster of the downloaded PDF, not a browser print of the HTML.

`node_modules/.bin/tsc --noEmit` passed after generating the standard ignored
Next type references. Scoped ESLint passed with two existing no-img-element
warnings. `git diff --check` passed. The local deslop and control-ui skills
were unavailable. The source diff and comments were manually inspected.
No agents were spawned, per the implementation brief.

Model the Domain led to shared header and data rows. Fix Root Causes removed
independent content sizing. Laziness Protocol kept the product edit within
PDFPreviewMobile. Prove It Works led to failing and passing browser geometry,
the mobile review fixture, and inspection of the real PDF.

The fixture route never entered the shipping app source. No cloud fixtures
need deletion. The parent independently reproduced the failure, copied the corrected component
into the same isolated Next fixture, reloaded, and confirmed heights
`[34,34,34,34]`, aligned totals, and continuous borders at
`http://localhost:3129/layout-fixture?verify=after`. Parent typecheck, scoped lint,
and diff checks passed. An independent source and comment review found no material
correctness issue. Both owned servers on ports 3129 and 3939 were stopped after
verification. The parent tab was closed. No cloud records were written.
The implementation fixture manifest is `/private/tmp/mkm-issue39-fixture/run.json`.

After migration advanced to f8d8e2bc, the branch was rebased and all five
component geometry cases and typecheck passed again on the recorded product commit.
The product component is identical before and after that rebase.
