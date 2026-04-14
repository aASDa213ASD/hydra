import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { loginWithPassword } from "@/feature/auth/api/auth.api";
import { useAuth } from "@/feature/auth/hooks/use-auth";
import KernelPanic from "@/feature/panic/ui/KernelPanic";
import { Terminal, type TerminalLine } from "@/shared/components/terminal";
import CLILayout from "@/shared/layouts/CLILayout";

type LoginStage = "login" | "password";

type LoginSession = {
  lines: TerminalLine[];
  input: string;
  prompt: string;
  mode: "text" | "password";
  stage: LoginStage;
  username: string;
  isSubmitting: boolean;
};

const hostname = "hydra";
const banner = `Kali GNU/Linux Rolling ${hostname} tty1`;

let lineSequence = 0;

function createLineId(prefix: string) {
  lineSequence += 1;
  return `${prefix}-${lineSequence}`;
}

function createInitialSession(): LoginSession {
  return {
    lines: [
      {
        id: createLineId("system"),
        type: "system",
        text: banner,
      },
    ],
    input: "",
    prompt: `${hostname} login:`,
    mode: "text",
    stage: "login",
    username: "",
    isSubmitting: false,
  };
}

export default function LoginPage() {
  const { login, token } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<LoginSession>(createInitialSession);
  const [panicReason, setPanicReason] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      navigate("/", { replace: true });
    }
  }, [navigate, token]);

  async function handleSubmit(rawValue: string) {
    if (session.isSubmitting) {
      return;
    }

    const value = rawValue.trim();

    if (session.stage === "login") {
      setSession((current) => ({
        ...current,
        lines: [
          ...current.lines,
          {
            id: createLineId("command"),
            type: "command",
            prompt: current.prompt,
            command: rawValue,
          },
        ],
        input: "",
        prompt: "Password:",
        mode: "password",
        stage: "password",
        username: value,
      }));
      return;
    }

    const password = rawValue;
    const submittedUsername = session.username;

    setSession((current) => ({
      ...current,
      lines: [
        ...current.lines,
        {
          id: createLineId("command"),
          type: "command",
          prompt: current.prompt,
          command: password,
          hidden: true,
        },
      ],
      input: "",
      isSubmitting: true,
    }));

    try {
      const result = await loginWithPassword(submittedUsername, password);
      login(result.token);
      navigate("/", { replace: true });
    } catch {
      setPanicReason("BAD_CREDENTIALS");
    }
  }

  if (token) {
    return <Navigate to="/" replace />;
  }

  if (panicReason) {
    return (
      <CLILayout>
        <section className="min-h-screen bg-black p-6 text-white">
          <KernelPanic reason={panicReason} />
        </section>
      </CLILayout>
    );
  }

  return (
    <CLILayout>
      <Terminal
        lines={session.lines}
        prompt={session.prompt}
        value={session.input}
        inputMode={session.mode}
        disabled={session.isSubmitting}
        showInput={!session.isSubmitting}
        className="min-h-screen border-0"
        onChange={(input) => setSession((current) => ({ ...current, input }))}
        onSubmit={handleSubmit}
      />
    </CLILayout>
  );
}
