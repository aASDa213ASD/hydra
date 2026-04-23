import { Terminal } from "@/shared/components/terminal";
import { renameUser } from "@/feature/auth/api/auth.api";
import { useAuth } from "@/feature/auth/hooks/use-auth";
import {
  type CommandDef,
  useTerminalSession,
} from "@/shared/hooks/use-terminal-session";
import { apiUrl } from "@/shared/lib/backend-url";
import CLILayout from "@/shared/layouts/CLILayout";
import { buildClientCommands } from "@/shared/terminal/commands";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

const hostname = "hydra";

function App() {
  const { user, token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const serverCommands: Record<string, CommandDef> = useMemo(() => {
    return {
      whoami: {
        usage: "whoami          print effective user name",
        fn: async () => {
          if (!token) {
            throw new Error("not authenticated");
          }

          const res = await fetch(apiUrl("/api/v1/me"), {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!res.ok) {
            throw new Error("failed to resolve current user from backend");
          }

          const data = (await res.json()) as { name?: string };
          if (typeof data.name !== "string" || data.name.length === 0) {
            throw new Error("backend returned invalid user payload");
          }

          return data.name;
        },
      },
      rename: {
        usage: "rename          rename current user (usage: rename <new_name>)",
        fn: async ({ argv }) => {
          if (!token) {
            throw new Error("not authenticated");
          }

          const nextName = argv.join(" ").trim();
          if (!nextName) {
            throw new Error("usage: rename <new_name>");
          }

          const renamedUser = await renameUser(token, nextName);
          await refreshUser();

          return `renamed to ${renamedUser.name}`;
        },
      },
      exit: {
        usage: "exit            cause normal process termination",
        fn: () => {
          navigate("/logout");
        },
      },
    };
  }, [navigate, refreshUser, token]);

  const clientCommands: Record<string, CommandDef> = useMemo(
    () => buildClientCommands(serverCommands),
    [serverCommands]
  );

  const session = useTerminalSession({
    lastLoginAt: user?.last_login_at,
    clientCommands,
    serverCommands,
  });

  return (
    <CLILayout>
      <Terminal
        lines={session.lines}
        prompt={session.prompt}
        value={session.input}
        className="min-h-screen"
        username={user?.name ?? "nobody"}
        hostname={hostname}
        inputMode={session.mode}
        showInput={session.showInput}
        placeholder=""
        onChange={session.setInput}
        onKeyDown={session.handleKeyDown}
        onSubmit={session.submit}
      />
    </CLILayout>
  );
}

export default App;
