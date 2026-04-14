import { createBrowserRouter, type RouteObject } from "react-router-dom";

import { authRoutes } from "@/route/auth/routes";

const routes: RouteObject[] = [...authRoutes];

export const router = createBrowserRouter(routes);
