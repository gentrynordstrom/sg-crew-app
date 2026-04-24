"use client";

import { useRef, useState } from "react";

interface AttachmentPickerProps {
  name: string;
  label: string;
  multiple?: boolean;
  accept?: string;
  capture?: "environment" | "user";
}

export function AttachmentPicker({
  name,
  label,
  multiple = false,
  accept = "image/*",
  capture,
}: AttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
  }

  function removeAll() {
    setPreviews([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-brand-cream-300">{label}</p>

      {previews.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-cream-600/40 bg-brand-moss-600/30 py-6 text-brand-cream-400 transition hover:border-brand-brass-400/60 hover:text-brand-brass-300 active:scale-[0.98]"
        >
          <CameraIcon />
          <span className="text-sm">Tap to add {multiple ? "photos" : "photo"}</span>
        </button>
      ) : (
        <div>
          <div className="grid grid-cols-3 gap-2">
            {previews.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt={`preview ${i + 1}`}
                className="h-24 w-full rounded-lg object-cover"
              />
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex-1 rounded-lg border border-brand-cream-600/30 bg-brand-moss-600/30 py-2 text-sm text-brand-cream-400 hover:text-brand-cream-200"
            >
              Change
            </button>
            <button
              type="button"
              onClick={removeAll}
              className="rounded-lg border border-red-700/40 bg-red-900/20 px-3 py-2 text-sm text-red-400 hover:text-red-200"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        multiple={multiple}
        capture={capture}
        className="sr-only"
        onChange={handleChange}
      />
    </div>
  );
}

function CameraIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
      />
    </svg>
  );
}
