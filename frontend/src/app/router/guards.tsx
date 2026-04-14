import { Navigate } from "react-router-dom";
import { useAuth } from "@/feature/auth/hooks/use-auth";
import { JSX, ReactNode } from "react";

export function AuthRoute({ children }: { children: JSX.Element }) {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

type RoleRouteProps = {
  roles: string[];
  children: JSX.Element;
};

export function RoleRoute({ roles, children }: RoleRouteProps) {
  const { user, token, isLoading } = useAuth();

  const hasAccess = user?.roles?.some((r: string) => roles.includes(r));

  if (isLoading) {
    return null;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAccess) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

type IfRoleProps = {
  roles: string[];
  children: ReactNode;
};

/**
 * Meant to conditionally render elements based on role
 */
export function IfRole({ roles, children }: IfRoleProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  const hasAccess = user?.roles?.some((r: string) => roles.includes(r));
  if (!hasAccess) return null;

  return <>{children}</>;
}
