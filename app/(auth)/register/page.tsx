// app/(auth)/register/page.tsx
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Create an account</h1>
      <RegisterForm onSuccess={() => router.push("/profile")} />
      <p className="text-muted-foreground text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
