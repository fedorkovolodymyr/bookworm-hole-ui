// app/(auth)/login/page.tsx
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Log in</h1>
      <LoginForm onSuccess={() => router.push("/profile")} />
      <p className="text-muted-foreground text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-foreground underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
