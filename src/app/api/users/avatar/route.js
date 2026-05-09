import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { checkRateLimit, getIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';

const BUCKET = 'avatars';
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

function getUser(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try { return jwt.verify(auth.slice(7), process.env.JWT_SECRET); }
  catch { return null; }
}

export async function POST(request) {
  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const ip = getIp(request);
  const rl = checkRateLimit(`write:${ip}`, LIMITS.write.limit, LIMITS.write.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  let formData;
  try { formData = await request.formData(); }
  catch { return Response.json({ error: 'Formato inválido' }, { status: 400 }); }

  const file = formData.get('avatar');
  if (!file || typeof file === 'string')
    return Response.json({ error: 'No se recibió ningún archivo' }, { status: 400 });

  if (!file.type.startsWith('image/'))
    return Response.json({ error: 'El archivo debe ser una imagen' }, { status: 400 });

  if (file.size > MAX_BYTES)
    return Response.json({ error: 'La imagen no puede superar los 2 MB' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = `${user.id}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: 'image/jpeg', upsert: true });

  if (uploadError) {
    console.error('[avatar] upload error:', uploadError);
    return Response.json({ error: 'Error al subir la imagen' }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;

  await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatarUrl, user.id]);

  return Response.json({ avatar_url: avatarUrl });
}

export async function DELETE(request) {
  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  await supabase.storage.from(BUCKET).remove([`${user.id}.jpg`]);
  await pool.query('UPDATE users SET avatar_url = NULL WHERE id = $1', [user.id]);

  return Response.json({ success: true });
}
