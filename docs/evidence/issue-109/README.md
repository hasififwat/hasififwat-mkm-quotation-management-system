# MKM sign-in verification

## Animated quotation demo

The production build of `6610de6a06a219a9227ce3099137c737ae67b8f9` ran at `http://127.0.0.1:3509/`. The demo uses a fictional 12-day Umrah package to show package selection, room pricing, and quotation review.

![The sign-in screen cycles through the three quotation demo steps](quotation-demo.gif)

[Desktop review](desktop-review.png) · [Phone pricing in dark mode](phone-pricing-dark.png) · [Verification results](demo-verification.json)

Chromium verified autoplay, pause and resume, manual step selection, and the RM 15,800.00 total. On a narrow phone, playback waited until the demo entered the viewport. With reduced motion, the demo started paused and each step appeared without an animation when selected.

The form rejected blank fields, kept keyboard focus after an invalid sign-in, and reached **Travel Packages** on a successful retry. The session survived reload. The run stopped the local services and removed the disposable Convex database, account, and signing keys.

## First layout iteration

The local preview ran at `http://127.0.0.1:3509/`. The baseline was `851ec67c4a3cace5333c35232b83581a6cf92aac`. The refreshed screen ran from production build `0578df1b55c7182aa99fff3e6216f9f40e303e0b`.

| State | Desktop | Phone |
| --- | --- | --- |
| Before | [Light](before-desktop.png) | [Light](before-phone.png) |
| After | [Light](desktop-light.png), [dark](desktop-dark.png) | [Light](phone-light.png), [dark](phone-dark.png), [dark with invalid credentials](phone-dark-error.png) |

Chromium verified the split or stacked layout at 1,440, 1,024, 768, 390, and 320 CSS pixels. It checked horizontal overflow, keyboard focus, and theme persistence after reload. The before screenshot on mobile shows a 390 × 844 viewport on the baseline production build.

Blank and malformed credentials triggered browser validation without an auth request. While the first auth request was held, pressing Enter again sent no duplicate request. The failed attempt kept focus on the password field. A retry with the disposable account opened **Travel Packages**, and the session survived reload. [Required-field focus](phone-dark-required.png) · [Pending state with masked inputs](phone-dark-pending.png)

The production build, TypeScript, scoped ESLint, and 32 package/auth tests passed. The full suite reported 721 passes and the same 13 quotation-save test failures on both commits. The run stopped the local servers and removed the disposable Convex database, account, and signing keys. [Browser measurements and command results](verification.json)
