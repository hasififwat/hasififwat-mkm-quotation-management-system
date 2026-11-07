# Issue 7 verification

## Failing reproduction

On 2026-11-07, a fresh browser tab authenticated against `glad-wombat-72` on an isolated local Next.js run at port 3107. Source commit was `e98314b847fd7813de30a068f8a23e0efa470d28`.

The browser opened Clients and clicked New Client. The resulting DOM read was:

```json
{"inputs":0,"text":"Toggle Sidebar\nClient Create Page","url":"http://127.0.0.1:3107/clients/create"}
```

The route had no client inputs or save control. This reproduces [issue #7](https://github.com/hasififwat/hasififwat-mkm-quotation-management-system/issues/7).

This is a browser integration journey. A synthetic route-content unit test would duplicate the placeholder rather than verify the usable workflow. Passing evidence must include a real save, a second listing view, and reload.
