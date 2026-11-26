export function isEmailVerificationRequired(
  nodeEnv: string | undefined,
  override: string | undefined,
): boolean {
  const normalizedOverride = override?.trim().toLowerCase();
  if (normalizedOverride === "true") {
    return true;
  }
  if (normalizedOverride === "false") {
    return false;
  }
  if (normalizedOverride !== undefined && normalizedOverride !== "") {
    throw new Error("REQUIRE_EMAIL_VERIFICATION must be 'true' or 'false'");
  }
  return nodeEnv === "production";
}
