// app/(auth)/verify/page.tsx
"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useConfirmEmailVerification } from "@/hooks/useAuth";

function VerifyContent() {
  const t = useTranslations("auth.verify");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const confirmVerification = useConfirmEmailVerification();

  React.useEffect(() => {
    if (token) {
      confirmVerification.mutate(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return <p>{t("missingToken")}</p>;
  }
  if (confirmVerification.isPending) {
    return <p>{t("verifying")}</p>;
  }
  if (confirmVerification.isError) {
    return <p className="text-destructive">{t("invalid")}</p>;
  }
  return <p>{t("success")}</p>;
}

export default function VerifyPage() {
  const t = useTranslations("auth.verify");
  return (
    <React.Suspense fallback={<p>{t("verifying")}</p>}>
      <VerifyContent />
    </React.Suspense>
  );
}
