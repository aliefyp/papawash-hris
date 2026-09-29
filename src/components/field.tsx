import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// A labelled form control. The label wraps the control, so clicking the text focuses it.
export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Label className={cn("flex flex-col items-stretch gap-1.5 text-sm leading-normal font-medium", className)}>
      <span>
        {label}
        {hint && <span className="ml-1 font-normal text-muted-foreground">{hint}</span>}
      </span>
      {children}
    </Label>
  );
}
