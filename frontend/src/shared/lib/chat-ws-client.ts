import { backendUrl } from "@/shared/lib/backend-url";

type WsEvent =
  | { op: "auth_ok"; user: string }
  | { op: "joined"; channel: string }
  | { op: "left"; channel: string }
  | { op: "message"; channel: string; from: string; text: string; ts?: string }
  | {
      op: "bootstrap_lines";
      channel: string;
      lines: Array<{ text: string }>;
    }
  | { op: "join_notice"; channel: string; text: string }
  | { op: "leave_notice"; channel: string; text: string }
  | { op: "error"; error: string }
  | { op: "pong" }
  | { op: string; [key: string]: unknown };

type ChatWsHandlers = {
  onOpen?: () => void;
  onClose?: () => void;
  onEvent?: (event: WsEvent) => void;
};

function getWebSocketUrl(): string {
  if (!backendUrl) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.hostname}:8081`;
  }

  const url = new URL(backendUrl);
  const protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${url.hostname}:8081`;
}

export class ChatWsClient {
  private socket: WebSocket | null = null;

  constructor(private readonly handlers: ChatWsHandlers = {}) {}

  connect(token: string) {
    this.disconnect();

    const wsUrl = getWebSocketUrl();
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      this.send({ op: "auth", token });
      this.handlers.onOpen?.();
    };

    this.socket.onclose = () => {
      this.handlers.onClose?.();
    };

    this.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as WsEvent;
        this.handlers.onEvent?.(payload);
      } catch {
        this.handlers.onEvent?.({ op: "error", error: "INVALID_WS_PAYLOAD" });
      }
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  send(payload: Record<string, unknown>) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify(payload));
  }
}
