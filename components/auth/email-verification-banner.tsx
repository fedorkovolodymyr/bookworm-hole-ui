"use client";

import { useRequestEmailVerification } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function EmailVerificationBanner({
  emailVerifiedAt,
}: {
  emailVerifiedAt: string | null;
}) {
  const requestVerification = useRequestEmailVerification();

  if (emailVerifiedAt) return null;

  return (
    <div className="bg-muted flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-sm">
      <span>Please verify your email address.</span>
      {requestVerification.isSuccess ? (
        <span className="text-muted-foreground">Verification email sent.</span>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={requestVerification.isPending}
          onClick={() => requestVerification.mutate()}
        >
          Resend verification email
        </Button>
      )}
    </div>
  );
}
