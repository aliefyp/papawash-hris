import type { LucideIcon } from "lucide-react";

// Shown where a list would be, when there is nothing yet: what it is, why it is empty, and the next step.
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-card/50 px-6 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-7" strokeWidth={1.5} aria-hidden />
      </span>
      <div className="flex max-w-sm flex-col gap-1.5">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
