# Authentication and agent accounts

An agent signs in with email/password, reaches packages, and signs out through
the sidebar. A signed-in agent can also create another agent account.

## Sub-features

- `login-required`: blank credentials are rejected by native input validation.
- `login-success`: valid credentials lead to `/packages`.
- `protected-entry`: an anonymous protected entry returns to `/`.
- `sign-out`: the sidebar clears auth and returns to login.
- `agent-create`: the account form validates and creates an agent.

## How to get to it (user POV)

- Open `/` for `Login to your account`.
- Open `/packages` while signed out to exercise the protected entry.
- Use the sidebar `Sign Out` button after login.
- Open `/sign-up` for `Create Agent Account`; `Back to Packages` returns to the
  protected area. The registration mutation requires an existing identity.

## Driving it with T3 preview

Preconditions: anonymous validation needs only the hydrated login page. Successful
login/sign-out need a verification account; account creation needs disposable
backend state and credentials supplied through private secret entry.

- **Required fields.** At `/`, leave `#email` and `#password` blank and click
  `Login` from the snapshot. Read
  `({emailMissing:document.querySelector('#email').validity.valueMissing,passwordMissing:document.querySelector('#password').validity.valueMissing,path:location.pathname})`.
  Both flags must be true, path must remain `/`, and no sign-in request should
  appear. Save the snapshot and action timeline without credential fields filled.
- **Login.** Fill the `Email` and `Password` controls (`#email`, `#password`), click
  `Login`, and require `/packages` with `Travel Packages`. Clear or exclude
  credentials from artifacts. A `Logging in...` state alone does not pass.
- **Protected entry.** In a fresh anonymous tab, navigate to `/packages`; require
  login controls and URL `/`. This proves UI navigation only, not backend access
  control. Server-rendered children may query the backend before the client guard.
- **Sign out.** Use sidebar `Sign Out`, then navigate back to `/packages` and
  require the anonymous redirect. Visiting `/logout` alone does not clear auth.
- **Account form.** At `/sign-up`, labels are `Full Name`, `Branch`,
  `Unit (optional)`, `Email`, `Password`, and `Confirm Password`. Two different
  synthetic passwords of at least eight characters must show `Passwords do not
  match` without creating an account. For an authorized disposable creation,
  matching passwords and `Create Account` must show `Account created
  successfully! The agent can now sign in.`; sign in with that account separately
  to prove the claim. Track fixture deletion through the deployment owner.

## Gotchas

- The anonymous appearance/required-field run does not verify successful login.
- `/logout` only redirects; the sidebar invokes Convex `signOut()` first.
- Password-provider setup and a usable agent must already exist on the backend.
  Do not silently register a new cloud account as verification scaffolding.
- Client redirects do not prove that Convex mutations reject anonymous callers.
  Use `$verify-quotation-integrity` for the local quotation-handler checks.
