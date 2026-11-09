/** Una URL de archivo solo vale si es https y cuelga del prefijo público del bucket propio. */
export function isOwnBucketUrl(
  value: string,
  publicUrl: string | undefined = process.env.R2_PUBLIC_URL,
): boolean {
  if (!publicUrl) return false;

  let base: URL;
  let candidate: URL;
  try {
    base = new URL(publicUrl);
    candidate = new URL(value);
  } catch {
    return false;
  }

  if (base.protocol !== 'https:' || candidate.protocol !== 'https:') return false;
  if (candidate.origin !== base.origin) return false;

  const basePath = base.pathname.replace(/\/+$/, '');
  return candidate.pathname.startsWith(`${basePath}/`);
}
