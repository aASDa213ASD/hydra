const rawBackendUrl = import.meta.env.VITE_BACKEND_URL ?? "";

export const backendUrl = rawBackendUrl.replace(/\/$/, "");

export const apiUrl = (path: string) => {
  if (!backendUrl) {
    return path;
  }

  if (path.startsWith("/")) {
    return `${backendUrl}${path}`;
  }

  return `${backendUrl}/${path}`;
};
