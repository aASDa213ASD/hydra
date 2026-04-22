import { type KeyboardEvent, useMemo, useState } from "react";

import { type TerminalLine } from "@/shared/components/terminal";

type CommandOutput = {
  stdout?: string | string[];
  stderr?: string | string[];
  clear?: boolean;
};

type CommandResult = string | string[] | CommandOutput | void;

export type CommandDef = {
  usage: string;
  fn: (args: {
    command: string;
    raw: string;
    argv: string[];
  }) => CommandResult | Promise<CommandResult>;
};

type TerminalSessionState = {
  lines: TerminalLine[];
  input: string;
  history: string[];
  historyIndex: number | null;
};

type UseTerminalSessionOptions = {
  lastLoginAt?: string;
  clientCommands?: Record<string, CommandDef>;
  serverCommands?: Record<string, CommandDef>;
  runServerCommand?: (raw: string) => CommandResult | Promise<CommandResult>;
};

let lineSequence = 0;

function createLineId(prefix: string) {
  lineSequence += 1;
  return `${prefix}-${lineSequence}`;
}

function formatLastLogin(lastLoginAt?: string) {
  if (!lastLoginAt) {
    return "never";
  }

  const date = new Date(lastLoginAt);

  if (Number.isNaN(date.getTime())) {
    return lastLoginAt;
  }

  return date.toUTCString();
}

function createWelcomeLines(lastLoginAt?: string): TerminalLine[] {
  return [
    {
      id: "system-1",
      type: "system",
      text: "Connected to Hydra 01.04.2 LTS (Kernel 4.15.0-29-generic x86_64).",
    },
    {
      id: "system-2",
      type: "system",
      text: `Welcome home, {{username}}. Last login: ${formatLastLogin(lastLoginAt)}`,
    },
  ];
}

function createInitialLines(lastLoginAt?: string): TerminalLine[] {
  return [...createWelcomeLines(lastLoginAt)];
}

function appendText(
  lines: TerminalLine[],
  texts: string[],
  type: "stdout" | "stderr" = "stdout"
) {
  const nextLines = [...lines];

  texts.forEach((text) => {
    nextLines.push({
      id: createLineId(type),
      type,
      text,
    });
  });

  return nextLines;
}

function asArray(value?: string | string[]) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function normalizeCommandResult(result: CommandResult): CommandOutput {
  if (!result) {
    return {};
  }

  if (typeof result === "string" || Array.isArray(result)) {
    return { stdout: result };
  }

  return result;
}

export function useTerminalSession({
  lastLoginAt,
  clientCommands = {},
  serverCommands = {},
  runServerCommand,
}: UseTerminalSessionOptions = {}) {
  const [session, setSession] = useState<TerminalSessionState>({
    lines: createInitialLines(lastLoginAt),
    input: "",
    history: [],
    historyIndex: null,
  });

  const lines = useMemo(() => {
    if (
      session.lines.length < 2 ||
      session.lines[0]?.type !== "system" ||
      session.lines[1]?.type !== "system"
    ) {
      return session.lines;
    }

    const welcomeLines = createWelcomeLines(lastLoginAt);
    const nextLines = [...session.lines];
    nextLines[0] = welcomeLines[0];
    nextLines[1] = welcomeLines[1];
    return nextLines;
  }, [lastLoginAt, session.lines]);

  function setInput(input: string) {
    setSession((current) => ({ ...current, input, historyIndex: null }));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "l") {
      event.preventDefault();
      setSession((current) => ({
        ...current,
        lines: [],
        input: "",
        historyIndex: null,
      }));
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
      event.preventDefault();
      setSession((current) => {
        const nextLines = [
          ...current.lines,
          {
            id: createLineId("command"),
            type: "command" as const,
            prompt: "{{username}}@{{hostname}}:~$",
            command: current.input,
          },
          {
            id: createLineId("stdout"),
            type: "stdout" as const,
            text: "^C",
          },
        ];

        return {
          ...current,
          lines: nextLines,
          input: "",
          historyIndex: null,
        };
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSession((current) => {
        if (current.history.length === 0) {
          return current;
        }

        const nextIndex =
          current.historyIndex === null
            ? 0
            : Math.min(current.historyIndex + 1, current.history.length - 1);

        return {
          ...current,
          input: current.history[nextIndex] ?? "",
          historyIndex: nextIndex,
        };
      });
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSession((current) => {
        if (current.history.length === 0 || current.historyIndex === null) {
          return current;
        }

        const nextIndex = current.historyIndex - 1;
        return {
          ...current,
          input: nextIndex >= 0 ? (current.history[nextIndex] ?? "") : "",
          historyIndex: nextIndex >= 0 ? nextIndex : null,
        };
      });
    }
  }

  function submit(rawValue: string) {
    const value = rawValue.trim();
    const commandLine: TerminalLine = {
      id: createLineId("command"),
      type: "command",
      prompt: "{{username}}@{{hostname}}:~$",
      command: rawValue,
    };

    if (!value) {
      setSession((current) => ({
        ...current,
        lines: [...current.lines, commandLine],
        input: "",
        historyIndex: null,
      }));
      return;
    }

    const [command, ...argv] = value.split(/\s+/);
    const clientCommand = clientCommands[command];
    const serverCommand = serverCommands[command];

    setSession((current) => ({
      ...current,
      lines: [...current.lines, commandLine],
      input: "",
      history: [rawValue, ...current.history],
      historyIndex: null,
    }));

    const execute = (runner: () => CommandResult | Promise<CommandResult>) => {
      Promise.resolve(runner())
        .then((result) => {
          const output = normalizeCommandResult(result);
          setSession((current) => ({
            ...current,
            lines: appendText(
              appendText(
                output.clear ? [] : current.lines,
                asArray(output.stdout)
              ),
              asArray(output.stderr),
              "stderr"
            ),
          }));
        })
        .catch((error: unknown) => {
          const message =
            error instanceof Error ? error.message : "local command failed";
          setSession((current) => ({
            ...current,
            lines: appendText(current.lines, [message], "stderr"),
          }));
        });
    };

    if (clientCommand) {
      execute(() =>
        clientCommand.fn({
          command,
          raw: value,
          argv,
        })
      );
      return;
    }

    if (serverCommand) {
      execute(() =>
        serverCommand.fn({
          command,
          raw: value,
          argv,
        })
      );
      return;
    }

    if (runServerCommand) {
      execute(() => runServerCommand(value));
      return;
    }

    setSession((current) => ({
      ...current,
      lines: appendText(
        current.lines,
        [`command not found: ${value}`],
        "stderr"
      ),
    }));
  }

  return {
    lines,
    input: session.input,
    mode: "text" as const,
    prompt: "{{username}}@{{hostname}}:~$",
    setInput,
    handleKeyDown,
    submit,
  };
}
