import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '.env.local');

console.log('Reading env from:', envPath);
const envContent = fs.readFileSync(envPath, 'utf-8');

const keys = [];
envContent.split('\n').forEach(line => {
  const match = line.match(/^(GEMINI_API_KEY(?:_\d+)?)=(.*)$/);
  if (match) {
    keys.push(match[2].trim());
  }
});

console.log(`Found ${keys.length} keys.`);

// Test function
async function test() {
  for (const key of keys) {
    console.log(`Testing key ending in ...${key.slice(-5)}`);
    try {
      // Note: @google/genai SDK usage might differ slightly, using standard call
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: {
          parts: [{ text: 'Hello' }],
        },
      });

      console.log(
        'SUCCESS! Response:',
        response?.candidates?.[0]?.content?.parts?.[0]?.text || 'No text'
      );
      return; // We found a working key
    } catch (e) {
      console.error('FAIL:', e.message);
    }
  }
  console.log('ALL KEYS FAILED.');
}

test();
