import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { checkRateLimit, rateLimitResponse, LIMITS, writeLimitKey } from '@/lib/rate-limit';

const BUCKET = 'avatars';
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

// Accepted formats, detected from the file's bytes (the declared type is
// client-controlled). Anything else — HEIC, GIF, SVG… — is rejected.
const FORMATS = [
  { ext: 'jpg',  contentType: 'image/jpeg', matches: (b) => b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF },
  { ext: 'png',  contentType: 'image/png',  matches: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) },
  { ext: 'webp', contentType: 'image/webp', matches: (b) => b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP' },
];

const avatarPath = (userId, ext) => `${userId}.${ext}`;

function getUser(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try { return jwt.verify(auth.slice(7), process.env.JWT_SECRET); }
  catch { return null; }
}

export async function POST(request) {
  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const rl = checkRateLimit(writeLimitKey(request, user), LIMITS.write.limit, LIMITS.write.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  let formData;
  try { formData = await request.formData(); }
  catch { return Response.json({ error: 'Formato inválido' }, { status: 400 }); }

  const file = formData.get('avatar');
  if (!file || typeof file === 'string')
    return Response.json({ error: 'No se recibió ningún archivo' }, { status: 400 });

  if (file.size > MAX_BYTES)
    return Response.json({ error: 'La imagen no puede superar los 2 MB' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const format = FORMATS.find((f) => f.matches(buffer));
  if (!format)
    return Response.json(
      { error: 'Formato de imagen no admitido. Usa una imagen JPG, PNG o WebP (HEIC no está admitido).' },
      { status: 400 }
    );

  const path = avatarPath(user.id, format.ext);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: format.contentType, upsert: true });

  if (uploadError) {
    console.error('[avatar] upload error:', uploadError);
    return Response.json({ error: 'Error al subir la imagen' }, { status: 500 });
  }

  // Remove the user's avatar in any other format so no stale file is left behind
  const stale = FORMATS.filter((f) => f !== format).map((f) => avatarPath(user.id, f.ext));
  const { error: cleanupError } = await supabase.storage.from(BUCKET).remove(stale);
  if (cleanupError) console.error('[avatar] cleanup error:', cleanupError);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;

  await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatarUrl, user.id]);

  return Response.json({ avatar_url: avatarUrl });
}

export async function DELETE(request) {
  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  await supabase.storage.from(BUCKET).remove(FORMATS.map((f) => avatarPath(user.id, f.ext)));
  await pool.query('UPDATE users SET avatar_url = NULL WHERE id = $1', [user.id]);

  return Response.json({ success: true });
}
