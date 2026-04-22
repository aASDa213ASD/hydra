import { Terminal } from "@/shared/components/terminal";
import { useAuth } from "@/feature/auth/hooks/use-auth";
import {
  type CommandDef,
  useTerminalSession,
} from "@/shared/hooks/use-terminal-session";
import CLILayout from "@/shared/layouts/CLILayout";
import { buildClientCommands } from "@/shared/terminal/commands";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

const hostname = "hydra";

function App() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const serverCommands: Record<string, CommandDef> = useMemo(() => {
    return {
      whoami: {
        usage: "whoami          print effective user name",
        fn: () => "{{username}}",
      },
      exit: {
        usage: "exit            cause normal process termination",
        fn: () => {
          navigate("/logout");
        },
      },
    };
  }, [navigate]);

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
        placeholder=""
        onChange={session.setInput}
        onKeyDown={session.handleKeyDown}
        onSubmit={session.submit}
      />
    </CLILayout>
  );
}

export default App;
