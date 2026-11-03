# Packages

Agents browse and search Umrah packages, then open a new-package builder or
import packages from a flight schedule.

## Sub-features

- `package-list`: the list displays the known fixture package.
- `package-search`: a name search changes the results and `q` URL parameter.
- `package-create-open`: both creation entry points open their expected page.

## How to get to it (user POV)

- Choose `Packages` in the sidebar or open `/packages`.
- Open `Create Package` and choose `Create New Package` (`/packages/create`).
- From that menu choose `Import from flight schedule`
  (`/packages/create-from-schedule`).

## Driving it with T3 preview

Preconditions: verification agent is signed in; the disposable deployment has
one package with a known name. Record the actual fixture name in proof metadata.

- **List.** Navigate to `/packages` and require `Travel Packages` plus that
  fixture's visible row/card after loading finishes.
- **Search.** Type its name into the input with placeholder
  `Search by package name...`. Wait for the debounced navigation and require the
  `q` parameter and matching result. A deliberately nonmatching name must show
  no fixture result; clearing the field must restore it.
- **Manual builder.** Click `Create Package`, then `Create New Package`. Require
  `/packages/create`, heading `Create Package`, and the `Name` and `Duration`
  fields. This proves opening only; creating a package additionally requires
  completing the current wizard and reopening the saved record from the list.
- **Schedule entry.** Return to `/packages`, open the same menu, and choose
  `Import from flight schedule`. Require `/packages/create-from-schedule` and
  the import UI; do not submit an import to the shared deployment.

## Gotchas

- No package rows is an unmet fixture precondition for this search journey.
- The search is debounced; a typed value without the resulting URL/list update
  is incomplete evidence.
- Completing the wizard/import requires a disposable backend. Do not claim
  persistence from merely opening either creation page.
