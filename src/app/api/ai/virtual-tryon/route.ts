// POST /api/ai/virtual-tryon
//
// Body (JSON):
//   productImageUrl  – absolute URL of the product image to use as the garment
//   userPhotoBase64  – data-URI of the user's photo (data:image/...;base64,...)
//
// Returns:
//   { result: "data:image/png;base64,..." }   on success
//   { error: string }                          on failure
//
// The route checks that the `virtual-tryon` plugin is installed + enabled in
// the DB, decrypts the stored Gemini API keys, then calls the Gemini
// gemini-2.5-flash-image model to perform the virtual try-on.

import { NextResponse } from 'next/server';
import { GoogleGenAI, Modality } from '@google/genai';
import { prisma } from '@/lib/prisma';
import { readSecret } from '@/lib/secrets';

const PLUGIN_SLUG = 'virtual-tryon';
const MODEL = 'gemini-2.5-flash-image';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function POST(req: Request) {
  // 1. Check plugin is installed + enabled
  const plugin = await prisma.plugin.findUnique({ where: { slug: PLUGIN_SLUG } });
  if (!plugin || !plugin.isEnabled) {
    return NextResponse.json({ error: 'Virtual Try-On feature is not enabled.' }, { status: 403 });
  }

  // 2. Parse + decrypt stored API keys
  let configParsed: Record<string, string> = {};
  try {
    configParsed = JSON.parse(plugin.configJson || '{}');
  } catch {
    /* tolerate */
  }
  const rawKeys = readSecret(configParsed.apiKeys) ?? configParsed.apiKeys ?? '';
  const apiKeys = rawKeys
    .split(',')
    .map((k: string) => k.trim())
    .filter(Boolean);

  if (apiKeys.length === 0) {
    return NextResponse.json(
      {
        error:
          'No Gemini API keys configured. Please set them in Admin → Plugins → Virtual Try-On AI.',
      },
      { status: 500 }
    );
  }

  // 3. Parse request body
  let productImageUrl: string;
  let userPhotoBase64: string;
  try {
    const body = await req.json();
    productImageUrl = body.productImageUrl;
    userPhotoBase64 = body.userPhotoBase64;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!productImageUrl || !userPhotoBase64) {
    return NextResponse.json(
      { error: 'productImageUrl and userPhotoBase64 are required.' },
      { status: 400 }
    );
  }

  // 4. Fetch the product image server-side and convert to base64
  let productBase64: string;
  let productMime: string;
  try {
    const imgRes = await fetch(productImageUrl);
    if (!imgRes.ok) throw new Error(`Failed to fetch product image: ${imgRes.status}`);
    const arrayBuffer = await imgRes.arrayBuffer();
    productBase64 = Buffer.from(arrayBuffer).toString('base64');
    productMime = imgRes.headers.get('content-type') || 'image/jpeg';
    // Strip any parameters (e.g. charset)
    productMime = productMime.split(';')[0].trim();
  } catch (err: any) {
    return NextResponse.json(
      { error: `Could not load product image: ${err.message}` },
      { status: 422 }
    );
  }

  // 5. Parse user photo data-URI
  const userMatch = userPhotoBase64.match(/^data:([^;]+);base64,(.+)$/);
  if (!userMatch) {
    return NextResponse.json(
      { error: 'userPhotoBase64 must be a valid data-URI.' },
      { status: 400 }
    );
  }
  const userMime = userMatch[1];
  const userBase64 = userMatch[2];

  // 6. Build the prompt parts
  const parts = [
    { inlineData: { data: productBase64, mimeType: productMime } },
    { inlineData: { data: userBase64, mimeType: userMime } },
    {
      text: `Take the clothing item from the first image and make the person in the second image wear it.
The clothing should naturally fit their body shape, height, and posture.
Preserve the person's identity, face, and hair, but replace their current upper-body clothing with the new item.
Adjust shadows, lighting, and wrinkles to make the integration look completely realistic and seamless.
The final output should look like a real photo of the person wearing the new design.
Return ONLY the image.`,
    },
  ];

  // 7. Shuffle keys and try each in order
  const shuffled = [...apiKeys].sort(() => Math.random() - 0.5);

  for (let i = 0; i < shuffled.length; i++) {
    const apiKey = shuffled[i];
    if (i > 0) await delay(800);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: 'user', parts }],
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            return NextResponse.json({
              result: `data:image/png;base64,${part.inlineData.data}`,
            });
          }
        }
      }
    } catch (err: any) {
      const msg: string = err.message ?? '';
      // Quota / rate limit → try next key
      if (
        msg.includes('429') ||
        msg.includes('quota') ||
        msg.includes('Quota') ||
        msg.includes('RESOURCE_EXHAUSTED')
      ) {
        continue;
      }
      // Any other error — return immediately
      return NextResponse.json({ error: msg || 'Gemini API error.' }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: 'All API keys are currently at quota. Please try again in a minute.' },
    { status: 429 }
  );
}
