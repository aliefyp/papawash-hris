"use client";

import { useActionState } from "react";
import { Field } from "@/components/field";
import { SubmitButton } from "@/components/action-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { login } from "./actions";

export default function LoginPage() {
  const [state, action] = useActionState(login, undefined);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <Card className="p-2">
        <CardHeader>
          <CardTitle className="text-2xl tracking-tight">Papawash</CardTitle>
          <CardDescription>Masuk sebagai owner.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="flex flex-col gap-4">
            <Field label="Email">
              <Input name="email" type="email" required autoComplete="email" />
            </Field>
            <Field label="Password">
              <Input name="password" type="password" required autoComplete="current-password" />
            </Field>
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
            <SubmitButton size="lg" pendingLabel="Masuk…">
              Masuk
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
