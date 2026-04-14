import { type FormEvent, useEffect, useRef } from "react";

import { cn } from "@/shared/lib/utils";

export type TerminalLine =
  | {
      id: string;
      type: "system" | "stdout";
      text: string;
    }
  | {
      id: string;
      type: "stderr";
      text: string;
    }
  | {
      id: string;
      type: "command";
      prompt: string;
      command: string;
      hidden?: boolean;
    };

type TerminalProps = {
  lines: TerminalLine[];
  prompt: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  username?: string;
  hostname?: string;
  inputMode?: "text" | "password";
  disabled?: boolean;
  showInput?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
};

function replacePlaceholders(
  value: string,
  {
    username = "guest",
    hostname = "terminal",
  }: Pick<TerminalProps, "username" | "hostname">,
) {
  return value
    .replaceAll("{{username}}", username)
    .replaceAll("{{hostname}}", hostname);
}

function renderLine(
  line: TerminalLine,
  replacements: Pick<TerminalProps, "username" | "hostname">,
) {
  if (line.type === "command") {
    return (
      <p key={line.id} className="m-0 break-words">
        <span>{replacePlaceholders(line.prompt, replacements)}</span>{" "}
        <span>
          {line.hidden
            ? "*".repeat(Math.max(line.command.length, 8))
            : replacePlaceholders(line.command, replacements)}
        </span>
      </p>
    );
  }

  if (line.type === "stderr") {
    return (
      <p key={line.id} className="m-0 break-words text-red-500">
        {replacePlaceholders(line.text, replacements)}
      </p>
    );
  }

  return (
    <p key={line.id} className="m-0 break-words">
      {replacePlaceholders(line.text, replacements)}
    </p>
  );
}

export function Terminal({
  lines,
  prompt,
  value,
  onChange,
  onSubmit,
  username,
  hostname,
  inputMode = "text",
  disabled = false,
  showInput = true,
  placeholder,
  autoFocus = true,
  className,
}: TerminalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus && !disabled) {
      inputRef.current?.focus();
    }
  }, [autoFocus, disabled]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [lines, value]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (disabled) {
      return;
    }

    onSubmit(value);
  }

  return (
    <section
      className={cn(
        "w-full bg-black p-6 font-mono text-base text-white [-webkit-font-smoothing:none] [-moz-osx-font-smoothing:auto] [font-smooth:never] [text-rendering:geometricPrecision]",
        className,
      )}
      onClick={() => inputRef.current?.focus()}
      aria-label="Terminal"
    >
      <div className="flex flex-col gap-1 whitespace-pre-wrap">
        {lines.map((line) => renderLine(line, { username, hostname }))}

        {showInput ? (
          <form onSubmit={handleSubmit} className="flex items-start gap-2">
            <span className="shrink-0">
              {replacePlaceholders(prompt, { username, hostname })}
            </span>
            <div className="min-w-0 flex-1">
              <label className="sr-only" htmlFor="terminal-input">
                Terminal input
              </label>
              <input
                id="terminal-input"
                ref={inputRef}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                type={inputMode === "password" ? "password" : "text"}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder={placeholder}
                disabled={disabled}
                className="block w-full border-0 bg-transparent p-0 text-inherit outline-none [caret-color:white] [-webkit-appearance:none] [-webkit-font-smoothing:none] [-moz-osx-font-smoothing:auto] [font-smooth:never] [text-rendering:geometricPrecision]"
              />
            </div>
          </form>
        ) : null}

        <div ref={bottomRef} />
      </div>
    </section>
  );
}
