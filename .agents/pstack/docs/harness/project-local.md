# Project-local pstack

This repository contains a pinned pstack package in `.agents/pstack/`.
`upstream.json` records its source commit and version. Relative directory
links in `.agents/skills/` expose the skills to Codex without depending on a
user plugin cache. Resolve links before reading sibling skills or resources.

This adapter overrides upstream installation paths and host-specific tool
examples. Follow the current session's tool contracts and project instructions
when they differ from upstream guidance.

## Project scope

Resolve paths from the repository root, including when working in a subfolder.

| Upstream location or reference | Use in this repository |
| --- | --- |
| Installed pstack package or user plugin cache | `.agents/pstack/` |
| Pstack skill | `.agents/pstack/skills/<name>/SKILL.md` |
| Global `pstack-models.mdc` or `pstack-models.md` | `.agents/pstack-models.md` |
| Generated project verification or other new skill | `.agents/skills/<name>/` |
| Pstack's agent definitions | `.agents/pstack/agents/` |

Read `.agents/pstack-models.md` before model selection when it exists. If it
does not exist, use `setup-pstack` when the user requests model configuration.
Until then, upstream defaults still require validation against the host's
available models. Do not substitute a global model configuration or change
user-level skills, rules, or plugin registrations as part of this local setup.

Use the local `setup-pstack` skill to change model settings. Store role choices,
provider-specific options, and any effort caps in `.agents/pstack-models.md`.
Keep model assignments out of `AGENTS.md` and `CLAUDE.md`.

The upstream README and guide describe the standard plugin installation.
Their global setup paths do not apply to this repository copy. In Claude Code,
read the bundled Claude adapter for tool mappings, then apply this document's
project paths instead of its global paths.

## T3 and Codex

- A pstack `/name` invocation means the local skill. In Codex it can be
  invoked as `$name`. Read its canonical `SKILL.md` and relevant resources.
- Use the available plan and question tools for upstream todo lists and
  `AskQuestion`. Ask only for decisions that the current task leaves open.
- Upstream `Task` instructions mean a subagent through the host's supported
  delegation tools. Follow the session's delegation rules. Installation alone
  is not a request to spawn agents or run a pstack workflow.
- Before the first T3 delegation, discover the provider/model catalog with
  `orchestrator_capabilities`. Model IDs must match that catalog exactly.
  Record effort and speed as provider options, not invented model-ID suffixes.
  For example, Codex uses `reasoningEffort` and Claude uses `effort` when those
  options are exposed by the live catalog. Apply a budget to supported effort
  options rather than modifying the model ID. Do not silently switch an
  unavailable provider or model.
- `poteto-agent` and `comment-sicko` are bundled instruction files, not assumed
  native agent types. When a workflow calls for one, include the corresponding
  definition, this adapter, and required local skill paths in the delegate's
  brief. The parent retains the workflow and reviews delegate results.
- Cursor Custom Modes, Automations, Bugbot, and `/loop` are not supplied by
  this skill installation. Use host equivalents only when available and within
  the user's request; report a required unavailable capability directly.

Codex invocation policies in each skill's `agents/openai.yaml` preserve
upstream explicit invocation. `setup-pstack` remains discoverable from a
request to configure pstack. Original Cursor presentation and path metadata,
where present, is retained under `SKILL.md` metadata.
