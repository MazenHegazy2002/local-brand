import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load keys
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const keys = [];
envContent.split('\n').forEach(line => {
  const match = line.match(/^(GEMINI_API_KEY(?:_\d+)?)=(.*)$/);
  if (match) keys.push(match[2].trim());
});

console.log(`Loaded ${keys.length} keys.`);

// Helper delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runDiagnosis() {
  const key = keys[0]; // Test just the first key for clarity
  console.log(`\nDiagnostic running on key ending in ...${key.slice(-5)}`);

  const genAI = new GoogleGenerativeAI(key);

  // TEST 1: Basic Text Generation (Standard Gemini)
  // This confirms if the Key is valid and API is enabled.
  console.log('\n--- TEST 1: Basic Text Generation (gemini-1.5-flash) ---');
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Ping.');
    const response = await result.response;
    console.log('✅ STATUS: SUCCESS');
    console.log('   Output:', response.text().slice(0, 50));
  } catch (e) {
    console.log('❌ STATUS: FAILED');
    console.log('   Error:', e.message);
    if (e.message.includes('429')) console.log('   -> ANALYSIS: Key is valid but Rate Limited.');
    if (e.message.includes('API not enabled'))
      console.log('   -> ANALYSIS: API is not enabled in Google Console.');
    if (e.message.includes('key not valid'))
      console.log('   -> ANALYSIS: API Key is deleted or invalid.');
  }

  await delay(1000);

  // TEST 2: Image Generation Capability
  // This checks if we can actually make images with the 2.0-flash-exp model
  console.log('\n--- TEST 2: Image Generation (gemini-2.0-flash-exp) ---');
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent('Generate an image of a red cube.');
    const response = await result.response;

    // Inspect capabilities
    let hasImage = false;
    if (response.candidates && response.candidates[0].content.parts) {
      response.candidates[0].content.parts.forEach(p => {
        if (p.inlineData) hasImage = true;
      });
    }

    if (hasImage) {
      console.log('✅ STATUS: SUCCESS - Image Data Returned');
    } else {
      console.log('⚠️ STATUS: RESPONSE RECEIVED - BUT NO IMAGE');
      console.log('   Output:', response.text() ? response.text().slice(0, 100) : 'No text');
      console.log('   -> ANALYSIS: Model is text-only or refused to generate image.');
    }
  } catch (e) {
    console.log('❌ STATUS: FAILED');
    console.log('   Error:', e.message);
  }
}

runDiagnosis();
