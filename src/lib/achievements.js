import pool from './db';
import { ensureNotificationsTable } from './init-notifications';

export async function ensureAchievementsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS achievements (
      id                SERIAL       PRIMARY KEY,
      code              VARCHAR(80)  NOT NULL UNIQUE,
      title             VARCHAR(120) NOT NULL,
      description       TEXT         NOT NULL,
      icon              TEXT,
      tier              VARCHAR(20)  NOT NULL,
      requirement_type  VARCHAR(40)  NOT NULL,
      requirement_value INTEGER      NOT NULL DEFAULT 1,
      is_secret         BOOLEAN      NOT NULL DEFAULT FALSE,
      created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_achievements (
      id             SERIAL      PRIMARY KEY,
      user_id        INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      achievement_id INTEGER     NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
      unlocked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, achievement_id)
    )
  `);
}

const ACHIEVEMENTS = [
  // ratings_count
  { code: 'first_rating',  title: '¡Primer premio!',                     description: 'Puntúa tu primer juego',                      tier: 'bronce',    requirement_type: 'ratings_count',   is_secret: false, requirement_value: 1    },
  { code: 'rating_10',     title: 'Crítico novato',                       description: 'Puntúa 10 juegos',                            tier: 'bronce',    requirement_type: 'ratings_count',   is_secret: false, requirement_value: 10   },
  { code: 'rating_50',     title: 'Crítico experimentado',                description: 'Puntúa 50 juegos',                            tier: 'plata',     requirement_type: 'ratings_count',   is_secret: false, requirement_value: 50   },
  { code: 'rating_100',    title: 'Crítico veterano',                     description: 'Puntúa 100 juegos',                           tier: 'oro',       requirement_type: 'ratings_count',   is_secret: false, requirement_value: 100  },
  { code: 'rating_500',    title: 'Leyenda del rating',                   description: 'Puntúa 500 juegos',                           tier: 'platino',   requirement_type: 'ratings_count',   is_secret: false, requirement_value: 500  },
  { code: 'rating_1000',   title: 'Ya toca una ducha, ¿no?',             description: 'Puntúa 1000 juegos',                          tier: 'legendario',requirement_type: 'ratings_count',   is_secret: false, requirement_value: 1000 },
  // reviews_count
  { code: 'first_review',  title: 'Primera reseña',                      description: 'Escribe tu primera reseña',                   tier: 'bronce',    requirement_type: 'reviews_count',   is_secret: false, requirement_value: 1    },
  { code: 'review_10',     title: 'Escritor casual',                     description: 'Escribe 10 reseñas',                          tier: 'bronce',    requirement_type: 'reviews_count',   is_secret: false, requirement_value: 10   },
  { code: 'review_50',     title: 'Escritor frecuente',                  description: 'Escribe 50 reseñas',                          tier: 'plata',     requirement_type: 'reviews_count',   is_secret: false, requirement_value: 50   },
  { code: 'review_100',    title: 'Escritor prolífico',                  description: 'Escribe 100 reseñas',                         tier: 'oro',       requirement_type: 'reviews_count',   is_secret: false, requirement_value: 100  },
  { code: 'review_200',    title: 'Escritor de culto',                   description: 'Escribe 200 reseñas',                         tier: 'diamante',  requirement_type: 'reviews_count',   is_secret: false, requirement_value: 200  },
  // followers_count
  { code: 'first_follower', title: 'No estás solo',                      description: 'Consigue tu primer seguidor',                 tier: 'bronce',    requirement_type: 'followers_count', is_secret: false, requirement_value: 1    },
  { code: 'followers_10',  title: 'Tu propio equipo gamer',              description: 'Consigue 10 seguidores',                      tier: 'plata',     requirement_type: 'followers_count', is_secret: false, requirement_value: 10   },
  { code: 'followers_50',  title: 'Lo mismo es hora de abrir directo...', description: 'Consigue 50 seguidores',                     tier: 'oro',       requirement_type: 'followers_count', is_secret: true,  requirement_value: 50   },
  { code: 'followers_100', title: 'Influencer gamer',                    description: 'Consigue 100 seguidores',                     tier: 'platino',   requirement_type: 'followers_count', is_secret: true,  requirement_value: 100  },
  // lists_count
  { code: 'first_list',    title: 'Coleccionista',                       description: 'Crea tu primera lista',                       tier: 'bronce',    requirement_type: 'lists_count',     is_secret: false, requirement_value: 1    },
  { code: 'lists_5',       title: '¡Listado!',                           description: 'Crea 5 listas',                               tier: 'plata',     requirement_type: 'lists_count',     is_secret: false, requirement_value: 5    },
  { code: 'lists_10',      title: '¿Tienes TOC?',                        description: 'Crea 10 listas',                              tier: 'oro',       requirement_type: 'lists_count',     is_secret: false, requirement_value: 10   },
  // received_likes
  { code: 'first_like',    title: 'Le gustas',                           description: 'Recibe tu primer me gusta en una reseña',     tier: 'bronce',    requirement_type: 'received_likes',  is_secret: false, requirement_value: 1    },
  { code: 'likes_50',      title: 'Tu opinión importa',                  description: 'Recibe 50 me gustas en tus reseñas',          tier: 'plata',     requirement_type: 'received_likes',  is_secret: false, requirement_value: 50   },
  { code: 'likes_200',     title: 'La voz del pueblo',                   description: 'Recibe 200 me gustas en tus reseñas',         tier: 'oro',       requirement_type: 'received_likes',  is_secret: false, requirement_value: 200  },
  // backlog_count
  { code: 'backlog_10',    title: 'Cazador de juegos',                   description: 'Añade 10 juegos al backlog',                  tier: 'bronce',    requirement_type: 'backlog_count',   is_secret: false, requirement_value: 10   },
  { code: 'backlog_50',    title: 'Coleccionista obsesivo',              description: 'Añade 50 juegos al backlog',                  tier: 'plata',     requirement_type: 'backlog_count',   is_secret: false, requirement_value: 50   },
];

async function seedAchievements() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS cnt FROM achievements');
  if (rows[0].cnt >= ACHIEVEMENTS.length) return;

  for (const a of ACHIEVEMENTS) {
    await pool.query(
      `INSERT INTO achievements (code, title, description, tier, requirement_type, requirement_value, is_secret)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (code) DO NOTHING`,
      [a.code, a.title, a.description, a.tier, a.requirement_type, a.requirement_value, a.is_secret]
    );
  }
}

export async function checkAndUnlockAchievements(userId) {
  try {
    await ensureAchievementsTable();
    await seedAchievements();

    const [ratRes, revRes, folRes, listRes, likeRes, backRes] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS cnt FROM ratings WHERE user_id = $1', [userId]),
      pool.query('SELECT COUNT(*)::int AS cnt FROM reviews WHERE user_id = $1', [userId]),
      pool.query('SELECT COUNT(*)::int AS cnt FROM follows WHERE followed_id = $1', [userId]),
      pool.query('SELECT COUNT(*)::int AS cnt FROM lists WHERE user_id = $1', [userId]),
      pool.query(
        `SELECT COUNT(*)::int AS cnt FROM review_likes rl
         JOIN reviews r ON r.id = rl.review_id WHERE r.user_id = $1`,
        [userId]
      ),
      pool.query('SELECT COUNT(*)::int AS cnt FROM backlog WHERE user_id = $1', [userId]),
    ]);

    const counts = {
      ratings_count:   ratRes.rows[0].cnt,
      reviews_count:   revRes.rows[0].cnt,
      followers_count: folRes.rows[0].cnt,
      lists_count:     listRes.rows[0].cnt,
      received_likes:  likeRes.rows[0].cnt,
      backlog_count:   backRes.rows[0].cnt,
    };

    const unlockedRes = await pool.query(
      `SELECT a.code FROM user_achievements ua
       JOIN achievements a ON a.id = ua.achievement_id
       WHERE ua.user_id = $1`,
      [userId]
    );
    const alreadyUnlocked = new Set(unlockedRes.rows.map((r) => r.code));

    const toUnlock = ACHIEVEMENTS.filter(
      (a) => !alreadyUnlocked.has(a.code) && (counts[a.requirement_type] ?? 0) >= a.requirement_value
    );
    if (toUnlock.length === 0) return [];

    const achRows = await pool.query(
      'SELECT id, code, title, tier FROM achievements WHERE code = ANY($1)',
      [toUnlock.map((a) => a.code)]
    );

    const results = [];
    for (const ach of achRows.rows) {
      try {
        await pool.query(
          `INSERT INTO user_achievements (user_id, achievement_id)
           VALUES ($1, $2) ON CONFLICT (user_id, achievement_id) DO NOTHING`,
          [userId, ach.id]
        );
        try {
          await ensureNotificationsTable();
          await pool.query(
            `INSERT INTO notifications (user_id, from_user_id, type, entity_id, entity_name)
             VALUES ($1, NULL, 'achievement', $2, $3)`,
            [userId, ach.id, ach.title]
          );
        } catch { /* non-fatal */ }
        results.push({ key: ach.code, title: ach.title, tier: ach.tier });
      } catch { /* already unlocked — conflict */ }
    }

    return results;
  } catch {
    return [];
  }
}
