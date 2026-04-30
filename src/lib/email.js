import { Resend } from 'resend';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
const FROM     = process.env.EMAIL_FROM ?? 'onboarding@resend.dev';

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

function buildHtml(body) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;">
  <div style="max-width:540px;margin:0 auto;padding:48px 24px;">
    <p style="margin:0 0 4px;font-size:26px;font-weight:900;letter-spacing:-0.5px;color:#FFFFFF;">myrankee</p>
    <div style="height:3px;width:40px;background:#A855F7;margin-bottom:36px;border-radius:2px;"></div>
    ${body}
    <hr style="border:none;border-top:1px solid #1A1A1A;margin:36px 0 20px;"/>
    <p style="font-size:11px;color:#3F3F46;margin:0;text-align:center;">
      myRankee · Tu comunidad de videojuegos · Si no creaste esta cuenta, ignora este mensaje.
    </p>
  </div>
</body>
</html>`;
}

async function send({ to, subject, body }) {
  const resend = getResend();
  if (!resend) {
    console.log(`[email:dev] To: ${to} | Subject: ${subject}`);
    return;
  }
  try {
    const { error } = await resend.emails.send({
      from:    FROM,
      to,
      subject,
      html:    buildHtml(body),
    });
    if (error) console.error('[email:resend]', error);
  } catch (e) {
    console.error('[email:resend] send failed:', e.message);
  }
}

export async function sendVerificationEmail(email, token, username) {
  const link = `${BASE_URL}/verify-email?token=${token}`;
  console.log(`[email:verify] ${email} → ${link}`);
  await send({
    to:      email,
    subject: 'Verifica tu cuenta de myRankee',
    body: `
      <p style="font-size:20px;font-weight:700;margin:0 0 10px;">Verifica tu cuenta</p>
      <p style="font-size:14px;color:#A1A1AA;line-height:1.7;margin:0 0 28px;">
        Hola <strong style="color:#FFFFFF;">@${username}</strong>, gracias por unirte a myRankee.<br/>
        Haz clic en el botón para activar tu cuenta.
      </p>
      <a href="${link}"
         style="display:inline-block;background:#A855F7;color:#FFFFFF;text-decoration:none;
                padding:14px 32px;border-radius:8px;font-weight:700;font-size:14px;margin-bottom:28px;">
        Verificar email
      </a>
      <p style="font-size:12px;color:#3F3F46;margin:0;">
        El enlace caduca en 24 horas.<br/>
        Si el botón no funciona, copia este enlace: <span style="color:#A855F7;">${link}</span>
      </p>`,
  });
}

export async function sendPasswordResetEmail(email, token, username) {
  const link = `${BASE_URL}/reset-password?token=${token}`;
  console.log(`[email:reset] ${email} → ${link}`);
  await send({
    to:      email,
    subject: 'Recupera tu contraseña en myRankee',
    body: `
      <p style="font-size:20px;font-weight:700;margin:0 0 10px;">Recupera tu contraseña</p>
      <p style="font-size:14px;color:#A1A1AA;line-height:1.7;margin:0 0 28px;">
        Hola <strong style="color:#FFFFFF;">@${username}</strong>, recibimos una solicitud para
        restablecer la contraseña de tu cuenta.
      </p>
      <a href="${link}"
         style="display:inline-block;background:#A855F7;color:#FFFFFF;text-decoration:none;
                padding:14px 32px;border-radius:8px;font-weight:700;font-size:14px;margin-bottom:28px;">
        Cambiar contraseña
      </a>
      <p style="font-size:12px;color:#3F3F46;margin:0;">
        El enlace caduca en 1 hora. Si no solicitaste este cambio, ignora este mensaje.<br/>
        Si el botón no funciona, copia este enlace: <span style="color:#A855F7;">${link}</span>
      </p>`,
  });
}
