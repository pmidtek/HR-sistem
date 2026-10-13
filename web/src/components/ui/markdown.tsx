import ReactMarkdown, { type Components } from "react-markdown";
import { cn } from "@/lib/cn";

/** Gaya elemen markdown sesuai token Cartogram. HTML mentah tidak dirender (aman). */
const components: Components = {
  h1: ({ children }) => <h3 className="mt-4 mb-2 font-display text-lg font-medium text-fg first:mt-0">{children}</h3>,
  h2: ({ children }) => <h4 className="mt-4 mb-2 font-display text-base font-medium text-fg first:mt-0">{children}</h4>,
  h3: ({ children }) => <h5 className="mt-3 mb-1.5 font-display text-sm font-medium text-fg first:mt-0">{children}</h5>,
  p: ({ children }) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5">{children}</ol>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-fg-brand underline underline-offset-2">
      {children}
    </a>
  ),
  code: ({ children }) => <code className="rounded-[3px] bg-hover px-1 py-0.5 font-mono text-[12px]">{children}</code>,
  blockquote: ({ children }) => <blockquote className="mb-2 border-l-2 border-line-strong pl-3 text-fg-muted">{children}</blockquote>,
  strong: ({ children }) => <strong className="font-semibold text-fg">{children}</strong>,
  hr: () => <hr className="my-3 border-line" />,
};

export function Markdown({ children, className }: { children: string; className?: string }) {
  if (!children.trim()) return <p className={cn("text-sm text-fg-subtle", className)}>Belum ada isi.</p>;
  return (
    <div className={cn("text-sm text-fg-muted", className)}>
      <ReactMarkdown components={components}>{children}</ReactMarkdown>
    </div>
  );
}
