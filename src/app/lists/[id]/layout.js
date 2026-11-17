import pool from '@/lib/db';

export async function generateMetadata({ params }) {
  const { id } = await params;
  if (!/^\d+$/.test(String(id))) return { title: 'Lista' };
  try {
    const result = await pool.query(
      'SELECT title, description, is_public FROM lists WHERE id = $1',
      [id]
    );
    if (!result.rows.length) return { title: 'Lista' };
    const list = result.rows[0];
    // Metadata is rendered without knowing who's asking (the session lives in the browser): a private
    // list never exposes its title/description here, and isn't indexed.
    if (!list.is_public) return { title: 'Lista', robots: { index: false, follow: false } };
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
