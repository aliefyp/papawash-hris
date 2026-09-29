"use client";

import { useActionState, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/action-state";
import { SubmitButton, useActionToast } from "./action-form";

// Button that opens a confirmation dialog explaining the consequence before running the action.
export function ConfirmAction({
  action,
  fields,
  trigger,
  triggerVariant = "outline",
  triggerSize,
  title,
  children,
  confirmLabel,
  danger,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Record<string, string>;
  trigger: React.ReactNode;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  triggerSize?: React.ComponentProps<typeof Button>["size"];
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(action, undefined);
  useActionToast(state);

  // Close once the action reports success (adjusting state during render, not in an effect).
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state?.ok) setOpen(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={triggerVariant}
          size={triggerSize}
          className={danger && triggerVariant === "ghost" ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : undefined}
        >
          {trigger}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-2 text-left">{children}</div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {Object.entries(fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Batal</AlertDialogCancel>
            <SubmitButton variant={danger ? "destructive" : "default"}>{confirmLabel}</SubmitButton>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
