import * as React from "react";
import {
  Suspense,
  type ReactNode,
  useEffect,
  useState,
  useCallback,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function AppSuspenseFallback() {
  const [progress, setProgress] = React.useState(8);
  const [messageIndex, setMessageIndex] = React.useState(0);
  const messages = ["MSG_1", "MSG_2", "MSG_3"];

  // JUMPY progress: discrete steps, no smooth creeping
  React.useEffect(() => {
    const cap = 92;

    const tick = () => {
      setProgress((p) => {
        if (p >= cap) return p;

        const remaining = cap - p;

        // Big jumps early, small jumps later
        const jump =
          remaining > 50
            ? rand(60, 80)
            : remaining > 25
              ? rand(5, 20)
              : rand(1, 3);

        return clamp(p + jump, 0, cap);
      });
    };

    const interval = setInterval(tick, rand(350, 700));
    return () => clearInterval(interval);
  }, []);

  // Rotate text
  React.useEffect(() => {
    const id = window.setInterval(() => {
      setMessageIndex((i) => (i + 1) % messages.length);
    }, 1000);

    return () => window.clearInterval(id);
  }, [messages.length]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 rounded-lg border border-border/60 bg-card/80 px-6 py-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
            <Loader2
              className="h-5 w-5 animate-spin text-primary"
              aria-hidden="true"
            />
          </div>

          <div className="flex flex-col items-start gap-0.5 min-w-20">
            <span className="text-sm font-medium text-foreground">
              APP_SUSPENSE_TITLE
            </span>

            <span className="text-xs text-muted-foreground h-4 leading-4 w-[14rem] overflow-hidden whitespace-nowrap text-ellipsis">
              <span
                key={messageIndex}
                className="inline-block animate-in fade-in-0 slide-in-from-bottom-1 duration-200"
              >
                {messages[messageIndex]}
              </span>
            </span>
          </div>
        </div>

        <div className="w-full max-w-xs space-y-2">
          <div className="h-1.5 w-full overflow-hidden rounded-none bg-muted">
            <div
              className="h-full bg-primary transition-[width] duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="tabular-nums">{progress}%</span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1 w-1 animate-pulse rounded-full bg-muted-foreground/60" />
              <span className="text-xs font-normal">APP_SUSPENSE_LOADING</span>
            </span>
          </div>

          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <div className="h-12 w-full rounded-none bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

type RouteSuspenseProps = {
  children: ReactNode;
};

export function SilentSuspense({ children }: RouteSuspenseProps) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

export function SilentRoute({ children }: RouteSuspenseProps) {
  return <SilentSuspense>{children}</SilentSuspense>;
}

const FORCE_LOADING_MS = 777;

type SuspenseListenerProps = {
  onChange: (pending: boolean) => void;
};

function RouteSuspenseListener({ onChange }: SuspenseListenerProps) {
  useEffect(() => {
    onChange(true);
    return () => onChange(false);
  }, [onChange]);
  return null;
}

export function LoaderRoute({ children }: RouteSuspenseProps) {
  const location = useLocation();
  const [settledPathname, setSettledPathname] = useState(location.pathname);
  const [suspensePending, setSuspensePending] = useState(false);
  const waitingForDelay = settledPathname !== location.pathname;

  const showLoader = waitingForDelay || suspensePending;

  const handleSuspenseChange = useCallback((pending: boolean) => {
    setSuspensePending(pending);
  }, []);

  useEffect(() => {
    if (settledPathname === location.pathname) {
      return;
    }

    const timer = setTimeout(
      () => setSettledPathname(location.pathname),
      FORCE_LOADING_MS
    );
    return () => clearTimeout(timer);
  }, [location.pathname, settledPathname]);

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`route-content-${location.pathname}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <Suspense
            fallback={<RouteSuspenseListener onChange={handleSuspenseChange} />}
          >
            {children}
          </Suspense>
        </motion.div>
      </AnimatePresence>
      <AnimatePresence mode="wait" initial={false}>
        {showLoader && (
          <motion.div
            key={`route-loader-${location.pathname}`}
            className="fixed inset-0 z-50 bg-background"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
          >
            <AppSuspenseFallback />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
