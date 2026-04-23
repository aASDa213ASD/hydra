import { apiUrl } from "@/shared/lib/backend-url";
import type { User } from "@/feature/user/types/user";

type LoginResponse = {
  token: string;
};

type ApiErrorResponse = {
  error?: string;
};

type ChannelResponse = {
  ok: boolean;
  channel: {
    name: string;
  };
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

  const data = (await readApiBody(res)) as LoginResponse | ApiErrorResponse;

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

  const data = (await readApiBody(res)) as User | ApiErrorResponse;

  if (!res.ok || !("name" in data) || typeof data.name !== "string") {
    throw new Error(
      "error" in data && typeof data.error === "string"
        ? data.error
        : "RENAME_FAILED"
    );
  }

  return data;
}

export async function channelCreate(
  token: string,
  name: string
): Promise<ChannelResponse> {
  const res = await fetch(apiUrl("/api/v1/channel/create"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });

  const data = (await readApiBody(res)) as ChannelResponse | ApiErrorResponse;

  if (!res.ok || !("ok" in data) || data.ok !== true) {
    throw new Error(
      "error" in data && typeof data.error === "string"
        ? data.error
        : "CHANNEL_CREATE_FAILED"
    );
  }

  return data;
}

export async function channelJoin(
  token: string,
  name: string
): Promise<ChannelResponse> {
  const res = await fetch(apiUrl("/api/v1/channel/join"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });

  const data = (await readApiBody(res)) as ChannelResponse | ApiErrorResponse;

  if (!res.ok || !("ok" in data) || data.ok !== true) {
    throw new Error(
      "error" in data && typeof data.error === "string"
        ? data.error
        : "CHANNEL_JOIN_FAILED"
    );
  }

  return data;
}

async function readApiBody(res: Response): Promise<unknown> {
  const raw = await res.text();
  if (raw.trim() === "") {
    return {};
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    if (!res.ok) {
      throw new Error(`HTTP_${res.status}: ${raw.slice(0, 240)}`);
    }

    throw new Error("INVALID_JSON_RESPONSE");
  }
}
