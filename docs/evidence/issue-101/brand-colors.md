# MKM brand color review

The starting point was `b569cbb6`. The revised palette was tested at `24342ff86980f651e13aeee7e43307bc5c3af5e6` on `http://localhost:3547` with disposable Convex records.

## Palette

The most common opaque saturated blue in the small logo was `#253AD0`. The red slash sampled as `#C90601` in the small mark and `#CD0100` in the white wordmark. [MKM mark](https://mkm.my/wp-content/uploads/2026/06/cropped-MKM-01-192x192.webp) · [MKM wordmark](https://mkm.my/wp-content/uploads/2025/11/Logo-MKM.webp)

| Role | Light theme | Dark theme |
| --- | --- | --- |
| Primary actions | `#253AD0` | `#7396FF` |
| Quiet secondary fills | `#F2E4E2` | `#463836` |
| Primary button label contrast | 8.09:1 | 6.21:1 |
| Secondary label contrast | 8.22:1 | 8.56:1 |

The dark primary uses a stronger blue after the initial periwinkle was reconsidered. Hover and focus colors use the same blue family. The subdued secondary fills reflect the red slash. Stronger red identifies errors and destructive controls. The seasonal pricing count uses the same blue as primary controls.

## Browser checks

The six color-role checks went from 0 of 6 to 6 of 6 over four passes. Each theme checks primary and secondary against the logo hues and checks the rendered pricing counter. All 20 sampled contrast pairs met their text or focus thresholds. [Decisions](brand-decisions.tsv) · [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) · [W3C non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)

All 22 page and fallback entry points rendered at desktop and mobile sizes in both themes. The CSS viewport widths observed during the sweep were 356, 390, 1168, 1280 px. The browser also exercised sign-in, sign-out, the seasonal counter after CSV upload, and blank and invalid login. The login screenshot shows the error after both fields were cleared.

The production build, TypeScript, scoped lint, 159 regression tests, and the quotation PDF raster comparison passed. The browser tab and isolated server closed, and the disposable database was removed.

- [Dark package list](brand-packages-dark.png)
- [Light clients list](brand-clients-light.png)
- [Tablet package editor](brand-package-builder-tablet.png)
- [Dark mobile login error](brand-login-error-mobile.png)
