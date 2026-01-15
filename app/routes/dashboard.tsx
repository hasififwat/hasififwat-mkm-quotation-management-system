import type { Route } from "./+types/dashboard";
import { ProtectedRoute } from "~/features/authentication /components/ProtectedRoute";
import { Dashboard } from "~/features/dashboard/components/Dashboard";

export function meta() {
  return [
    { title: "Dashboard" },
    { name: "description", content: "Your application dashboard" },
  ];
}

export default function DashboardPage() {
  return (
    <ProtectedRoute title="Dashboard">
      <Dashboard />
    </ProtectedRoute>
  );
}
