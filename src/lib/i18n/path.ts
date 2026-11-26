/**
 * The path without its /ar or /fk language prefix: "/ar/seller-hub" → "/seller-hub".
 * Arabic and Franko pages keep the prefix in the browser URL, so checks like
 * `pathname.startsWith('/seller-hub')` must run on the stripped path.
 */
export function stripLangPrefix(pathname: string | null | undefined): string {
  if (!pathname) return '';
  const match = pathname.match(/^\/(ar|fk)(?=\/|$)/);
  if (!match) return pathname;
  return pathname.slice(match[0].length) || '/';
}
