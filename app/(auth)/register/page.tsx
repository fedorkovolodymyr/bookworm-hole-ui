// app/(auth)/register/page.tsx
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations("auth.register");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <RegisterForm onSuccess={() => router.push("/profile")} />
      <p className="text-muted-foreground text-sm">
        {t("haveAccount")}{" "}
        <Link href="/login" className="text-foreground underline">
          {t("logIn")}
        </Link>
      </p>
    </div>
  );
}
