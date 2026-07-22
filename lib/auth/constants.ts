// lib/auth/constants.ts

// Returned by POST /api/auth/refresh when no refresh_token cookie is present
// (e.g. a guest who was never logged in). Distinguishes that expected case
// from a real refresh failure (expired/invalid token).
export const NO_REFRESH_TOKEN_DETAIL = "No refresh token";
