import dgram from 'dgram';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    humantrackUdpPlugin(),
  ],
  server: {
    host: true,
    port: 5173,
  },
});

/**
 * HumanTrack UDP 플러그인 (온디맨드)
 * - Game02 마운트 시 POST /api/humantrack/start → UDP 서버 시작
 * - Game02 언마운트 시 POST /api/humantrack/stop → UDP 서버 종료
 * - HumanTrack_v1.0.py는 별도 실행 (이 플러그인에서 spawn 하지 않음)
 */
function humantrackUdpPlugin() {
  let udpServer: dgram.Socket | null = null;
  let latestPose: unknown = null;
  let latestPoseAtMs = 0;
  let sendPoseToClients: ((pose: unknown) => void) | null = null;

  const startUdpServer = () => {
    if (udpServer) return;
    const udpPort = parseInt(process.env.HUMANTRACK_UDP_PORT || '12345', 10);
    const udpHost = process.env.HUMANTRACK_UDP_HOST || '127.0.0.1';

    udpServer = dgram.createSocket('udp4');
    udpServer.on('message', (msg) => {
      try {
        const jsonText = msg.toString('utf-8');
        const pose = JSON.parse(jsonText);
        latestPose = pose;
        latestPoseAtMs = Date.now();
        sendPoseToClients?.(pose);
      } catch (err) {
        console.warn('[HumanTrack] Failed to parse UDP message:', err);
      }
    });
    udpServer.on('error', (err) => {
      console.warn('[HumanTrack] UDP server error:', err);
      udpServer = null;
    });
    udpServer.bind(udpPort, udpHost, () => {
      console.log(`[HumanTrack] UDP server listening on ${udpHost}:${udpPort}`);
    });
  };

  const stopUdpServer = () => {
    if (udpServer) {
      try {
        udpServer.close();
        console.log('[HumanTrack] UDP server closed');
      } catch {
        // ignore
      }
      udpServer = null;
    }
    latestPose = null;
    latestPoseAtMs = 0;
    sendPoseToClients?.(null);
  };

  return {
    name: 'humantrack-udp-on-demand',
    configureServer(server) {
      sendPoseToClients = (pose) => {
        try {
          if (server.ws.clients.size === 0) return;
          server.ws.send({ type: 'custom', event: 'humantrack:pose', data: pose });
        } catch (err) {
          console.warn('[HumanTrack] Failed to send pose via WebSocket:', err);
        }
      };

      server.middlewares.use((req: { url?: string; method?: string }, res: { statusCode: number; setHeader: (k: string, v: string) => void; end: (s: string) => void }, next: () => void) => {
        const url = req.url?.split('?')[0] ?? '';

        if (url === '/api/humantrack/start' && req.method === 'POST') {
          startUdpServer();
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ ok: true }));
          return;
        }
        if (url === '/api/humantrack/stop' && req.method === 'POST') {
          stopUdpServer();
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ ok: true }));
          return;
        }
        if (url === '/api/humantrack/pose') {
          const age = latestPoseAtMs > 0 ? Date.now() - latestPoseAtMs : Infinity;
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify({ ok: true, atMs: latestPoseAtMs, pose: latestPose, age }));
          return;
        }
        next();
      });

      server.httpServer?.once('close', () => {
        stopUdpServer();
      });
    },
  };
}
