export const formatContactName = (user: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) => {
  const first = user.firstName?.trim() ?? "";
  const last = user.lastName?.trim() ?? "";
  const combined = `${first} ${last}`.trim();
  if (combined.length > 0) return combined;
  const email = user.email?.trim();
  if (email) {
    const at = email.indexOf("@");
    return at > 0 ? email.slice(0, at) : email;
  }
  return "Unknown";
};
