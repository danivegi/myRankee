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
  { code: 'rate_1',     title: 'Primer impacto',          description: 'Puntúa tu primer juego',                  tier: 'bronce',    requirement_type: 'ratings_count',   is_secret: false, requirement_value: 1   },
  { code: 'rate_10',    title: 'Crítico en ciernes',       description: 'Puntúa 10 juegos',                        tier: 'bronce',    requirement_type: 'ratings_count',   is_secret: false, requirement_value: 10  },
  { code: 'rate_25',    title: 'Aficionado serio',         description: 'Puntúa 25 juegos',                        tier: 'plata',     requirement_type: 'ratings_count',   is_secret: false, requirement_value: 25  },
  { code: 'rate_50',    title: 'Crítico experto',          description: 'Puntúa 50 juegos',                        tier: 'oro',       requirement_type: 'ratings_count',   is_secret: false, requirement_value: 50  },
  { code: 'rate_100',   title: 'Enciclopedia viviente',    description: 'Puntúa 100 juegos',                       tier: 'platino',   requirement_type: 'ratings_count',   is_secret: false, requirement_value: 100 },
  // reviews_count
  { code: 'review_1',   title: 'Primer artículo',          description: 'Escribe tu primera reseña',               tier: 'bronce',    requirement_type: 'reviews_count',   is_secret: false, requirement_value: 1   },
  { code: 'review_5',   title: 'Redactor habitual',        description: 'Escribe 5 reseñas',                       tier: 'plata',     requirement_type: 'reviews_count',   is_secret: false, requirement_value: 5   },
  { code: 'review_15',  title: 'Columnista',               description: 'Escribe 15 reseñas',                      tier: 'oro',       requirement_type: 'reviews_count',   is_secret: false, requirement_value: 15  },
  { code: 'review_30',  title: 'Crítico legendario',       description: 'Escribe 30 reseñas',                      tier: 'legendario',requirement_type: 'reviews_count',   is_secret: false, requirement_value: 30  },
  // followers_count
  { code: 'follow_1',   title: 'Primera fan',              description: 'Consigue tu primer seguidor',             tier: 'bronce',    requirement_type: 'followers_count', is_secret: false, requirement_value: 1   },
  { code: 'follow_10',  title: 'En la ola',                description: 'Consigue 10 seguidores',                  tier: 'plata',     requirement_type: 'followers_count', is_secret: false, requirement_value: 10  },
  { code: 'follow_50',  title: 'Influencer gamer',         description: 'Consigue 50 seguidores',                  tier: 'oro',       requirement_type: 'followers_count', is_secret: true,  requirement_value: 50  },
  { code: 'follow_100', title: 'Leyenda de la comunidad',  description: 'Consigue 100 seguidores',                 tier: 'legendario',requirement_type: 'followers_count', is_secret: true,  requirement_value: 100 },
  // lists_count
  { code: 'list_1',     title: 'Curador',                  description: 'Crea tu primera lista',                   tier: 'bronce',    requirement_type: 'lists_count',     is_secret: false, requirement_value: 1   },
  { code: 'list_5',     title: 'Coleccionista',            description: 'Crea 5 listas',                           tier: 'plata',     requirement_type: 'lists_count',     is_secret: false, requirement_value: 5   },
  // received_likes
  { code: 'like_1',     title: 'Resonancia',               description: 'Recibe tu primer me gusta en una reseña', tier: 'bronce',    requirement_type: 'received_likes',  is_secret: false, requirement_value: 1   },
  { code: 'like_25',    title: 'Voz influyente',           description: 'Recibe 25 me gustas en tus reseñas',      tier: 'oro',       requirement_type: 'received_likes',  is_secret: false, requirement_value: 25  },
  // backlog_count
  { code: 'backlog_1',  title: 'Backlog iniciado',         description: 'Añade tu primer juego al backlog',        tier: 'bronce',    requirement_type: 'backlog_count',   is_secret: false, requirement_value: 1   },
  { code: 'backlog_20', title: 'Lista interminable',       description: 'Añade 20 juegos al backlog',              tier: 'plata',     requirement_type: 'backlog_count',   is_secret: false, requirement_value: 20  },
];

async function seedAchievements() {
  for (const a of ACHIEVEMENTS) {
    await pool.query(
      `INSERT INTO achievements (code, title, description, tier, requirement_type, requirement_value, is_secret)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (code) DO UPDATE
         SET title = $2, description = $3, tier = $4,
             requirement_type = $5, requirement_value = $6, is_secret = $7`,
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
