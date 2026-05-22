import { GoogleGenerativeAI } from '@google/generative-ai';
import { GenerationConfig } from '../types';

// @ts-ignore
declare const __API_KEYS__: string[];

// Helper to get all available API keys
const getAvailableApiKeys = (): string[] => {
  // @ts-ignore
  const keys = (typeof __API_KEYS__ !== 'undefined' ? __API_KEYS__ : []) as string[];
  console.log(`[GeminiService] Loaded ${keys.length} keys.`);
  return keys;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateHiddenModelImage = async (config: GenerationConfig): Promise<string> => {
  console.log('Starting generateHiddenModelImage...');

  const apiKeys = getAvailableApiKeys();
  if (apiKeys.length === 0) {
    console.error('API Key is missing!');
    throw new Error('API Key is missing.');
  }

  const designDetails = `Color: ${config.colorName}. Style: ${config.style}. Additional Details: ${config.designPrompt || 'None'}.`;

  let parts: any[] = [];

  if (config.image) {
    const base64Data = config.image.split(',')[1];
    const mimeType = config.image.split(';')[0].split(':')[1];
    parts = [
      { inlineData: { data: base64Data, mimeType: mimeType } },
      {
        text: `Apply the "Ghost Mannequin" (invisible model) effect to this clothing. 
          Modify the item based on these requirements: ${designDetails}
          Product Category: ${config.category}. 
          Desired Pose: ${config.pose}. 
          Background: ${config.bgColor}.
          The result should look like professional commercial photography. No human body parts (skin, face, hands) should be visible.
          Important: Return the result as a high-quality image of the Ghost Mannequin effect.`,
      },
    ];
  } else {
    parts = [
      {
        text: `Create a professional high-end "Ghost Mannequin" product shot of a ${config.category} item from scratch.
          Design specs: ${designDetails}
          Pose: ${config.pose}. 
          Background: ${config.bgColor}. 
          The item must appear 3D and filled out as if worn by an invisible person. High fashion studio quality.
          Important: Return the result as a high-quality image of the Ghost Mannequin effect.`,
      },
    ];
  }

  // Shuffle keys
  const shuffledKeys = apiKeys.sort(() => Math.random() - 0.5);

  const modelsToTry = ['gemini-2.0-flash-exp'];

  let lastError;

  for (const apiKey of shuffledKeys) {
    console.log(`Using API Key: ...${apiKey.slice(-5)}`);
    const genAI = new GoogleGenerativeAI(apiKey);

    for (const modelName of modelsToTry) {
      // Add small delay to avoid hitting rate limits instantly across all keys
      if (apiKey !== shuffledKeys[0]) await delay(1000);

      try {
        console.log(`Attempting to generate with model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });

        const result = await model.generateContent(parts);
        const response = await result.response;
        console.log(`Success with ${modelName}`);

        // Try to find image data in response
        if (response.candidates && response.candidates.length > 0) {
          const candidate = response.candidates[0];
          if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
              // @ts-ignore
              if (part.inlineData) {
                // @ts-ignore
                return `data:image/png;base64,${part.inlineData.data}`;
              }
            }
          }
        }

        console.warn(`Response received from ${modelName} but no inline image data found.`);
      } catch (err: any) {
        console.warn(`Failed with key ...${apiKey.slice(-5)} and model ${modelName}:`, err.message);
        lastError = err;

        if (
          err.message.includes('429') ||
          err.message.includes('Quota') ||
          err.message.includes('quota') ||
          err.message.includes('RESOURCE_EXHAUSTED')
        ) {
          console.warn(
            `Quota exceeded for key ...${apiKey.slice(-5)} on model ${modelName}. Trying next model...`
          );
          continue; // Try next model on SAME key
        }
      }
    }
  }

  console.error('All keys and models failed. Last error:', lastError);
  console.log('Switching to DEMO MODE due to API failure.');
  return 'https://placehold.co/1024x1024/1a1a1a/FFF.png?text=Demo+Mode%0AResult+(Quota+Exceeded)';
};

export const virtualTryOn = async (clothingImage: string, userPhoto: string): Promise<string> => {
  const apiKeys = getAvailableApiKeys();
  if (apiKeys.length === 0) throw new Error('API Key is missing.');

  const clothingBase64 = clothingImage.split(',')[1];
  const clothingMime = clothingImage.split(';')[0].split(':')[1];

  const userBase64 = userPhoto.split(',')[1];
  const userMime = userPhoto.split(';')[0].split(':')[1];

  const parts = [
    { inlineData: { data: clothingBase64, mimeType: clothingMime } },
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

  const modelsToTry = ['gemini-2.0-flash-exp'];
  const shuffledKeys = apiKeys.sort(() => Math.random() - 0.5);

  for (const apiKey of shuffledKeys) {
    console.log(`Virtual Try-On using Key: ...${apiKey.slice(-5)}`);
    const genAI = new GoogleGenerativeAI(apiKey);

    for (const modelName of modelsToTry) {
      if (apiKey !== shuffledKeys[0]) await delay(1000); // Polite delay
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(parts);
        const response = await result.response;

        if (response.candidates && response.candidates.length > 0) {
          const candidate = response.candidates[0];
          if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
              // @ts-ignore
              if (part.inlineData) {
                // @ts-ignore
                return `data:image/png;base64,${part.inlineData.data}`;
              }
            }
          }
        }
      } catch (err: any) {
        console.warn(
          `Virtual try-on failed with key ...${apiKey.slice(-5)} and ${modelName}`,
          err.message
        );
        if (
          err.message.includes('429') ||
          err.message.includes('Quota') ||
          err.message.includes('quota') ||
          err.message.includes('RESOURCE_EXHAUSTED')
        ) {
          console.warn(
            `Quota exceeded for key ...${apiKey.slice(-5)} on model ${modelName}. Trying next model...`
          );
          continue; // Try next model on SAME key
        }
      }
    }
  }

  console.log('Switching to DEMO MODE due to API failure.');
  return 'https://placehold.co/1024x1024/1a1a1a/FFF.png?text=Demo+Mode%0ATry-On+Result';
};
