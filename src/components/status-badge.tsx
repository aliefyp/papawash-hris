import { cn } from "@/lib/utils";

const TONES = {
  ok: "text-ok",
  warn: "text-warn",
  info: "text-primary",
  neutral: "text-muted-foreground",
} as const;

// Quiet status: colored text with a small dot. Color carries the meaning, no filled pill.
export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: keyof typeof TONES;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap", TONES[tone], className)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}
