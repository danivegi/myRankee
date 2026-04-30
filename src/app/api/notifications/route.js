import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { ensureNotificationsTable } from '@/lib/init-notifications';
import { queryIGDB } from '@/lib/igdb';

function getUser(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.slice(7), process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

export async function GET(request) {
  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  await ensureNotificationsTable();

  const res = await pool.query(
    `SELECT n.id, n.type, n.read, n.entity_id, n.entity_name, n.created_at,
            u.username AS from_username, u.nombre AS from_nombre,
            u.apellido AS from_apellido, u.avatar_url AS from_avatar
     FROM notifications n
     LEFT JOIN users u ON u.id = n.from_user_id
     WHERE n.user_id = $1
     ORDER BY n.created_at DESC
     LIMIT 50`,
    [user.id]
  );

  // Batch-fetch game names from IGDB for like notifications that have no entity_name yet
  const missingGameIds = [...new Set(
    res.rows
      .filter(r => (r.type === 'like' || r.type === 'comment') && r.entity_id && !r.entity_name)
      .map(r => r.entity_id)
  )];

  const gameNames = {};
  if (missingGameIds.length > 0) {
    try {
      const games = await queryIGDB(
        'games',
        `fields id,name; where id = (${missingGameIds.join(',')}); limit ${missingGameIds.length};`
      );
      for (const g of games) gameNames[g.id] = g.name;
    } catch { /* non-fatal — display without game name */ }
  }

  const notifications = res.rows.map(row => ({
    id: row.id,
    type: row.type,
    read: row.read,
    entity_id: row.entity_id,
    entity_name: row.entity_name
      ?? ((row.type === 'like' || row.type === 'comment') && row.entity_id ? (gameNames[row.entity_id] ?? null) : null),
    created_at: row.created_at,
    from_user: row.from_username
      ? { username: row.from_username, nombre: row.from_nombre, apellido: row.from_apellido, avatar_url: row.from_avatar }
      : null,
  }));

  return Response.json(notifications);
}

export async function PUT(request) {
  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  await ensureNotificationsTable();

  await pool.query(
    'UPDATE notifications SET read = TRUE WHERE user_id = $1',
    [user.id]
  );

  return Response.json({ ok: true });
}
