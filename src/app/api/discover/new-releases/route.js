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
      release_date: g.first_release_date
        ? new Date(g.first_release_date * 1000).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
        : null,
    }));

    return Response.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
