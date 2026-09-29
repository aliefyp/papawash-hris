import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONES = {
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  info: "bg-accent text-accent-foreground",
  neutral: "bg-muted text-muted-foreground",
} as const;

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
    <Badge variant="secondary" className={cn("h-6 rounded-full px-2.5 text-xs font-medium", TONES[tone], className)}>
      {children}
    </Badge>
  );
}
