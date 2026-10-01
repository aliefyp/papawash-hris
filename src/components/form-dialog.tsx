"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ActionState } from "@/lib/action-state";
import { SubmitButton, useFormAction } from "./action-form";

// A button that opens a dialog with a form. The submit is the only primary button; the dialog closes on success.
export function FormDialog({
  action,
  trigger,
  triggerVariant = "outline",
  title,
  description,
  submitLabel,
  children,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  trigger: React.ReactNode;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  title: string;
  description?: string;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { state, formAction, onReset } = useFormAction(action);

  // Close once the action reports success (adjusting state during render, not in an effect).
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state?.ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant}>{trigger}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form action={formAction} onReset={onReset} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">{children}</div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <SubmitButton>{submitLabel}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
