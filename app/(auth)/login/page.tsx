// app/(auth)/login/page.tsx
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("auth.login");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <LoginForm onSuccess={() => router.push("/profile")} />
      <p className="text-muted-foreground text-sm">
        {t("noAccount")}{" "}
        <Link href="/register" className="text-foreground underline">
          {t("createOne")}
        </Link>
      </p>
    </div>
  );
}
