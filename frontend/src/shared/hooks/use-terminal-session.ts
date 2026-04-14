import { useEffect, useState } from "react";

import { type TerminalLine } from "@/shared/components/terminal";

type TerminalSessionState = {
  lines: TerminalLine[];
  input: string;
  mode: "text" | "password";
  prompt: string;
  pendingLoginUser: string | null;
};

type UseTerminalSessionOptions = {
  lastLoginAt?: string;
  onExit?: () => void;
};

const helpLines = [
  "Available commands:",
  "help            show available commands",
  "whoami          print current username",
  "exit            end terminal session",
  "logout          end terminal session",
  "login           start demo login flow",
  "clear           clear terminal history",
];

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
  return [
    ...createWelcomeLines(lastLoginAt),
  ];
}

function appendText(
  lines: TerminalLine[],
  texts: string[],
  type: "stdout" | "stderr" = "stdout",
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

export function useTerminalSession({
  lastLoginAt,
  onExit,
}: UseTerminalSessionOptions = {}) {
  const [session, setSession] = useState<TerminalSessionState>({
    lines: createInitialLines(lastLoginAt),
    input: "",
    mode: "text",
    prompt: "{{username}}@{{hostname}}:~$",
    pendingLoginUser: null,
  });

  useEffect(() => {
    setSession((current) => {
      const nextLines = [...current.lines];

      if (
        nextLines.length < 2 ||
        nextLines[0]?.type !== "system" ||
        nextLines[1]?.type !== "system"
      ) {
        return current;
      }

      const welcomeLines = createWelcomeLines(lastLoginAt);
      nextLines[0] = welcomeLines[0];
      nextLines[1] = welcomeLines[1];

      return {
        ...current,
        lines: nextLines,
      };
    });
  }, [lastLoginAt]);

  function setInput(input: string) {
    setSession((current) => ({ ...current, input }));
  }

  function submit(rawValue: string) {
    const value = rawValue.trim();

    if (session.mode === "password") {
      setSession((current) => {
        const nextLines: TerminalLine[] = [
          ...current.lines,
          {
            id: createLineId("command"),
            type: "command",
            prompt: current.prompt,
            command: rawValue,
            hidden: true,
          },
        ];

        if (!current.pendingLoginUser) {
          return {
            ...current,
            lines: appendText(
              nextLines,
              ["login session error: missing username"],
              "stderr",
            ),
            input: "",
            mode: "text",
            prompt: "{{username}}@{{hostname}}:~$",
          };
        }

        return {
          lines: appendText(nextLines, [
            `Welcome, ${current.pendingLoginUser}. Authentication accepted.`,
          ]),
          input: "",
          mode: "text",
          prompt: "{{username}}@{{hostname}}:~$",
          pendingLoginUser: null,
        };
      });

      return;
    }

    setSession((current) => {
      const commandLine: TerminalLine = {
        id: createLineId("command"),
        type: "command",
        prompt: current.prompt,
        command: rawValue,
      };

      if (!value) {
        return {
          ...current,
          lines: [...current.lines, commandLine],
          input: "",
        };
      }

      if (value === "clear") {
        return {
          ...current,
          lines: [],
          input: "",
        };
      }

      if (value === "help") {
        return {
          ...current,
          lines: appendText([...current.lines, commandLine], helpLines),
          input: "",
        };
      }

      if (value === "whoami") {
        return {
          ...current,
          lines: appendText([...current.lines, commandLine], ["{{username}}"]),
          input: "",
        };
      }

      if (value === "exit" || value === "logout") {
        onExit?.();
        return {
          ...current,
          lines: [...current.lines, commandLine],
          input: "",
        };
      }

      if (value === "login") {
        return {
          lines: appendText([...current.lines, commandLine], ["Username:"]),
          input: "",
          mode: "text",
          prompt: "username:",
          pendingLoginUser: "__awaiting_username__",
        };
      }

      if (current.pendingLoginUser === "__awaiting_username__") {
        return {
          ...current,
          lines: [...current.lines, commandLine],
          input: "",
          mode: "password",
          prompt: "password:",
          pendingLoginUser: value,
        };
      }

      return {
        ...current,
        lines: appendText(
          [...current.lines, commandLine],
          [`command not found: ${value}`],
          "stderr",
        ),
        input: "",
      };
    });
  }

  return {
    lines: session.lines,
    input: session.input,
    mode: session.mode,
    prompt: session.prompt,
    setInput,
    submit,
  };
}
