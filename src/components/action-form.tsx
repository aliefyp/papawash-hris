"use client";

import { useActionState, useEffect, useRef } from "react";
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

// React clears a form after every submit, even when the action returned an error, which throws away what
// the owner typed. This keeps the fields on error and lets the reset happen only after a success.
export function useFormAction(action: (prev: ActionState, formData: FormData) => Promise<ActionState>) {
  const succeeded = useRef(false);
  const [state, formAction] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await action(prev, formData);
    succeeded.current = !!result?.ok;
    return result;
  }, undefined);
  useActionToast(state);
  const onReset = (e: React.FormEvent<HTMLFormElement>) => {
    if (!succeeded.current) e.preventDefault();
  };
  return { state, formAction, onReset };
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
  const { state, formAction, onReset } = useFormAction(action);
  return (
    <form action={formAction} onReset={onReset} className={className}>
      {children}
      <div role="status" aria-live="polite" className="basis-full text-sm empty:hidden">
        {state?.error && <p className="text-destructive">{state.error}</p>}
      </div>
    </form>
  );
}
