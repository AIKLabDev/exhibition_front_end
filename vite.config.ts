import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const LEADERBOARD_DIR = 'C:/Log/exhibition/Visitor';

// C:/Log/exhibition/Visitor/ 경로의 leaderboard JSON 파일을
// /leaderboard/<filename> URL로 제공하는 Vite 플러그인
function leaderboardServePlugin() {
  function addMiddleware(server: { middlewares: { use: (path: string, handler: (req: any, res: any, next: () => void) => void) => void } }) {
    server.middlewares.use('/leaderboard', (req: any, res: any, next: () => void) => {
      const filename = (req.url ?? '/').replace(/^\//, '');
      if (!filename.endsWith('.json')) {
        next();
        return;
      }
      const filepath = path.join(LEADERBOARD_DIR, filename);
      try {
        const data = fs.readFileSync(filepath, 'utf-8');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(data);
      } catch {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Not found', path: filepath }));
      }
    });
  }

  return {
    name: 'leaderboard-serve',
    configureServer: addMiddleware,
    configurePreviewServer: addMiddleware,
  };
}

export default defineConfig({
  plugins: [react(), leaderboardServePlugin()],
  assetsInclude: ['**/*.fbx'],
  server: {
    host: true,
    port: 5173,
  },
});
