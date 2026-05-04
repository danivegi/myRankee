import { queryIGDB, coverUrl } from '@/lib/igdb';
import { translateGenre, translatePlatform } from '@/lib/translations';
import { getTranslatedSummary } from '@/lib/game-translations';

export async function GET(request, { params }) {
  const { id } = await params;

  // Validate that the ID is a positive integer before passing to IGDB query
  const gameId = parseInt(id, 10);
  if (isNaN(gameId) || gameId <= 0 || String(gameId) !== String(id)) {
    return Response.json({ error: 'ID de juego inválido' }, { status: 400 });
  }

  const results = await queryIGDB(
    'games',
    `fields id,name,cover.image_id,screenshots.image_id,rating,rating_count,
     genres.name,platforms.name,first_release_date,summary,
     involved_companies.company.name,involved_companies.developer,involved_companies.publisher;
     where id = ${gameId};
     limit 1;`
  );

  if (!results?.length) {
    return Response.json({ error: 'Juego no encontrado' }, { status: 404 });
  }

  const g = results[0];

  const developer = g.involved_companies?.find((c) => c.developer)?.company?.name ?? null;
  const publisher = g.involved_companies?.find((c) => c.publisher)?.company?.name ?? null;

  const game = {
    id: g.id,
    name: g.name,
    cover: coverUrl(g.cover?.image_id, 'cover_big_2x'),
    screenshots: (g.screenshots ?? []).map((s) => coverUrl(s.image_id, 'screenshot_big')),
    rating: g.rating ? Math.round(g.rating / 20 * 10) / 10 : null,
    rating_count: g.rating_count ?? 0,
    genres: g.genres?.map((gen) => translateGenre(gen.name)) ?? [],
    platforms: g.platforms?.map((p) => translatePlatform(p.name)) ?? [],
    year: g.first_release_date
      ? new Date(g.first_release_date * 1000).getFullYear()
      : null,
    summary: g.summary ?? null,
    summary_translated: false,
    developer,
    publisher,
  };

  if (g.summary) {
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 3000));
    const translation = await Promise.race([
      getTranslatedSummary(g.id, g.summary),
      timeout,
    ]);
    if (translation) {
      game.summary = translation.text;
      game.summary_translated = translation.translated;
    }
  }

  return Response.json(game, {
    headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=3600' },
  });
}
