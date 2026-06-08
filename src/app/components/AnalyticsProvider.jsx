'use client';

import { Analytics } from '@vercel/analytics/react';

// Redact personal data from analytics events before they are sent.
// /user/<username>  →  /user/[username]   (but keep /user/edit as-is)
// query params: token (verification/reset), ref (@username in share links)
function beforeSend(event) {
  try {
    const parsed = new URL(event.url);

    parsed.pathname = parsed.pathname.replace(
      /^(\/user\/)([^/]+)(\/.*)?$/,
      (_, prefix, segment, rest = '') =>
        segment === 'edit' ? `${prefix}${segment}${rest}` : `${prefix}[username]${rest}`
    );

    parsed.searchParams.delete('token');
    parsed.searchParams.delete('ref');

    return { ...event, url: parsed.toString() };
  } catch {
    return event;
  }
}

export default function AnalyticsProvider() {
  return <Analytics beforeSend={beforeSend} />;
}