"use client";

import { useRef, useState } from "react";

interface AttachmentPickerProps {
  name: string;
  label: string;
  multiple?: boolean;
  /** Mime types accepted. Defaults to images + video. */
  accept?: string;
}

type Preview = { src: string; isVideo: boolean };

export function AttachmentPicker({
  name,
  label,
  multiple = false,
  accept = "image/*,video/*",
}: AttachmentPickerProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<Preview[]>([]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const newPreviews: Preview[] = files.map((f) => ({
      src: URL.createObjectURL(f),
      isVideo: f.type.startsWith("video/"),
    }));
    // In single-file mode replace; in multi-file mode accumulate
    setPreviews((prev) => (multiple ? [...prev, ...newPreviews] : newPreviews));
  }

  function removeAll() {
    setPreviews([]);
    if (cameraRef.current) cameraRef.current.value = "";
    if (libraryRef.current) libraryRef.current.value = "";
  }

  const mediaLabel = multiple ? "media" : "photo/video";

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-brand-cream-300">{label}</p>

      {/* Camera + Library buttons — always visible so user can add more */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-xl border border-brand-cream-600/40 bg-brand-moss-600/30 py-4 text-sm text-brand-cream-400 transition hover:border-brand-brass-400/60 hover:text-brand-brass-300 active:scale-[0.98]"
        >
          <CameraIcon />
          Camera
        </button>
        <button
          type="button"
          onClick={() => libraryRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-xl border border-brand-cream-600/40 bg-brand-moss-600/30 py-4 text-sm text-brand-cream-400 transition hover:border-brand-brass-400/60 hover:text-brand-brass-300 active:scale-[0.98]"
        >
          <PhotoIcon />
          Library
        </button>
      </div>

      {/* Previews */}
      {previews.length > 0 && (
        <div className="mt-3">
          <div className="grid grid-cols-3 gap-2">
            {previews.map((p, i) =>
              p.isVideo ? (
                <video
                  key={i}
                  src={p.src}
                  className="h-24 w-full rounded-lg object-cover bg-black"
                  muted
                  playsInline
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={p.src}
                  alt={`preview ${i + 1}`}
                  className="h-24 w-full rounded-lg object-cover"
                />
              )
            )}
          </div>
          <button
            type="button"
            onClick={removeAll}
            className="mt-2 w-full rounded-lg border border-red-700/40 bg-red-900/20 py-2 text-sm text-red-400 hover:text-red-200"
          >
            Remove all {mediaLabel}
          </button>
        </div>
      )}

      {previews.length === 0 && (
        <p className="mt-1.5 text-center text-xs text-brand-cream-600">
          No {mediaLabel} added
        </p>
      )}

      {/* Camera input */}
      <input
        ref={cameraRef}
        type="file"
        name={name}
        accept={accept}
        multiple={multiple}
        capture="environment"
        className="sr-only"
        onChange={handleChange}
      />
      {/* Library input (same name → both included in FormData) */}
      <input
        ref={libraryRef}
        type="file"
        name={name}
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={handleChange}
      />
    </div>
  );
}

function CameraIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
  );
}

function PhotoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 18h16.5a.75.75 0 00.75-.75V6a.75.75 0 00-.75-.75H3.75A.75.75 0 003 6v11.25c0 .414.336.75.75.75zm10.5-11.25h.008v.008h-.008V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}
