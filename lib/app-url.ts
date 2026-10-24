export function publicAppUrl() {
  const explicit = process.env.APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL?.replace(/^https?:\/\//, '');
  if (prod) return 'https://' + prod;
  const preview = process.env.VERCEL_URL?.replace(/^https?:\/\//, '');
  if (preview) return 'https://' + preview;
  return 'http://127.0.0.1:3000';
}
