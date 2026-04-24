/**
 * Generic log detail view. Renders a list of labeled fields plus any
 * file/media assets fetched from the Monday item.
 */

export interface DetailField {
  label: string;
  value: string | null | undefined;
  /** If true render as a full-width block (e.g. notes) */
  wide?: boolean;
}

export interface DetailAsset {
  id: string;
  name: string;
  public_url: string;
  file_extension: string;
}

interface LogDetailViewProps {
  title: string;
  fields: DetailField[];
  assets?: DetailAsset[];
}

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"]);
const VIDEO_EXTS = new Set(["mp4", "mov", "avi", "webm", "m4v", "3gp"]);

export function LogDetailView({ title, fields, assets = [] }: LogDetailViewProps) {
  const inlineFields = fields.filter((f) => !f.wide && f.value);
  const wideFields = fields.filter((f) => f.wide && f.value);
  const emptyFields = fields.filter((f) => !f.value);

  const mediaAssets = assets.filter((a) =>
    IMAGE_EXTS.has(a.file_extension.toLowerCase()) ||
    VIDEO_EXTS.has(a.file_extension.toLowerCase())
  );
  const fileAssets = assets.filter(
    (a) =>
      !IMAGE_EXTS.has(a.file_extension.toLowerCase()) &&
      !VIDEO_EXTS.has(a.file_extension.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Inline fields grid */}
      {inlineFields.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {inlineFields.map((f) => (
            <div
              key={f.label}
              className="rounded-xl bg-brand-moss-800/60 px-4 py-3 ring-1 ring-brand-cream-900/20"
            >
              <p className="text-xs text-brand-cream-500">{f.label}</p>
              <p className="mt-0.5 font-medium text-brand-cream-100">{f.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Wide/notes fields */}
      {wideFields.map((f) => (
        <div
          key={f.label}
          className="rounded-xl bg-brand-moss-800/60 px-4 py-3 ring-1 ring-brand-cream-900/20"
        >
          <p className="text-xs text-brand-cream-500">{f.label}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-brand-cream-200">{f.value}</p>
        </div>
      ))}

      {/* Media attachments */}
      {mediaAssets.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-cream-500">
            Attachments
          </p>
          <div className="grid grid-cols-2 gap-3">
            {mediaAssets.map((a) =>
              VIDEO_EXTS.has(a.file_extension.toLowerCase()) ? (
                <a
                  key={a.id}
                  href={a.public_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block overflow-hidden rounded-xl ring-1 ring-brand-cream-900/30"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <div className="flex h-36 items-center justify-center bg-brand-moss-900/60">
                    <VideoPlayIcon />
                    <span className="ml-2 text-sm text-brand-cream-300 truncate max-w-[8rem]">{a.name}</span>
                  </div>
                </a>
              ) : (
                <a
                  key={a.id}
                  href={a.public_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded-xl ring-1 ring-brand-cream-900/30"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.public_url}
                    alt={a.name}
                    className="h-36 w-full object-cover transition hover:opacity-90"
                  />
                </a>
              )
            )}
          </div>
        </div>
      )}

      {/* Non-media file attachments */}
      {fileAssets.length > 0 && (
        <div className="space-y-2">
          {fileAssets.map((a) => (
            <a
              key={a.id}
              href={a.public_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl bg-brand-moss-800/60 px-4 py-3 text-sm text-brand-cream-300 ring-1 ring-brand-cream-900/20 hover:text-brand-cream-100"
            >
              <FileIcon />
              <span className="truncate">{a.name}</span>
              <span className="ml-auto flex-shrink-0 text-xs text-brand-cream-500 uppercase">
                {a.file_extension}
              </span>
            </a>
          ))}
        </div>
      )}

      {/* Empty fields — shown greyed out */}
      {emptyFields.length > 0 && (
        <div className="grid grid-cols-2 gap-3 opacity-40">
          {emptyFields.map((f) => (
            <div
              key={f.label}
              className="rounded-xl bg-brand-moss-800/40 px-4 py-3 ring-1 ring-brand-cream-900/10"
            >
              <p className="text-xs text-brand-cream-600">{f.label}</p>
              <p className="mt-0.5 text-sm text-brand-cream-600">—</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VideoPlayIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
      className="h-8 w-8 text-brand-brass-300">
      <path fillRule="evenodd"
        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm14.024-.983a1.125 1.125 0 010 1.966l-5.603 3.113A1.125 1.125 0 019 15.113V8.887c0-.857.921-1.4 1.671-.983l5.603 3.113z"
        clipRule="evenodd" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} className="h-5 w-5 flex-shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}
