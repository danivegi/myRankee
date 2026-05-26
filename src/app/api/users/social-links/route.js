import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

const PLATFORMS = new Set(['twitter', 'instagram', 'twitch', 'youtube', 'steam', 'discord', 'tiktok']);

function getUser(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try { return jwt.verify(auth.slice(7), process.env.JWT_SECRET); }
  catch { return null; }
}

function isValidUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch { return false; }
}

export async function PUT(request) {
  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

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
      if (!isValidUrl(url)) {
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
