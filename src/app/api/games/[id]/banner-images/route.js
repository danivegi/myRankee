import { queryIGDB } from '@/lib/igdb';
import { checkRateLimit, getIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';

const IGDB_BASE = 'https://images.igdb.com/igdb/image/upload';

function imgUrls(imageId) {
  return {
    thumb: `${IGDB_BASE}/t_screenshot_big/${imageId}.jpg`,
    full:  `${IGDB_BASE}/t_original/${imageId}.jpg`,
  };
}

export async function GET(request, { params }) {
  const { id } = await params;
  const gameId = parseInt(id, 10);
  if (isNaN(gameId)) return Response.json({ error: 'ID inválido' }, { status: 400 });

  const ip = getIp(request);
  const rl = checkRateLimit(`read:${ip}`, LIMITS.read.limit, LIMITS.read.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  try {
    const [artworks, screenshots] = await Promise.all([
      queryIGDB('artworks',    `fields image_id; where game = ${gameId}; limit 20;`),
      queryIGDB('screenshots', `fields image_id; where game = ${gameId}; limit 20;`),
    ]);

    return Response.json({
      artworks:    (artworks    ?? []).map((a) => ({ id: a.id, ...imgUrls(a.image_id) })),
      screenshots: (screenshots ?? []).map((s) => ({ id: s.id, ...imgUrls(s.image_id) })),
    });
  } catch {
    return Response.json({ artworks: [], screenshots: [] });
  }
}
