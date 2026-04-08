import { cn } from "@/lib/cn";

interface CodeBlockProps {
  code: string;
  title?: string;
  className?: string;
}

export function CodeBlock({ code, title, className }: CodeBlockProps) {
  return (
    <div className={cn("rounded-xl bg-brand-gray-900 overflow-hidden", className)}>
      {title && (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <div className="h-3 w-3 rounded-full bg-green-500" />
          </div>
          <span className="text-sm text-gray-400 ml-2">{title}</span>
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed">
        <code className="font-mono text-green-400">{code}</code>
      </pre>
    </div>
  );
}
