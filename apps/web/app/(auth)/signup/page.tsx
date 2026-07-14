"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type RegisterInput, registerSchema } from "@repo/models";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRegister } from "@/hooks/use-register";
import { EResult } from "@/models";
import { setAuthToken } from "@/utilities/auth-token.utility";
import { cn } from "@/utilities/tailwind.utility";

const PASSWORD_REQUIREMENTS = [
  { label: "Al menos 8 caracteres", test: (value: string) => value.length >= 8 },
  { label: "Una letra mayúscula", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Una letra minúscula", test: (value: string) => /[a-z]/.test(value) },
  { label: "Un número", test: (value: string) => /[0-9]/.test(value) },
];

export default function SignUpPage() {
  const router = useRouter();
  const registerMutation = useRegister();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "postulante" },
  });

  const password = watch("password") ?? "";
  const passwordStrength = PASSWORD_REQUIREMENTS.filter((requirement) => requirement.test(password)).length;

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    const result = await registerMutation.mutateAsync(data);

    if (result.type === EResult.SUCCESS) {
      setAuthToken(result.value.token);
      router.push("/");
      return;
    }

    setFormError(result.value.getUserMessage());
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">Crea tu cuenta</CardTitle>
        <CardDescription>Empieza a rastrear tus aplicaciones como un pipeline</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <label htmlFor="displayName" className="text-sm font-medium text-foreground">
              Nombre completo
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="displayName" type="text" placeholder="Tu nombre" className="pl-10" {...register("displayName")} />
            </div>
            {errors.displayName && <p className="text-xs text-destructive">{errors.displayName.message}</p>}
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="email" type="email" placeholder="tu@email.com" className="pl-10" {...register("email")} />
            </div>
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <label htmlFor="role" className="text-sm font-medium text-foreground">
              Quiero usar JobBranch como
            </label>
            <select
              id="role"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              {...register("role")}
            >
              <option value="postulante">Postulante</option>
              <option value="recruiter">Recruiter</option>
            </select>
            {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="********" className="pl-10 pr-10" {...register("password")} />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}

            {password && (
              <div className="space-y-2 pt-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-colors",
                        passwordStrength >= level
                          ? passwordStrength <= 2
                            ? "bg-destructive"
                            : passwordStrength === 3
                              ? "bg-[oklch(0.72_0.18_50)]"
                              : "bg-[oklch(0.65_0.2_140)]"
                          : "bg-muted",
                      )}
                    />
                  ))}
                </div>
                <ul className="space-y-1">
                  {PASSWORD_REQUIREMENTS.map((requirement) => (
                    <li
                      key={requirement.label}
                      className={cn("flex items-center gap-2 text-xs transition-colors", requirement.test(password) ? "text-[oklch(0.65_0.2_140)]" : "text-muted-foreground")}
                    >
                      <CheckCircle2 className={cn("h-3 w-3", requirement.test(password) ? "opacity-100" : "opacity-30")} />
                      {requirement.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {formError && (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={registerMutation.isPending || passwordStrength < 4}>
            {registerMutation.isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Creando cuenta...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Crear cuenta
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Ya tienes una cuenta?{" "}
          <Link href="/signin" className="text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
