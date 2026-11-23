import { queryIGDB, coverUrl } from '@/lib/igdb';
import { translateGenre } from '@/lib/translations';

export async function GET() {
  const now         = Math.floor(Date.now() / 1000);
  const sixtyDaysAgo = now - 60 * 86400;

  try {
    const games = await queryIGDB('games', `
      fields id,name,cover.image_id,genres.name,first_release_date;
      where cover != null
        & first_release_date >= ${sixtyDaysAgo}
        & first_release_date <= ${now}
        & version_parent = null;
      sort first_release_date desc;
      limit 10;
    `);

    const result = (games ?? []).map(g => ({
      id:           g.id,
      name:         g.name,
      cover:        coverUrl(g.cover?.image_id, 'cover_big'),
      genres:       g.genres?.map(gn => translateGenre(gn.name)) ?? [],
      // Preformatted Spanish text (the web shows it as is); IGDB dates are UTC midnights.
      release_date: g.first_release_date
        ? new Date(g.first_release_date * 1000).toLocaleDateString('es-ES', { timeZone: 'UTC', day: 'numeric', month: 'short' })
        : null,
      // ISO 8601 calendar date (YYYY-MM-DD) for clients that format it themselves.
      release_date_iso: g.first_release_date
        ? new Date(g.first_release_date * 1000).toISOString().slice(0, 10)
        : null,
    }));

    return Response.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
