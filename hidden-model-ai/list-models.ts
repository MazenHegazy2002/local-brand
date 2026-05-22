import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('No API KEY found in .env.local');
    return;
  }

  console.log('Using API Key:', apiKey.substring(0, 10) + '...');

  const ai = new GoogleGenAI({ apiKey: apiKey });

  try {
    console.log('Fetching models...');
    // The new SDK uses a different way to list models, let's try the standard way first.
    // If using @google/genai (v1+), it might be ai.models.list()
    const response = await ai.models.list();

    console.log('\n--- AVAILABLE MODELS ---');
    response.models.forEach(model => {
      console.log(`- ${model.name} (Methods: ${model.supportedGenerationMethods?.join(', ')})`);
    });
    console.log('------------------------\n');
  } catch (err) {
    console.error('Error listing models:', err);
  }
}

listModels();
