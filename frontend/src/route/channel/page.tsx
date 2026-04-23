import {
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "@/feature/auth/hooks/use-auth";
import {
  type CommandDef,
  useTerminalSession,
} from "@/shared/hooks/use-terminal-session";
import { ChatWsClient } from "@/shared/lib/chat-ws-client";
import CLILayout from "@/shared/layouts/CLILayout";

export default function ChannelPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const wsClientRef = useRef<ChatWsClient | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const [caretIndex, setCaretIndex] = useState(0);
  const [statusTime, setStatusTime] = useState(() =>
    new Date().toTimeString().slice(0, 8)
  );

  const channel = (() => {
    const rawId = (id ?? "").trim();
    if (!rawId || !/^[A-Za-z0-9._-]{1,32}$/.test(rawId)) {
      return null;
    }
    return `#${rawId}`;
  })();
  useEffect(() => {
    const interval = window.setInterval(() => {
      setStatusTime(new Date().toTimeString().slice(0, 8));
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const serverCommands: Record<string, CommandDef> = useMemo(
    () => ({
      leave: {
        usage: "leave           leave current channel",
        fn: () => {
          if (channel) {
            wsClientRef.current?.send({ op: "leave", channel });
          }
          navigate("/");
        },
      },
      exit: {
        usage: "exit            leave channel screen",
        fn: () => {
          if (channel) {
            wsClientRef.current?.send({ op: "leave", channel });
          }
          navigate("/");
        },
      },
    }),
    [channel, navigate]
  );

  const session = useTerminalSession({
    prompt: channel ? `[${channel}]` : "[#channel]",
    initialLines: [],
    serverCommands,
  });

  useEffect(() => {
    if (!token || !channel) {
      wsClientRef.current?.disconnect();
      wsClientRef.current = null;
      return;
    }

    const client = new ChatWsClient({
      onEvent: (event) => {
        if (event.op === "auth_ok") {
          client.send({ op: "join", channel });
          return;
        }

        if (event.op === "joined") {
          return;
        }

        if (event.op === "bootstrap_lines") {
          const payloadLines = Array.isArray(event.lines) ? event.lines : [];
          payloadLines.forEach((line, index) => {
            if (!line || typeof line.text !== "string") {
              return;
            }

            session.appendLine({
              id: `bootstrap-${Date.now()}-${index}-${Math.random()
                .toString(36)
                .slice(2, 6)}`,
              type: "system",
              text: line.text,
            });
          });
          return;
        }

        if (event.op === "left") {
          session.appendStdout(`left ${event.channel}`);
          return;
        }

        if (event.op === "join_notice") {
          session.appendStdout(event.text);
          return;
        }

        if (event.op === "leave_notice") {
          session.appendStdout(event.text);
          return;
        }

        if (event.op === "message") {
          const isSelf = event.from === (user?.name ?? "");
          session.appendLine({
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type: "stdout",
            text: "",
            content: (
              <span>
                <span className={isSelf ? "text-blue-500" : "text-red-400"}>
                  {"<"}
                </span>
                {event.from}
                <span className={isSelf ? "text-blue-500" : "text-red-400"}>
                  {">"}
                </span>{" "}
                {event.text}
              </span>
            ),
          });
          return;
        }

        if (event.op === "error") {
          session.appendStderr(`ws error: ${event.error}`);
        }
      },
    });

    wsClientRef.current = client;
    client.connect(token);

    return () => {
      client.disconnect();
      if (wsClientRef.current === client) {
        wsClientRef.current = null;
      }
    };
  }, [channel, session.appendLine, session.appendStderr, token, user?.name]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ block: "end" });
  }, [session.lines]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!channel) {
    return <Navigate to="/" replace />;
  }

  const submitChannelInput = (rawValue: string) => {
    const text = rawValue.trim();
    if (!text) {
      session.submit(rawValue);
      return;
    }

    const isCommand =
      text.startsWith("/") ||
      text.startsWith("channel ") ||
      text === "leave" ||
      text === "exit";
    if (isCommand) {
      session.submit(text.startsWith("/") ? text.slice(1) : text);
      return;
    }

    wsClientRef.current?.send({
      op: "message",
      channel,
      text,
    });
    session.setInput("");
    setCaretIndex(0);
  };

  const syncCaretIndex = () => {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    const index = input.selectionStart ?? session.input.length;
    setCaretIndex(Math.max(0, Math.min(index, session.input.length)));
  };

  return (
    <CLILayout>
      <div className="flex h-screen max-h-screen flex-col overflow-hidden bg-black font-mono text-white">
        <div className="flex-1 overflow-y-auto px-6 py-6 whitespace-pre-wrap break-words">
          {session.lines.map((line) => {
            if (line.type === "stderr") {
              return (
                <p key={line.id} className="m-0">
                  {line.content ?? line.text}
                </p>
              );
            }

            if (line.type === "command") {
              return (
                <p key={line.id} className="m-0">
                  <span>{line.prompt}</span>{" "}
                  <span>{line.hidden ? "" : line.command}</span>
                </p>
              );
            }

            return (
              <p key={line.id} className="m-0">
                {line.content ?? line.text}
              </p>
            );
          })}
          <div ref={chatBottomRef} />
        </div>
        <div className="pointer-events-none shrink-0 px-6 py-2">
          <div className="bg-blue-800 px-3 py-1">
            <div className="flex items-center justify-left gap-6">
              <span>{statusTime}</span>
              <span>@{user?.name ?? "nobody"} (+w)</span>
              <span>{channel}</span>
            </div>
            <div className="flex items-center justify-left gap-6">
              <span>Lag 0</span>
              <span>0/1</span>
              <span>N/0</span>
              <span>I/0</span>
              <span>V/0</span>
              <span>F/0</span>
            </div>
          </div>
        </div>
        <form
          className="shrink-0 bg-black px-6 pb-3 text-white"
          onSubmit={(event) => {
            event.preventDefault();
            submitChannelInput(session.input);
          }}
          onClick={() => inputRef.current?.focus()}
        >
          <div className="flex items-center gap-2">
            <span className="shrink-0">{session.prompt}</span>
            <div
              className="relative min-w-0 flex-1"
              onClick={() => inputRef.current?.focus()}
            >
              <pre className="m-0 whitespace-pre-wrap break-words">
                {session.input.length === 0 ? (
                  <>
                    <span className="inline-block h-[1em] w-[1ch] -mr-[1ch] align-middle bg-current opacity-70 mix-blend-difference animate-[caret-blink_1.0s_cubic-bezier(0,0,1,1)_infinite]" />
                  </>
                ) : (
                  <>
                    {session.input.slice(0, caretIndex)}
                    <span className="inline-block h-[1em] w-[1ch] -mr-[1ch] align-middle bg-current opacity-70 mix-blend-difference animate-[caret-blink_1.0s_cubic-bezier(0,0,1,1)_infinite]" />
                    {session.input.slice(caretIndex)}
                  </>
                )}
              </pre>
              <input
                ref={inputRef}
                value={session.input}
                onChange={(event) => {
                  session.setInput(event.target.value);
                  const index = event.target.selectionStart ?? 0;
                  setCaretIndex(
                    Math.max(0, Math.min(index, event.target.value.length))
                  );
                }}
                onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                  session.handleKeyDown(event);
                }}
                onKeyUp={syncCaretIndex}
                onClick={syncCaretIndex}
                onSelect={syncCaretIndex}
                autoFocus
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Type message here"
                className="absolute inset-0 h-full w-full border-0 bg-transparent p-0 opacity-0 outline-none"
              />
            </div>
          </div>
        </form>
      </div>
    </CLILayout>
  );
}
