import { requireUser } from '@/lib/auth';
import pool from '@/lib/db';

const PLATFORMS = new Set(['twitter', 'instagram', 'twitch', 'youtube', 'steam', 'discord', 'tiktok']);

function isValidUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch { return false; }
}

export async function PUT(request) {
  const session = await requireUser(request);
  if (session.response) return session.response;
  const user = session.user;

  const body = await request.json().catch(() => ({}));

  for (const [platform, rawUrl] of Object.entries(body)) {
    if (!PLATFORMS.has(platform)) continue;
    const url = typeof rawUrl === 'string' ? rawUrl.trim() : '';
    if (!url) {
      await pool.query(
        'DELETE FROM user_social_links WHERE user_id = $1 AND platform = $2',
        [user.id, platform]
      );
    } else {
      if (platform === 'discord') {
        if (url.length > 40) {
          return Response.json({ error: 'El usuario de Discord es demasiado largo' }, { status: 400 });
        }
      } else if (!isValidUrl(url)) {
        return Response.json({ error: `URL inválida para ${platform}` }, { status: 400 });
      }
      await pool.query(`
        INSERT INTO user_social_links (user_id, platform, url)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, platform) DO UPDATE SET url = EXCLUDED.url
      `, [user.id, platform, url]);
    }
  }

  return Response.json({ ok: true });
}
