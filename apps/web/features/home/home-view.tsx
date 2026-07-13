"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCreateUser } from "@/hooks/use-create-user";
import { useHealth } from "@/hooks/use-health";
import { useUsers } from "@/hooks/use-users";
import { type CreateUserInput, createUserSchema, EResult } from "@/models";

export function HomeView() {
  const [formError, setFormError] = useState<string | null>(null);

  const health = useHealth();
  const users = useUsers();
  const createUserMutation = useCreateUser();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: "", displayName: "", role: "postulante" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await createUserMutation.mutateAsync(values);

    if (result.type === EResult.SUCCESS) {
      setFormError(null);
      reset();
    } else {
      setFormError(result.value.getUserMessage());
    }
  });

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">apps/web</h1>
        <p className="text-sm text-muted-foreground">
          API status: {health.isPending ? "checking…" : health.data?.type === EResult.SUCCESS ? health.data.value.status : "unreachable"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create user</CardTitle>
          <CardDescription>Posts to the NestJS API.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Input type="email" placeholder="Email" aria-invalid={errors.email ? "true" : undefined} {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <Input type="text" placeholder="Display name" aria-invalid={errors.displayName ? "true" : undefined} {...register("displayName")} />
              {errors.displayName && <p className="text-sm text-destructive">{errors.displayName.message}</p>}
            </div>
            <Button type="submit" disabled={createUserMutation.isPending}>
              {createUserMutation.isPending ? "Creating…" : "Create user"}
            </Button>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          {users.isPending ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : users.data?.type === EResult.ERROR ? (
            <p className="text-sm text-destructive">{users.data.value.getUserMessage()}</p>
          ) : users.data?.value.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {users.data?.value.map((user) => (
                <li key={user.id} className="text-sm">
                  {user.displayName} <span className="text-muted-foreground">{user.email}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
