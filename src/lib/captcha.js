export async function verifyCaptcha(token) {
  if (!token) return false;

  // Skip in dev if no secret is configured
  if (!process.env.HCAPTCHA_SECRET_KEY) {
    return process.env.NODE_ENV !== 'production';
  }

  try {
    const res = await fetch('https://api.hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret:   process.env.HCAPTCHA_SECRET_KEY,
        response: token,
      }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}
