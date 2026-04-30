// Strip HTML/script tags from user-generated text to prevent stored XSS.
// React renders text as text nodes (not innerHTML), so XSS from stored
// content only matters if the app ever renders it as raw HTML — but
// stripping it here is defence in depth.
function stripHtml(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

export function sanitizeText(str) {
  return stripHtml(str ?? '');
}

// Remove sensitive fields before including a user object in any API response.
// Pass `{ includeEmail: true }` only for the authenticated user's own profile.
export function sanitizeUser(user, { includeEmail = false } = {}) {
  if (!user) return null;
  // eslint-disable-next-line no-unused-vars
  const { password_hash, email_verified, email, ...publicFields } = user;
  if (includeEmail) return { ...publicFields, email };
  return publicFields;
}
