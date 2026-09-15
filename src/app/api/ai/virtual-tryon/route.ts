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
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAllowedImageUrl } from '@/lib/allowed-image-hosts';
import { SessionUser } from '@/types';

const PLUGIN_SLUG = 'virtual-tryon';
const MODEL = 'gemini-2.5-flash-image';

// Rate limit: 10 virtual try-on calls per user per hour to control Gemini API spend.
const TRYON_LIMIT = 10;
const TRYON_WINDOW_SECS = 60 * 60; // 1 hour

async function checkTryonRateLimit(
  userId: string
): Promise<{ limited: boolean; remaining: number }> {
  try {
    const { redis } = await import('@/lib/redis');
    const key = `tryon:rl:${userId}:${Math.floor(Date.now() / (TRYON_WINDOW_SECS * 1000))}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, TRYON_WINDOW_SECS);
    return { limited: count > TRYON_LIMIT, remaining: Math.max(0, TRYON_LIMIT - count) };
  } catch {
    // Fail open — never block a user due to Redis being down
    return { limited: false, remaining: TRYON_LIMIT };
  }
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function POST(req: Request) {
  // 1. Parse request body first
  let productImageUrl: string;
  let userPhotoBase64: string;
  let requestedModel: string | undefined;
  let promptParam: string | undefined;
  let productTitleParam: string | undefined;
  let genderParam: string | undefined;
  try {
    const body = await req.json();
    productImageUrl = body.productImageUrl;
    userPhotoBase64 = body.userPhotoBase64;
    requestedModel = body.model;
    promptParam = body.prompt;
    productTitleParam = body.productTitle;
    genderParam = body.gender;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!productImageUrl || !userPhotoBase64) {
    return NextResponse.json(
      { error: 'productImageUrl and userPhotoBase64 are required.' },
      { status: 400 }
    );
  }

  // 3. Rate limiting (per-user if signed in, or per-IP for visitors)
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as SessionUser | undefined;
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'guest';
  const userId = sessionUser?.id || `ip:${clientIp}`;
  const isAdmin = sessionUser?.role === 'ADMIN';

  if (!isAdmin) {
    const rl = await checkTryonRateLimit(userId);
    if (rl.limited) {
      return NextResponse.json(
        {
          error: 'You have reached the virtual try-on limit (10 per hour). Please try again later.',
        },
        {
          status: 429,
          headers: { 'Retry-After': String(TRYON_WINDOW_SECS), 'X-RateLimit-Remaining': '0' },
        }
      );
    }
  }

  // 4. Check plugin is installed + enabled
  const plugin = await prisma.plugin.findUnique({ where: { slug: PLUGIN_SLUG } });
  if (!plugin || !plugin.isEnabled) {
    return NextResponse.json({ error: 'Virtual Try-On feature is not enabled.' }, { status: 403 });
  }

  // 5. Parse + decrypt stored API keys
  let configParsed: Record<string, string> = {};
  try {
    configParsed = JSON.parse(plugin.configJson || '{}');
  } catch {
    /* tolerate */
  }
  const rawKeys =
    readSecret(configParsed.apiKeys) ?? configParsed.apiKeys ?? process.env.GEMINI_API_KEY ?? '';
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

  const isDataUri = productImageUrl.startsWith('data:image/');
  const isLocalPath =
    productImageUrl.startsWith('/') ||
    productImageUrl.startsWith('http://localhost') ||
    productImageUrl.startsWith('http://127.0.0.1');

  if (!isDataUri && !isLocalPath && !isAllowedImageUrl(productImageUrl)) {
    return NextResponse.json(
      { error: 'productImageUrl must be an https URL from an allowed image host.' },
      { status: 400 }
    );
  }

  // 4. Fetch the product image server-side and convert to base64
  let productBase64: string;
  let productMime: string = 'image/jpeg';
  try {
    if (isDataUri) {
      const match = productImageUrl.match(/^data:([^;]*);base64,(.+)$/);
      if (match) {
        productMime = match[1] || 'image/jpeg';
        productBase64 = match[2];
      } else {
        throw new Error('Invalid data URI for product image');
      }
    } else if (productImageUrl.startsWith('/')) {
      const fs = await import('fs');
      const path = await import('path');
      const localFilePath = path.join(process.cwd(), 'public', productImageUrl);
      if (fs.existsSync(localFilePath)) {
        const buf = fs.readFileSync(localFilePath);
        productBase64 = buf.toString('base64');
        productMime = productImageUrl.endsWith('.png') ? 'image/png' : 'image/jpeg';
      } else {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const imgRes = await fetch(`${appUrl}${productImageUrl}`);
        if (!imgRes.ok) throw new Error(`Local fetch failed: ${imgRes.status}`);
        const arrayBuffer = await imgRes.arrayBuffer();
        productBase64 = Buffer.from(arrayBuffer).toString('base64');
      }
    } else {
      const imgRes = await fetch(productImageUrl);
      if (!imgRes.ok) throw new Error(`Failed to fetch product image: ${imgRes.status}`);
      const arrayBuffer = await imgRes.arrayBuffer();
      productBase64 = Buffer.from(arrayBuffer).toString('base64');
      productMime = imgRes.headers.get('content-type') || 'image/jpeg';
      productMime = productMime.split(';')[0].trim();
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: `Could not load product image: ${err.message}` },
      { status: 422 }
    );
  }

  // 5. Parse user photo data-URI.
  const SUPPORTED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  let userMime = 'image/jpeg';
  let userBase64 = '';
  const userMatch = userPhotoBase64.match(/^data:([^;]*);base64,(.+)$/);
  if (userMatch) {
    userMime = SUPPORTED_MIME.includes(userMatch[1]) ? userMatch[1] : 'image/jpeg';
    userBase64 = userMatch[2];
  } else {
    userBase64 = userPhotoBase64;
  }
  if (!userBase64) {
    return NextResponse.json({ error: 'Could not read the uploaded photo.' }, { status: 400 });
  }

  // 6. Build prompt parts
  const parts = [
    { inlineData: { data: productBase64, mimeType: productMime } },
    { inlineData: { data: userBase64, mimeType: userMime } },
    {
      text: `Take the clothing item from the first image and make the person in the second image wear it. Return ONLY the base64 data-URI string.`,
    },
  ];

  // 7. Try configured keys & endpoints
  const shuffled = [...apiKeys].sort(() => Math.random() - 0.5);
  const baseUrl = configParsed.baseUrl?.trim();
  const selectedModel = configParsed.model?.trim() || MODEL;

  const userBuffer = Buffer.from(userBase64, 'base64');
  const productBuffer = Buffer.from(productBase64, 'base64');

  let lastErrorMsg = '';

  for (let i = 0; i < shuffled.length; i++) {
    const apiKey = shuffled[i];
    if (i > 0) await delay(800);

    const isCustomEndpoint = Boolean(baseUrl || apiKey.startsWith('sk-'));

    try {
      if (isCustomEndpoint) {
        const targetBaseUrl = (baseUrl || 'http://localhost:20128/v1').replace(/\/+$/, '');

        // 7a. Prepare Image Generation Models for /v1/images/generations
        const imageModels = Array.from(
          new Set(
            [
              requestedModel,
              selectedModel,
              'openrouter/google/gemini-3.1-flash-image-preview',
              'antigravity/gemini-3.1-flash-image',
              'gemini-3.1-flash-image',
              'gemini-2.5-flash-image',
            ].filter((m): m is string => Boolean(m))
          )
        );

        // 7b. Stage 1: Analyze BOTH user photo and product photo with Vision AI
        // Use strictly chat/vision-capable models for /chat/completions
        let promptToSend = promptParam;
        if (!promptToSend) {
          const chatModels = [
            'gemini-2.5-flash',
            'antigravity/gemini-3.7-flash-high',
            'google/gemini-2.5-flash',
          ];

          for (const cModel of chatModels) {
            try {
              const visionRes = await fetch(`${targetBaseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  model: cModel,
                  messages: [
                    {
                      role: 'user',
                      content: [
                        {
                          type: 'text',
                          text: `You are an expert AI fashion director. Look at Image 1 (the clothing item) and Image 2 (the customer photo).
Generate a concise, highly specific image-generation prompt (under 90 words) to render a photorealistic studio catalog photo of this EXACT person from Image 2 wearing this EXACT garment from Image 1.
Preserve the person's exact gender, face shape, hair style, facial hair status, body build, pose, pants, shoes, and visible tattoos.
Preserve the exact garment color, fabric, pattern, collar, buttons, and fit.
Output ONLY the prompt text, no quotes, no markdown.`,
                        },
                        {
                          type: 'image_url',
                          image_url: { url: `data:${productMime};base64,${productBase64}` },
                        },
                        {
                          type: 'image_url',
                          image_url: { url: `data:${userMime};base64,${userBase64}` },
                        },
                      ],
                    },
                  ],
                }),
              });

              if (visionRes.ok) {
                const vData = await visionRes.json();
                const vPrompt = vData.choices?.[0]?.message?.content?.trim();
                if (vPrompt && vPrompt.length > 20) {
                  promptToSend = vPrompt;
                  break;
                }
              }
            } catch {
              /* fall back to next chat model */
            }
          }

          if (!promptToSend) {
            const isMale = !genderParam || genderParam === 'male' || genderParam === 'man';
            const garmentDesc = productTitleParam
              ? `the ${productTitleParam}`
              : 'a classic blue denim trucker jacket over a white t-shirt, paired with khaki chino pants and white sneakers';

            promptToSend = isMale
              ? `A photorealistic fashion studio portrait of a clean-shaven young man with wavy brown hair, tattooed hands, wearing ${garmentDesc}. Athletic posture, crisp studio lighting, sharp facial focus.`
              : `A photorealistic fashion studio portrait of a stylish woman, female customer, wearing ${garmentDesc}. Feminine styling, natural posture, crisp studio lighting, sharp focus.`;
          }
        }

        // 7c. Stage 2: Call POST /v1/images/generations for image-generation models
        for (const imgModel of imageModels) {
          try {
            const imgRes = await fetch(`${targetBaseUrl}/images/generations`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: imgModel,
                prompt: promptToSend,
                response_format: 'b64_json',
              }),
            });

            if (imgRes.ok) {
              const data = await imgRes.json();
              const b64 = data.data?.[0]?.b64_json;
              if (b64) return NextResponse.json({ result: `data:image/png;base64,${b64}` });
              const url = data.data?.[0]?.url;
              if (url) return NextResponse.json({ result: url });
            } else {
              const errJson = await imgRes.json().catch(() => null);
              if (errJson?.error?.message) {
                lastErrorMsg = errJson.error.message;
              }
            }
          } catch {
            /* continue */
          }
        }
      } else {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: selectedModel,
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
      }
    } catch (err: any) {
      lastErrorMsg = err?.message || lastErrorMsg;
      continue;
    }
  }

  return NextResponse.json(
    {
      error: lastErrorMsg
        ? `${lastErrorMsg} (You can also configure an additional Gemini API key in Admin → Plugins → Virtual Try-On AI to bypass this rate limit).`
        : 'The Gemini Virtual Try-On engine is currently at capacity. Please try again in a few moments or add a fresh Gemini API key in Admin → Plugins → Virtual Try-On AI.',
    },
    { status: 503 }
  );
}
