/**
 * Lightweight DOMPurify mock for Jest. Implements the `sanitize(dirty, options)`
 * method used by `src/lib/utils.ts`. Strips unsafe tags/attributes using regex,
 * which is fine for tests that just assert content is removed.
 */

type Options = {
  ALLOWED_TAGS?: string[];
  ALLOWED_ATTR?: string[];
  FORBID_TAGS?: string[];
  FORBID_ATTR?: string[];
  ALLOW_DATA_ATTR?: boolean;
};

function stripTags(html: string, forbidTags: string[]): string {
  let out = html;
  for (const tag of forbidTags) {
    // Remove paired tags with their content
    out = out.replace(new RegExp(`<${tag}\\b[^<]*(?:(?!</${tag}>)<[^<]*)*</${tag}>`, 'gi'), '');
    // Remove self-closing or unmatched opening tags
    out = out.replace(new RegExp(`<\\s*${tag}\\b[^>]*/?>`, 'gi'), '');
  }
  return out;
}

function stripAttrs(html: string, forbidAttrs: string[]): string {
  let out = html;
  for (const attr of forbidAttrs) {
    out = out.replace(new RegExp(`\\s${attr}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]*)`, 'gi'), '');
  }
  // Also strip any on* event handler (defence-in-depth)
  out = out.replace(/\s(on\w+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '');
  // Strip javascript: in href/src attributes
  out = out.replace(/\s(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*')/gi, '');
  return out;
}

const DOMPurify = {
  sanitize(dirty: string, options: Options = {}): string {
    if (!dirty) return '';
    const forbidTags = options.FORBID_TAGS ?? ['script', 'style', 'iframe', 'object', 'embed', 'form'];
    const forbidAttrs = options.FORBID_ATTR ?? [];
    let out = stripTags(dirty, forbidTags);
    out = stripAttrs(out, forbidAttrs);
    return out.trim();
  },
};

export default DOMPurify;
