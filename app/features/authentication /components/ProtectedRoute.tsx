import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuthentication } from "~/features/authentication /provider/AuthenticationProvider";
import { SidebarLayout } from "~/layout/SidebarLayout";

interface ProtectedRouteProps {
  children: React.ReactNode;
  title?: string;
}

export function ProtectedRoute({ children, title }: ProtectedRouteProps) {
  const { user, loading } = useAuthentication();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full size-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <SidebarLayout title={title}>{children}</SidebarLayout>;
}
