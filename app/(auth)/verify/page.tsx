// app/(auth)/verify/page.tsx
"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useConfirmEmailVerification } from "@/hooks/useAuth";

function VerifyContent() {
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
    return <p>Missing verification token.</p>;
  }
  if (confirmVerification.isPending) {
    return <p>Verifying your email...</p>;
  }
  if (confirmVerification.isError) {
    return <p className="text-destructive">This verification link is invalid or expired.</p>;
  }
  return <p>Your email has been verified.</p>;
}

export default function VerifyPage() {
  return (
    <React.Suspense fallback={<p>Verifying your email...</p>}>
      <VerifyContent />
    </React.Suspense>
  );
}
