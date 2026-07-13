"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getAuthToken } from "@/utilities/auth-token.utility";

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (getAuthToken()) {
      router.replace("/");
      return;
    }

    setChecked(true);
  }, [router]);

  if (!checked) return null;

  return <>{children}</>;
}
