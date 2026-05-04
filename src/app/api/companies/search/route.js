import { queryIGDB } from '@/lib/igdb';

export async function GET(request) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (q.length < 2) return Response.json([]);

  const safe = q.replace(/"/g, '').replace(/[*|~]/g, '');
  const variations = [
    ...new Set([
      safe,
      safe.toLowerCase(),
      safe.charAt(0).toUpperCase() + safe.slice(1).toLowerCase(),
      safe.toUpperCase(),
    ]),
  ];
  const whereClause = variations.map((v) => `name ~ *"${v}"*`).join(' | ');
  // published.id / developed.id → only fetch IDs (we only need the count)
  const body = `fields id,name,published.id,developed.id; where ${whereClause}; limit 25;`;

  let results;
  try {
    results = await queryIGDB('companies', body);
  } catch (err) {
    console.error('[companies/search] IGDB error:', err.message);
    return Response.json([]);
  }

  const qLower = q.toLowerCase();

  const companies = (results ?? []).map((c) => {
    const pubIds = c.published?.map((g) => g.id) ?? [];
    const devIds = c.developed?.map((g) => g.id) ?? [];
    // Use a Set to avoid double-counting games where the company is both dev + publisher
    const gamesCount = new Set([...pubIds, ...devIds]).size;
    return { id: c.id, name: c.name, gamesCount };
  });

  companies.sort((a, b) => {
    const aLower = a.name.toLowerCase();
    const bLower = b.name.toLowerCase();

    // 1. Exact match first
    if (aLower === qLower && bLower !== qLower) return -1;
    if (bLower === qLower && aLower !== qLower) return 1;

    // 2. Starts-with match next
    const aStarts = aLower.startsWith(qLower);
    const bStarts = bLower.startsWith(qLower);
    if (aStarts && !bStarts) return -1;
    if (bStarts && !aStarts) return 1;

    // 3. More games = higher relevance
    return b.gamesCount - a.gamesCount;
  });

  return Response.json(companies.slice(0, 10));
}
