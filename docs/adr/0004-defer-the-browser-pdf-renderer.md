# Defer the browser PDF renderer

Load the desktop quotation PDF pane as a client-only dynamic module so the PDF renderer stays out of the review page’s initial bundle. Keep the browser Buffer alias for the renderer’s internal Buffer dependency. The mobile review uses a scaled HTML preview.

[Review page client](../../src/app/(protected)/quotations/review/%5Bqid%5D/review-client.tsx) · [Next.js bundler configuration](../../next.config.ts)
