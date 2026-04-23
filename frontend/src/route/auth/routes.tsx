import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import { SilentSuspense } from "@/app/router/suspense";
import { AuthRoute } from "@/app/router/guards";

const TerminalPage = lazy(() => import("@/App"));
const ChannelPage = lazy(() => import("@/route/channel/page"));
const LoginPage = lazy(() => import("@/route/auth/login/page"));
const LogoutPage = lazy(() => import("@/route/auth/logout/page"));

export const authRoutes: RouteObject[] = [
  {
    path: "/",
    element: (
      <SilentSuspense>
        <AuthRoute>
          <TerminalPage />
        </AuthRoute>
      </SilentSuspense>
    ),
  },
  {
    path: "/login",
    element: (
      <SilentSuspense>
        <LoginPage />
      </SilentSuspense>
    ),
  },
  {
    path: "/channel/:id",
    element: (
      <SilentSuspense>
        <AuthRoute>
          <ChannelPage />
        </AuthRoute>
      </SilentSuspense>
    ),
  },
  {
    path: "/logout",
    element: (
      <SilentSuspense>
        <LogoutPage />
      </SilentSuspense>
    ),
  },
];
