import {
  type RouteConfig,
  index,
  route,
  layout,
} from "@react-router/dev/routes";

export default [
  route(
    "/.well-known/appspecific/com.chrome.devtools.json",
    "routes/chrome-devtools.ts",
  ),
  index("routes/login.tsx"),

  route("/sign-up", "routes/sign-up.tsx"),
  route("/logout", "routes/logout.tsx"),

  layout("routes/_protected.tsx", [
    route("dashboard", "routes/_protected/dashboard.tsx"),
    route("/packages", "routes/_protected/package.index.tsx"),
    route("/packages/create", "routes/_protected/package.create.tsx"),
    route("/packages/edit/:pid", "routes/_protected/package.edit.tsx", {
      id: "package-edit",
    }),
    route("/clients", "routes/_protected/client.index.tsx"),
    route("/clients/create", "routes/_protected/client.create.tsx"),
    route("/quotations", "routes/_protected/quotation.index.tsx"),
    route("/quotations/create", "routes/_protected/quotation.create.tsx"),
    route("/quotations/edit/:qid", "routes/_protected/quotation.edit.tsx", {
      id: "quotation-edit",
    }),
    route("/quotations/review/:qid", "routes/_protected/quotation.review.tsx", {
      id: "quotation-review",
    }),
  ]),
] satisfies RouteConfig;
