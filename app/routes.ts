import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/login.tsx"),
  route("/sign-up", "routes/sign-up.tsx"),
  route("/dashboard", "routes/dashboard.tsx"),
  route("/quotation", "routes/quotation.tsx"),
  route("/quotation-history", "routes/quotation-history.tsx"),
  route("/clients", "routes/clientlist.tsx"),
  route("/clients/create", "routes/clientform.tsx"),
  route("/packages", "routes/packagelist.tsx"),
  route("/packages/create", "routes/packagebuilder.tsx"),
] satisfies RouteConfig;
