import {
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import { cn } from "@/shared/lib/utils";

export type TerminalLine =
  | {
      id: string;
      type: "system" | "stdout";
      text: string;
      className?: string;
      content?: ReactNode;
    }
  | {
      id: string;
      type: "stderr";
      text: string;
      className?: string;
      content?: ReactNode;
    }
  | {
      id: string;
      type: "command";
      prompt: string;
      command: string;
      hidden?: boolean;
      className?: string;
    };

type TerminalProps = {
  lines: TerminalLine[];
  prompt: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  username?: string;
  hostname?: string;
  inputMode?: "text" | "password";
  noEcho?: boolean;
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
  }: Pick<TerminalProps, "username" | "hostname">
) {
  return value
    .replaceAll("{{username}}", username)
    .replaceAll("{{hostname}}", hostname);
}

function renderLine(
  line: TerminalLine,
  replacements: Pick<TerminalProps, "username" | "hostname">
) {
  if (line.type === "command") {
    return (
      <p key={line.id} className={cn("m-0 break-words", line.className)}>
        <span>{replacePlaceholders(line.prompt, replacements)}</span>{" "}
        <span>
          {line.hidden ? "" : replacePlaceholders(line.command, replacements)}
        </span>
      </p>
    );
  }

  if (line.type === "stderr") {
    return (
      <p key={line.id} className={cn("m-0 break-words", line.className)}>
        {line.content ?? replacePlaceholders(line.text, replacements)}
      </p>
    );
  }

  return (
    <p key={line.id} className={cn("m-0 break-words", line.className)}>
      {line.content ?? replacePlaceholders(line.text, replacements)}
    </p>
  );
}

export function Terminal({
  lines,
  prompt,
  value,
  onChange,
  onSubmit,
  onKeyDown,
  username,
  hostname,
  inputMode = "text",
  noEcho = false,
  disabled = false,
  showInput = true,
  placeholder,
  autoFocus = true,
  className,
}: TerminalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [caretIndex, setCaretIndex] = useState(0);

  function syncCaretIndex() {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    const index = input.selectionStart ?? value.length;
    setCaretIndex(Math.max(0, Math.min(index, value.length)));
  }

  useEffect(() => {
    if (autoFocus && !disabled && showInput) {
      inputRef.current?.focus();
    }
  }, [autoFocus, disabled, showInput]);

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
        className
      )}
      onClick={() => inputRef.current?.focus()}
      aria-label="Terminal"
    >
      <div className="flex flex-col whitespace-pre-wrap">
        {lines.map((line) => renderLine(line, { username, hostname }))}

        {showInput ? (
          <form onSubmit={handleSubmit} className="flex items-start gap-2">
            <span className="shrink-0">
              {replacePlaceholders(prompt, { username, hostname })}
            </span>
            <div
              className="relative min-w-0 flex-1"
              onClick={() => inputRef.current?.focus()}
            >
              <pre className="m-0 whitespace-pre-wrap break-words">
                {noEcho || inputMode === "password" ? (
                  <span className="inline-block h-[1em] w-[1ch] -mr-[1ch] align-middle bg-current opacity-70 mix-blend-difference animate-[caret-blink_1.0s_cubic-bezier(0,0,1,1)_infinite]" />
                ) : (
                  <>
                    {value.length === 0 && placeholder ? (
                      <>
                        {placeholder}
                        <span className="inline-block h-[1em] w-[1ch] -mr-[1ch] align-middle bg-current opacity-70 mix-blend-difference animate-[caret-blink_1.0s_cubic-bezier(0,0,1,1)_infinite]" />
                      </>
                    ) : (
                      <>
                        {value.slice(0, caretIndex)}
                        <span className="inline-block h-[1em] w-[1ch] -mr-[1ch] align-middle bg-current opacity-70 mix-blend-difference animate-[caret-blink_1.0s_cubic-bezier(0,0,1,1)_infinite]" />
                        {value.slice(caretIndex)}
                      </>
                    )}
                  </>
                )}
              </pre>
              <label className="sr-only" htmlFor="terminal-input">
                Terminal input
              </label>
              <input
                id="terminal-input"
                ref={inputRef}
                value={value}
                onChange={(event) => {
                  onChange(event.target.value);
                  const index = event.target.selectionStart ?? 0;
                  setCaretIndex(
                    Math.max(0, Math.min(index, event.target.value.length))
                  );
                }}
                onClick={syncCaretIndex}
                onKeyDown={onKeyDown}
                onKeyUp={syncCaretIndex}
                onSelect={syncCaretIndex}
                type="text"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder={placeholder}
                disabled={disabled}
                className={cn(
                  "absolute inset-0 h-full w-full border-0 bg-transparent p-0 opacity-0 outline-none [-webkit-appearance:none]",
                  disabled ? "pointer-events-none" : ""
                )}
              />
            </div>
          </form>
        ) : null}

        <div ref={bottomRef} />
      </div>
    </section>
  );
}
