# Appearance

Users can switch between light and dark themes from login, account creation,
or the authenticated sidebar, and keep their choice after reloading.

## Sub-features

- `theme-login`: the login button changes the visible theme.
- `theme-persist`: a reload preserves that choice.
- `theme-signup`: the account page uses the same stored preference.

## How to get to it (user POV)

- Visit `/` and use the top-right `Toggle theme` button.
- Visit `/sign-up` and use its `Toggle theme` button.
- Authenticated users have a separate sidebar theme control; inspect its current
  accessible name before driving that entry point.

## Driving it with T3 preview

Preconditions: doctor passes, an owned private tab uses this run's port, and the
login form has hydrated. No account or database fixture is required.

- **Baseline.** Navigate to `/`, snapshot, and read
  `({dark:document.documentElement.classList.contains('dark'),stored:localStorage.getItem('theme')})`.
- **Toggle.** Click `Toggle theme` using its snapshot ARIA ref, or
  `selector: 'button[aria-label="Toggle theme"]'`. Read the same state again:
  `dark` must invert and `stored` must match (`dark` or `light`). Save before/after
  snapshots and PNGs; the action timeline must show the click.
- **Persist.** Navigate to the same `/` URL again, wait for `Email`, and require
  both values to match the post-click state. Save the reload proof.
- **Other entry.** Navigate to `/sign-up`, wait for `Full Name`, require the same
  theme, and repeat the toggle/persist check there if that entry is in scope.
- **Restore.** Toggle back if retaining the tab; otherwise close this private
  verification tab during cleanup.

## Gotchas

- The provider initially returns no children until its mounting effect runs.
  A 200 response or an empty body before hydration is not a theme pass.
- With no stored preference, the initial theme follows the browser's system
  appearance. Compare against the observed baseline, not an assumed light mode.
- Reading storage proves the side effect; changing it through JavaScript would
  bypass the feature and invalidate the proof.
