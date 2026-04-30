import { queryIGDB } from '@/lib/igdb';

const BASE = 'https://myrankee.com';

export default async function sitemap() {
  const staticRoutes = [
    { url: BASE,              lastModified: new Date(), changeFrequency: 'daily',   priority: 1   },
    { url: `${BASE}/lists`,   lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE}/search`,  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  ];

  let gameRoutes = [];
  try {
    const games = await queryIGDB(
      'games',
      `fields id;
       where rating_count > 500 & cover != null;
       sort rating_count desc;
       limit 100;`
    );
    gameRoutes = games.map((g) => ({
      url:             `${BASE}/game/${g.id}`,
      lastModified:    new Date(),
      changeFrequency: 'weekly',
      priority:        0.6,
    }));
  } catch {
    // fail silently — static routes still returned
  }

  return [...staticRoutes, ...gameRoutes];
}
