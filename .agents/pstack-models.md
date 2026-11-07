# pstack model configuration. One line per role. Delete a line to fall back to the skill default, subject to the project constraints below.
# `inherit-parent` or `auto` as a value: the role runs on the parent chat model (omit Task `model`). Alias entries in a panel list still count toward its fan-out.
# budget: medium (high)
# Sol reasoning cap: high for every role, including panels and fallbacks.
# Explicit model override: gpt-6.1-terra uses max reasoning.

feature, refactoring: gpt-6.1-sol
bug-fix: gpt-6.1-sol
perf-issue: gpt-6.1-sol
hillclimb: gpt-6.1-sol
judgment and prose: gpt-6.1-sol
hardest tasks: gpt-6.1-sol
how explorer: gpt-6.1-terra
how explainer: gpt-6.1-sol
why investigators: gpt-6.1-sol
why synthesizer: gpt-6.1-sol
reflect tooling: gpt-6.1-terra
reflect judgment, divergent, synthesizer: gpt-6.1-sol
arena runners: gpt-6.1-sol, gpt-6.1-sol
arena cross-judge pool: gpt-6.1-sol, gpt-6.1-sol
swarm workers: gpt-6.1-terra
architect runners: gpt-6.1-sol, gpt-6.1-sol
interrogate reviewers: gpt-6.1-sol, gpt-6.1-sol

## T3 provider options

Both models use provider instance `codex`. Keep effort and speed separate from
the exact model ID. Select `target.model` from the role line, then set
`target.options` using this table:

| Exact model ID | reasoningEffort | serviceTier |
| --- | --- | --- |
| `gpt-6.1-sol` | `high` | `default` |
| `gpt-6.1-terra` | `max` | `default` |

For a Terra role, the T3 delegation target is:

```json
{
  "target": {
    "providerInstanceId": "codex",
    "model": "gpt-6.1-terra",
    "options": {
      "reasoningEffort": "max",
      "serviceTier": "default"
    }
  }
}
```

These values were confirmed in the live T3 orchestrator catalog during setup.
The service tier preserves the parent session's standard speed setting.

## Project constraints

- All roles use Codex, as selected during setup. Keep fallbacks within the
  `codex` provider; changing providers requires a new user choice.
- The `medium` budget selects `high` reasoning for Sol. Every Sol role,
  including panel entries and fallbacks, is capped at `high`; task-specific
  effort adjustments must never raise Sol above `high`. Preserve this cap
  when re-running setup unless the user changes it. Terra's explicit `max`
  setting takes precedence over the budget preset and automatic effort
  reductions for routine tasks. Preserve this model-specific override when
  re-running setup unless the user changes it. There are no additional speed
  caps.
- Duplicate entries in `arena runners`, `architect runners`, and `interrogate
  reviewers` are intentional: each panel runs two independent agents using the
  same model. The cross-judge pool still selects at most one judge.
- Arena requires a judge from a different family than the parent. With a
  Codex parent, skip the cross-judge and let the parent select the base. Do not
  fall back to the upstream Claude/Grok judge pool under this Codex-only
  configuration. With a parent from another family, the configured Codex judge
  is eligible.

This rule applies when using this repository's pstack skills. Re-running the
project-local setup skill updates this file.
