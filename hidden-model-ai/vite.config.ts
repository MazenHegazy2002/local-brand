import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  const apiKeys = Object.keys(env)
    .filter(key => key.startsWith('GEMINI_API_KEY') || key === 'API_KEY')
    .map(key => env[key])
    .filter(Boolean);

  console.log(`[Vite Config] Found ${apiKeys.length} API keys declared in environment.`);

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      __API_KEYS__: JSON.stringify(apiKeys),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          entryFileNames: 'assets/hidden-model.js',
          assetFileNames: 'assets/hidden-model.[ext]',
          chunkFileNames: 'assets/[name].js',
        },
      },
    },
  };
});
