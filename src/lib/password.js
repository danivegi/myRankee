// Shared password policy — used by both client components and server routes.
export const PASSWORD_RULES = [
  { key: 'length',    label: 'Mínimo 8 caracteres',               test: (p) => p.length >= 8 },
  { key: 'uppercase', label: 'Al menos 1 mayúscula (A-Z)',         test: (p) => /[A-Z]/.test(p) },
  { key: 'lowercase', label: 'Al menos 1 minúscula (a-z)',         test: (p) => /[a-z]/.test(p) },
  { key: 'number',    label: 'Al menos 1 número (0-9)',             test: (p) => /[0-9]/.test(p) },
  { key: 'special',   label: 'Al menos 1 carácter especial',        test: (p) => /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(p) },
];

export function checkPassword(password) {
  const results  = PASSWORD_RULES.map((r) => ({ key: r.key, label: r.label, met: r.test(password) }));
  const score    = results.filter((r) => r.met).length;
  const strength = score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong';
  return { results, score, strength, valid: score === PASSWORD_RULES.length };
}
