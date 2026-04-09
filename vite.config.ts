import { defineConfig, type Plugin } from 'vite';
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

/** 프로젝트 루트 `movie/*.mp4` → dev에서 `/movie/파일명` 서빙, 빌드 시 `dist/movie`로 복사 */
function movieStaticPlugin(): Plugin {
  const root = process.cwd();
  const movieDir = path.join(root, 'movie');

  return {
    name: 'movie-static',
    configureServer(server) {
      server.middlewares.use('/movie', (req, res, next) => {
        const raw = (req.url ?? '/').replace(/^\//, '').split('?')[0];
        if (!raw || !raw.endsWith('.mp4')) {
          next();
          return;
        }
        const safe = path.basename(raw);
        const filepath = path.join(movieDir, safe);
        if (!filepath.startsWith(movieDir) || !fs.existsSync(filepath)) {
          next();
          return;
        }
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Accept-Ranges', 'bytes');
        const stream = fs.createReadStream(filepath);
        stream.on('error', () => next());
        stream.pipe(res);
      });
    },
    closeBundle() {
      if (!fs.existsSync(movieDir)) return;
      const outDir = path.join(root, 'dist', 'movie');
      fs.mkdirSync(outDir, { recursive: true });
      for (const f of fs.readdirSync(movieDir)) {
        if (f.endsWith('.mp4')) {
          fs.copyFileSync(path.join(movieDir, f), path.join(outDir, f));
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), leaderboardServePlugin(), movieStaticPlugin()],
  assetsInclude: ['**/*.fbx'],
  server: {
    host: true,
    port: 5173,
  },
});
