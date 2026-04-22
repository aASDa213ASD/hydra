import { type CommandDef } from "@/shared/hooks/use-terminal-session";

export function buildClientCommands(
  serverCommands: Record<string, CommandDef>
): Record<string, CommandDef> {
  const clientCommands: Record<string, CommandDef> = {
    clear: {
      usage: "clear           clear the terminal screen",
      fn: () => ({ clear: true }),
    },
    date: {
      usage: "date            print the system date and time",
      fn: () => new Date().toString(),
    },
    help: {
      usage: "help            print help cheat sheet",
      fn: () => {
        const entries = [
          ...Object.values(clientCommands).map((command) => command.usage),
          ...Object.values(serverCommands).map((command) => command.usage),
        ].sort((a, b) => a.localeCompare(b));

        return ["Available commands:", ...entries];
      },
    },
  };

  return clientCommands;
}
