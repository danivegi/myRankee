import pool from '@/lib/db';

export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    const result = await pool.query(
      'SELECT title, description FROM lists WHERE id = $1',
      [id]
    );
    if (!result.rows.length) return { title: 'Lista' };
    const list = result.rows[0];
    return {
      title: list.title,
      description: list.description || `Lista de videojuegos: ${list.title} en myRankee.`,
    };
  } catch {
    return { title: 'Lista' };
  }
}

export default function ListDetailLayout({ children }) {
  return children;
}
