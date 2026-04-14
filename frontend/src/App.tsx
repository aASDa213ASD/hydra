import { Terminal } from "@/shared/components/terminal";
import { useAuth } from "@/feature/auth/hooks/use-auth";
import { useTerminalSession } from "@/shared/hooks/use-terminal-session";
import CLILayout from "@/shared/layouts/CLILayout";
import { useNavigate } from "react-router-dom";

const hostname = "hydra";

function App() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const session = useTerminalSession({
    lastLoginAt: user?.last_login_at,
    onExit: () => navigate("/logout"),
  });

  return (
    <CLILayout>
      <Terminal
        lines={session.lines}
        prompt={session.prompt}
        value={session.input}
        className="min-h-screen"
        username={user?.name ?? "guest"}
        hostname={hostname}
        inputMode={session.mode}
        placeholder={session.mode === "password" ? "password" : ""}
        onChange={session.setInput}
        onSubmit={session.submit}
      />
    </CLILayout>
  );
}

export default App;
