/**
 * Machine-translate product copy to Egyptian-friendly Arabic via the Claude API.
 * Needs ANTHROPIC_API_KEY; without it (or on any failure) returns null so product
 * creation is never blocked — sellers can still fill titleAr by hand.
 */
export async function translateToArabic(
  title: string,
  description?: string | null
): Promise<{ titleAr: string; descriptionAr: string | null } | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || !title.trim()) return null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.TRANSLATE_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content:
              'Translate this e-commerce product into natural Modern Standard Arabic. Keep brand names and model numbers in Latin letters. Reply with ONLY JSON: {"title":"...","description":"..."} (description "" if input empty).\n\n' +
              JSON.stringify({ title, description: description || '' }),
          },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? '';
    const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    if (!parsed.title) return null;
    return { titleAr: parsed.title, descriptionAr: parsed.description || null };
  } catch {
    return null;
  }
}
