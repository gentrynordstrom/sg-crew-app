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
      <p className="text-xs uppercase tracking-[0.2em] text-brand-cream-400">
        Signing in as
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-brand-cream-100">
        {userName}
      </h1>
      <p className="mt-4 text-sm text-brand-cream-300">
        Enter your 4-digit PIN
      </p>

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
                  ? "bg-brand-brass-400 ring-brand-brass-400"
                  : "bg-transparent ring-brand-moss-400"
              }`}
            />
          );
        })}
      </div>

      <div role="alert" className="mt-4 min-h-5 text-sm text-red-300">
        {errorMessage ?? ""}
      </div>

      <div className="mt-6 grid w-full max-w-xs grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <KeypadButton
            key={d}
            onClick={() => append(d)}
            disabled={status === "submitting"}
          >
            {d}
          </KeypadButton>
        ))}
        <div aria-hidden />
        <KeypadButton
          onClick={() => append("0")}
          disabled={status === "submitting"}
        >
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
        <p className="mt-6 text-sm text-brand-cream-400">Signing in…</p>
      )}
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
      className="flex h-16 items-center justify-center rounded-2xl border border-brand-moss-500/50 bg-brand-moss-600/60 text-2xl font-semibold text-brand-cream-100 shadow-sm transition active:scale-95 active:bg-brand-moss-500 hover:bg-brand-moss-600 hover:border-brand-brass-400/60 disabled:opacity-40 disabled:active:scale-100"
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
