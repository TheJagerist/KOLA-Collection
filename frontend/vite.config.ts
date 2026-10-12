import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const target = env.VITE_API_PROXY_TARGET || 'http://localhost:8000';

  return {
    plugins: [react(), tailwindcss()],
    // three.js (scène 3D du hero) est volumineux mais chargé à la demande, jamais au démarrage
    build: { chunkSizeWarningLimit: 600 },
    server: {
      host: true,
      port: 5173,
      // Nécessaire pour le rechargement à chaud dans Docker sous Windows/macOS
      watch: env.VITE_USE_POLLING === 'true' ? { usePolling: true, interval: 300 } : undefined,
      proxy: {
        '/api': { target, changeOrigin: true },
        '/storage': { target, changeOrigin: true },
      },
    },
  };
});
