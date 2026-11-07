# Issue 7 verification

## Failing reproduction

On 2026-11-07, a fresh browser tab authenticated against `glad-wombat-72` on an isolated local Next.js run at port 3107. Source commit was `e98314b847fd7813de30a068f8a23e0efa470d28`.

The browser opened Clients and clicked New Client. The resulting DOM read was:

```json
{"inputs":0,"text":"Toggle Sidebar\nClient Create Page","url":"http://127.0.0.1:3107/clients/create"}
```

The route had no client inputs or save control. This reproduces [issue #7](https://github.com/hasififwat/hasififwat-mkm-quotation-management-system/issues/7).

This is a browser integration journey. A synthetic route-content unit test would duplicate the placeholder rather than verify the usable workflow. Passing evidence must include a real save, a second listing view, and reload.

## Visual verification

Reviewing the captured UI exposed a narrow form caused by the standalone page
occupying only one column of its parent grid. The page now spans all 12 columns.
The browser confirmed both inputs render at 464 pixels wide on desktop.

The following captures show the original failure and the corrected Preview.
The corrected application source is commit `0db3f89a22d5f7c728f59bea31056226c8d27eb5`.
It was deployed from a clean worktree to
https://mkm-next-migration-preview-dfk0q18zo-hasififwats-projects.vercel.app,
deployment `dpl_3NmsJsjzaSxhAwSeXvrMTkaMmWXr` in `mkm-next-migration-preview`.
Browser requests confirmed `https://glad-wombat-72.convex.cloud`.

- [Original placeholder](issue-7/before.png).
- [Usable form](issue-7/form.png).
- [Visible API rejection with preserved input](issue-7/error.png).
- [Saved client in Clients after reload](issue-7/reload.png).

The visual run created `QA-I7-20261107-0612-visual`, ID
`j5747t4nxn42hzj5s7d0m20mkx8hr52n`. After capturing the reload result, cleanup
checked the exact name, phone, and zero linked quotations, deleted only that ID,
and confirmed it absent. Earlier modal and standalone persistence evidence is
recorded in issue #7. This follow-up changes only the standalone grid span.

`AGENTS.md` now requires screenshots or video that render directly in UI PRs,
along with the tested preview, commit, and fixture cleanup.
