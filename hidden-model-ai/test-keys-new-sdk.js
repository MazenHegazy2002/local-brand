import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

const keys = [];
envContent.split('\n').forEach(line => {
  const match = line.match(/^(GEMINI_API_KEY(?:_\d+)?)=(.*)$/);
  if (match) {
    keys.push(match[2].trim());
  }
});

console.log(`Found ${keys.length} keys.`);

async function test() {
  const key = keys[0];
  console.log(`Testing first key: ...${key.slice(-5)}`);
  const genAI = new GoogleGenerativeAI(key);

  const models = ['gemini-3-flash', 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'];

  for (const modelName of models) {
    try {
      console.log(`\n--- Testing ${modelName} ---`);
      const model = genAI.getGenerativeModel({ model: modelName });

      // Ask for an image to see if it refuses or tries
      const prompt = 'Generate an image of a red apple.';
      const result = await model.generateContent(prompt);
      const response = await result.response;

      // Check for candidates
      if (response.candidates && response.candidates.length > 0) {
        const cand = response.candidates[0];
        if (cand.content && cand.content.parts) {
          let foundImage = false;
          cand.content.parts.forEach(p => {
            if (p.inlineData) {
              console.log('  [IMAGE DETECTED] This model returned an image!');
              foundImage = true;
            }
            if (p.text) {
              console.log(`  [TEXT RESPONSE]: "${p.text.slice(0, 100)}..."`);
            }
          });
          if (!foundImage && !cand.content.parts.some(p => p.text)) {
            console.log('  [EMPTY] No text or image parts.');
          }
        }
      } else {
        console.log('  [NO CANDIDATES]');
      }
    } catch (error) {
      console.error(`  [ERROR]: ${error.message}`);
    }
  }
}

test();
