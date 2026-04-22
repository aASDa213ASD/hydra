import { useEffect, useMemo, useRef, useState } from "react";

function randInt(min: number, max: number): number {
  const span = max - min + 1;
  const value = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
  return min + (value % span);
}

function randFloat(min: number, max: number): number {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
  const unit = value / 0xffffffff;
  return min + (max - min) * unit;
}

function randHex(len: number): string {
  const bytes = new Uint8Array(len / 2);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function addr(): string {
  // Generate a 16- or 12-byte-like address string to mimic kernel output
  const variants = [16, 14, 12];
  const len = variants[randInt(0, variants.length - 1)] ?? 16;
  return randHex(len);
}

function genCodeLine(): string {
  // Generate a random series of instruction bytes with one marked as the current IP
  const count = 32 + randInt(0, 7); // 32..39 bytes
  const bytes = new Uint8Array(count);
  crypto.getRandomValues(bytes);
  const ipIndex = Math.min(count - 1, Math.max(0, Math.floor(count * 0.65)));
  const parts = Array.from(bytes).map((b, i) => {
    const h = b.toString(16).padStart(2, "0");
    return i === ipIndex ? `<${h}>` : h;
  });
  return `  Code: ${parts.join(" ")}`;
}

export default function KernelPanic({
  className,
  delayMs = 45,
  startDelayMs = 0,
  onDone,
  reason,
}: {
  className?: string;
  delayMs?: number;
  startDelayMs?: number;
  onDone?: () => void;
  reason?: string;
}) {
  const allLines = useMemo(() => {
    const cpu = randInt(0, 7);
    const pid = 1000 + randInt(0, 8999);

    // Build timestamps matching number of lines we will render
    const baseLinesCount = 44; // approximate number of lines below
    let cur = randFloat(0.6, 0.8);
    const stamps: string[] = [];
    for (let i = 0; i < baseLinesCount; i++) {
      cur += randFloat(0.00002, 0.00022);
      const s = cur.toFixed(6);
      stamps.push(`[${s.padStart(12, " ")}]`);
    }

    const rep = addr(); // repeated address for the third address line
    const exitCode = `0x000000${randHex(2)}`;
    const panicReason = reason ?? "Reason lost.";
    const base = [
      `CPU: ${cpu} PID: ${pid}`,
      `Hardware name: Fun Society Amusement., LLC. (MS-B0A9)/MS-B0A91, BIOS 1.00 06/06/1998`,
      `RIP: 0010:_raw_spin_lock+0x13/0x30`,
      ` ${addr()} ${addr()} ${addr()} ${addr()}`,
      ` ${addr()} ${addr()} ${addr()} ${addr()}`,
      ` ${addr()} ${rep} ${rep} ${addr()}`,
      `Call Trace:`,
      ` <TASK>`,
      `  entry_SYSCALL_64_after_hwframe+0x6e/0xd8`,
      `  RIP: 0033:0x40720e`,
      genCodeLine(),
      `  RSP: 002b:${addr()} EFLAGS: 00000212 ORIG_RAX: ${addr()}`,
      `  RAX: ${addr()} RBX: ${addr()} RCX: ${addr()}`,
      `  RDX: ${addr()} RSI: ${addr()} RDI: ${addr()}`,
      `  RBP: ${addr()} R08: ${addr()} R09: ${addr()}`,
      `  R10: ${addr()} R11: 0000000000000212 R12: ${addr()}`,
      `  R13: ${addr()} R14: ${addr()} R15: ${addr()}`,
      ` </TASK>`,
      ``,
      `---[ end Kernel panic - not syncing: ${panicReason} exit code=${exitCode} ]---`,
    ];

    // Prefix with timestamps where appropriate
    const withStamps: string[] = [];
    let si = 0;
    for (const line of base) {
      if (line === "") {
        withStamps.push("");
      } else {
        const stamp = stamps[si] ?? stamps[stamps.length - 1];
        withStamps.push(`${stamp} ${line}`);
        si++;
      }
    }
    return withStamps;
  }, [reason]);

  const [visible, setVisible] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    timeoutRef.current = window.setTimeout(
      () => {
        intervalRef.current = window.setInterval(
          () => {
            setVisible((v) => {
              const nv = Math.min(v + 1, allLines.length);
              if (nv === allLines.length && intervalRef.current) {
                window.clearInterval(intervalRef.current);
                intervalRef.current = null;
                onDone?.();
              }
              return nv;
            });
          },
          Math.max(10, delayMs)
        );
      },
      Math.max(0, startDelayMs)
    );
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [allLines.length, delayMs, onDone, startDelayMs]);

  const displayedText = useMemo(
    () => allLines.slice(0, visible).join("\n"),
    [allLines, visible]
  );

  return (
    <pre className={`whitespace-pre-wrap break-words ${className ?? ""}`}>
      {displayedText}
    </pre>
  );
}
