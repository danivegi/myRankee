import pool from '@/lib/db';

export async function generateMetadata({ params }) {
  const { username } = await params;
  try {
    const result = await pool.query(
      'SELECT nombre, apellido, bio FROM users WHERE username = $1',
      [username]
    );
    if (!result.rows.length) return { title: `@${username}` };
    const u = result.rows[0];
    const nombre = `${u.nombre} ${u.apellido}`.trim();
    return {
      title: `${nombre} (@${username})`,
      description: u.bio || `Perfil de ${nombre} en myRankee. Descubre los videojuegos que ha jugado y sus reseñas.`,
    };
  } catch {
    return { title: `@${username}` };
  }
}

export default function UserLayout({ children }) {
  return children;
}
