import pool from './db';
import { translateToSpanish } from './translation';

let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS game_translations (
      igdb_game_id   INTEGER PRIMARY KEY,
      summary_es     TEXT,
      summary_original TEXT,
      translated_at  TIMESTAMP DEFAULT NOW()
    )
  `);
  tableReady = true;
}

export async function getCachedTranslation(igdbGameId) {
  await ensureTable();
  const res = await pool.query(
    'SELECT * FROM game_translations WHERE igdb_game_id = $1',
    [igdbGameId]
  );
  return res.rows[0] ?? null;
}

export async function saveTranslation(igdbGameId, summaryEs, summaryOriginal) {
  await ensureTable();
  const res = await pool.query(
    `INSERT INTO game_translations (igdb_game_id, summary_es, summary_original, translated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (igdb_game_id) DO UPDATE
       SET summary_es = EXCLUDED.summary_es,
           summary_original = EXCLUDED.summary_original,
           translated_at = NOW()
     RETURNING *`,
    [igdbGameId, summaryEs, summaryOriginal]
  );
  return res.rows[0];
}

export async function getTranslatedSummary(igdbGameId, originalSummary) {
  if (!originalSummary) return { text: null, translated: false };

  try {
    const cached = await getCachedTranslation(igdbGameId);
    if (cached) {
      return { text: cached.summary_es ?? originalSummary, translated: !!cached.summary_es };
    }

    const translated = await translateToSpanish(originalSummary);
    if (translated) {
      await saveTranslation(igdbGameId, translated, originalSummary);
      return { text: translated, translated: true };
    }
  } catch (err) {
    console.error('[game-translations] error:', err.message);
  }

  return { text: originalSummary, translated: false };
}
