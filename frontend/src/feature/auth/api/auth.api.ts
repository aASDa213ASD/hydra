import { apiUrl } from "@/shared/lib/backend-url";
import type { User } from "@/feature/user/types/user";

type LoginResponse = {
  token: string;
};

type ApiErrorResponse = {
  error?: string;
};

export async function loginWithPassword(
  name: string,
  password: string
): Promise<LoginResponse> {
  const res = await fetch(apiUrl("/api/v1/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, password }),
  });

  const data = (await res.json()) as LoginResponse | ApiErrorResponse;

  if (!res.ok || !("token" in data) || typeof data.token !== "string") {
    throw new Error(
      "error" in data && typeof data.error === "string"
        ? data.error
        : "LOGIN_FAILED"
    );
  }

  return data;
}

export async function renameUser(token: string, name: string): Promise<User> {
  const res = await fetch(apiUrl("/api/v1/me/rename"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });

  const data = (await res.json()) as User | ApiErrorResponse;

  if (!res.ok || !("name" in data) || typeof data.name !== "string") {
    throw new Error(
      "error" in data && typeof data.error === "string"
        ? data.error
        : "RENAME_FAILED"
    );
  }

  return data;
}
