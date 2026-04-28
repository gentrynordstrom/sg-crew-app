type RichText = {
  plain_text?: string;
  href?: string | null;
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    code?: boolean;
  };
};

export interface SopBlock {
  id: string;
  type: string;
  depth: number;
  payload: unknown;
}

function renderRichText(items: RichText[] | undefined) {
  if (!items || items.length === 0) return null;
  return items.map((item, idx) => {
    const cls = [
      item.annotations?.bold ? "font-semibold" : "",
      item.annotations?.italic ? "italic" : "",
      item.annotations?.underline ? "underline" : "",
      item.annotations?.strikethrough ? "line-through" : "",
      item.annotations?.code ? "rounded bg-black/20 px-1 py-0.5 font-mono text-xs" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const content = <span className={cls}>{item.plain_text ?? ""}</span>;
    if (item.href) {
      return (
        <a
          key={idx}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-brass-300 underline underline-offset-2"
        >
          {content}
        </a>
      );
    }
    return <span key={idx}>{content}</span>;
  });
}

function textFromPayload(payload: any): RichText[] | undefined {
  if (!payload) return undefined;
  return payload.rich_text ?? payload.text ?? undefined;
}

function renderBlock(block: SopBlock) {
  const p = block.payload as any;
  const rich = textFromPayload(p);
  const indentStyle =
    block.depth > 0 ? { paddingLeft: `${Math.min(block.depth * 1.25, 3.75)}rem` } : undefined;

  switch (block.type) {
    case "heading_1":
      return (
        <h2 className="mt-6 text-xl font-semibold text-brand-cream-100" style={indentStyle}>
          {renderRichText(rich)}
        </h2>
      );
    case "heading_2":
      return (
        <h3 className="mt-5 text-lg font-semibold text-brand-cream-100" style={indentStyle}>
          {renderRichText(rich)}
        </h3>
      );
    case "heading_3":
      return (
        <h4 className="mt-4 text-base font-semibold text-brand-cream-100" style={indentStyle}>
          {renderRichText(rich)}
        </h4>
      );
    case "bulleted_list_item":
      return (
        <li className="ml-6 list-disc text-sm text-brand-cream-200" style={indentStyle}>
          {renderRichText(rich)}
        </li>
      );
    case "numbered_list_item":
      return (
        <li className="ml-6 list-decimal text-sm text-brand-cream-200" style={indentStyle}>
          {renderRichText(rich)}
        </li>
      );
    case "to_do":
      return (
        <p className="text-sm text-brand-cream-200" style={indentStyle}>
          <span className="mr-2">{p.checked ? "☑" : "☐"}</span>
          {renderRichText(rich)}
        </p>
      );
    case "callout":
      return (
        <div
          className="rounded-lg border border-brand-brass-500/30 bg-brand-brass-900/20 px-3 py-2 text-sm text-brand-brass-100"
          style={indentStyle}
        >
          {renderRichText(rich)}
        </div>
      );
    case "quote":
      return (
        <blockquote
          className="border-l-2 border-brand-cream-600 pl-3 text-sm italic text-brand-cream-300"
          style={indentStyle}
        >
          {renderRichText(rich)}
        </blockquote>
      );
    case "code":
      return (
        <pre
          className="overflow-x-auto rounded-lg bg-black/30 p-3 text-xs text-brand-cream-200"
          style={indentStyle}
        >
          <code>{(rich ?? []).map((r) => r.plain_text ?? "").join("")}</code>
        </pre>
      );
    case "image":
      return (
        <div className="space-y-1" style={indentStyle}>
          {p.type === "external" && p.external?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.external.url} alt="" className="max-h-96 rounded-lg object-contain" />
          ) : (
            <p className="text-xs text-brand-cream-500">Image block (file-hosted) unavailable in cached view.</p>
          )}
          {p.caption?.length > 0 && (
            <p className="text-xs text-brand-cream-500">{renderRichText(p.caption)}</p>
          )}
        </div>
      );
    default:
      return (
        <p className="text-sm text-brand-cream-200" style={indentStyle}>
          {renderRichText(rich)}
        </p>
      );
  }
}

export function SopBlockRenderer({ blocks }: { blocks: SopBlock[] }) {
  if (!blocks.length) {
    return <p className="text-sm text-brand-cream-500">No SOP content is available yet.</p>;
  }

  return (
    <div className="space-y-3">
      {blocks.map((block) => (
        <div key={block.id}>{renderBlock(block)}</div>
      ))}
    </div>
  );
}
