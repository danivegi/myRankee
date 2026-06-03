import { queryIGDB, coverUrl } from '@/lib/igdb';
import { checkRateLimit, getIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';

export async function GET(request) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return Response.json({ games: [] });

  const ip = getIp(request);
  const rl = checkRateLimit(`read:${ip}`, LIMITS.read.limit, LIMITS.read.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  try {
    const safeQ = q.replace(/[*"\\]/g, '');
    const games = await queryIGDB(
      'games',
      `fields id,name,cover.image_id; where name ~ *"${safeQ}"*; sort total_rating_count desc; limit 8;`
    );
    return Response.json({
      games: (games ?? []).map((g) => ({
        id:    g.id,
        name:  g.name,
        cover: coverUrl(g.cover?.image_id, 'cover_small'),
      })),
    });
  } catch {
    return Response.json({ games: [] });
  }
}
