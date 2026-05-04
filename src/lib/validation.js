import { z } from 'zod';

// Reusable field primitives
const nombre = z.string().trim()
  .min(2,  'El nombre debe tener al menos 2 caracteres')
  .max(50, 'El nombre no puede superar los 50 caracteres')
  .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'El nombre solo puede contener letras y espacios');

const apellido = z.string().trim()
  .min(2,  'El apellido debe tener al menos 2 caracteres')
  .max(50, 'El apellido no puede superar los 50 caracteres')
  .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'El apellido solo puede contener letras y espacios');

const username = z.string().trim()
  .min(3,  'El nombre de usuario debe tener al menos 3 caracteres')
  .max(30, 'El nombre de usuario no puede superar los 30 caracteres')
  .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guiones bajos (_)');

const email = z.string().trim()
  .email('Introduce un correo electrónico válido')
  .max(255, 'El correo no puede superar los 255 caracteres')
  .toLowerCase();

// ── Schemas ───────────────────────────────────────────────────────────────────

export const userRegistrationSchema = z.object({
  nombre,
  apellido,
  username,
  email,
  password:       z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  age_confirmed:  z.boolean().optional(),
  captcha_token:  z.string().optional(),
  website:        z.string().optional(), // honeypot
});

export const userLoginSchema = z.object({
  identifier:    z.string().trim().min(1, 'Introduce tu correo o nombre de usuario'),
  password:      z.string().min(1, 'La contraseña es obligatoria'),
  captcha_token: z.string().optional(),
});

export const reviewSchema = z.object({
  igdb_game_id: z.number().int('El ID del juego debe ser un entero').positive('El ID del juego debe ser positivo'),
  content:      z.string().trim()
    .min(5,    'La reseña debe tener al menos 5 caracteres')
    .max(2000, 'La reseña no puede superar los 2000 caracteres'),
});

export const commentSchema = z.object({
  content: z.string().trim()
    .min(2,   'El comentario debe tener al menos 2 caracteres')
    .max(500, 'El comentario no puede superar los 500 caracteres'),
});

export const listSchema = z.object({
  title: z.string().trim()
    .min(3,   'El título debe tener al menos 3 caracteres')
    .max(100, 'El título no puede superar los 100 caracteres'),
  description: z.string().trim()
    .max(500, 'La descripción no puede superar los 500 caracteres')
    .optional()
    .nullable(),
  is_public: z.boolean().optional(),
});

export const profileUpdateSchema = z.object({
  nombre,
  apellido,
  bio: z.string().trim()
    .max(300, 'La biografía no puede superar los 300 caracteres')
    .optional()
    .nullable(),
  avatar_url: z.string().trim().url('La URL del avatar no es válida')
    .optional()
    .nullable(),
});

export const emailSchema = z.object({
  email,
});

export const passwordResetSchema = z.object({
  token:    z.string().min(1, 'Token requerido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

// ── Validation helper ─────────────────────────────────────────────────────────

export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.errors.map((e) => ({
      field:   e.path.join('.') || 'input',
      message: e.message,
    }));
    return { ok: false, errors: details };
  }
  return { ok: true, data: result.data };
}

export function validationErrorResponse(errors) {
  return Response.json(
    { error: 'Datos inválidos', details: errors },
    { status: 400 }
  );
}
