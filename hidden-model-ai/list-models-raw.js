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

const key = keys[0];
console.log(`Using key: ...${key.slice(-5)}`);

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.models) {
      console.log('AVAILABLE MODELS:');
      data.models.forEach(m => console.log(` - ${m.name}`));
    } else {
      console.log('No models found or error:', JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

listModels();
