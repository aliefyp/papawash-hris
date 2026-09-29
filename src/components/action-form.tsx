"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/action-state";

export function SubmitButton({
  children,
  pendingLabel = "Menyimpan…",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "type" | "disabled"> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

// Reports a server action's result: a toast on success, the message inline on error.
export function useActionToast(state: ActionState) {
  useEffect(() => {
    if (state?.ok) toast.success(state.ok);
  }, [state]);
}

export function ActionForm({
  action,
  children,
  className,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  useActionToast(state);
  return (
    <form action={formAction} className={className}>
      {children}
      <div role="status" aria-live="polite" className="basis-full text-sm empty:hidden">
        {state?.error && <p className="text-destructive">{state.error}</p>}
      </div>
    </form>
  );
}
