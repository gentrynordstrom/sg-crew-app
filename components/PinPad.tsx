"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface PinPadProps {
  userId: string;
  userName: string;
}

const PIN_LENGTH = 4;

export function PinPad({ userId, userName }: PinPadProps) {
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  const submittingRef = useRef(false);

  const reset = useCallback(() => {
    setPin("");
    setStatus("idle");
  }, []);

  const submit = useCallback(
    async (value: string) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setStatus("submitting");
      setErrorMessage(null);
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, pin: value }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          lockedUntil?: string;
        };
        if (!res.ok) {
          const msg =
            data?.error ??
            (res.status === 423
              ? "Account locked. Try again later."
              : "Incorrect PIN.");
          setErrorMessage(msg);
          setStatus("error");
          setPin("");
          // let the shake animation play before accepting input again
          setTimeout(() => setStatus("idle"), 600);
        } else {
          router.replace("/");
          router.refresh();
        }
      } catch {
        setErrorMessage("Network error. Try again.");
        setStatus("error");
        setPin("");
        setTimeout(() => setStatus("idle"), 600);
      } finally {
        submittingRef.current = false;
      }
    },
    [router, userId]
  );

  useEffect(() => {
    if (pin.length === PIN_LENGTH && status !== "submitting") {
      void submit(pin);
    }
  }, [pin, status, submit]);

  const append = (digit: string) => {
    if (status === "submitting") return;
    setPin((p) => (p.length >= PIN_LENGTH ? p : p + digit));
  };

  const backspace = () => {
    if (status === "submitting") return;
    setPin((p) => p.slice(0, -1));
  };

  return (
    <div className="flex flex-col items-center">
      <p className="text-sm uppercase tracking-wide text-slate-500">
        Signing in as
      </p>
      <h1 className="mt-1 text-2xl font-bold text-brand-navy">{userName}</h1>
      <p className="mt-4 text-slate-600">Enter your 4-digit PIN</p>

      <div
        className={`mt-6 flex gap-4 ${
          status === "error" ? "animate-[shake_0.4s]" : ""
        }`}
        aria-live="polite"
      >
        {Array.from({ length: PIN_LENGTH }).map((_, i) => {
          const filled = i < pin.length;
          return (
            <div
              key={i}
              className={`h-4 w-4 rounded-full ring-2 ring-inset transition ${
                filled
                  ? "bg-brand-navy ring-brand-navy"
                  : "bg-white ring-slate-300"
              }`}
            />
          );
        })}
      </div>

      <div
        role="alert"
        className="mt-4 min-h-5 text-sm text-red-600"
      >
        {errorMessage ?? ""}
      </div>

      <div className="mt-6 grid w-full max-w-xs grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <KeypadButton key={d} onClick={() => append(d)} disabled={status === "submitting"}>
            {d}
          </KeypadButton>
        ))}
        <div aria-hidden />
        <KeypadButton onClick={() => append("0")} disabled={status === "submitting"}>
          0
        </KeypadButton>
        <KeypadButton
          onClick={backspace}
          disabled={status === "submitting" || pin.length === 0}
          aria-label="Delete last digit"
        >
          <BackspaceIcon />
        </KeypadButton>
      </div>

      {status === "submitting" && (
        <p className="mt-6 text-sm text-slate-500">Signing in…</p>
      )}

      <button
        type="button"
        onClick={reset}
        className="mt-8 text-sm text-slate-500 underline-offset-4 hover:underline"
      >
        Not you? Go back
      </button>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}

function KeypadButton({
  children,
  onClick,
  disabled,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="flex h-16 items-center justify-center rounded-2xl bg-white text-2xl font-semibold text-brand-navy shadow-sm ring-1 ring-slate-200 transition active:scale-95 active:bg-slate-100 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function BackspaceIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <path d="M21 5H9l-7 7 7 7h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z" />
      <path d="m18 9-6 6M12 9l6 6" />
    </svg>
  );
}
