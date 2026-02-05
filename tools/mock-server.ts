
import { WebSocketServer, WebSocket } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

const scenes = [
  'WELCOME',
  'QR',
  'SELECT_MINIGAME',
  'GAME01',
  'PICK_GIFT',
  'LASER_STYLE',
  'LASER_PROCESS'
];

let currentSceneIndex = 0;

console.log('Mock WS Server V2 started on ws://127.0.0.1:8080');

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected to exhibition system');

  // Helper to send standardized commands
  const sendCommand = (name: string, data: any) => {
    ws.send(JSON.stringify({
      header: {
        id: Math.random().toString(36).substring(7),
        name: name,
        sender: 'BACKEND',
        timestamp: Date.now()
      },
      data: data
    }));
  };

  // Simulate Scene Rotation every 8 seconds
  const interval = setInterval(() => {
    const scene = scenes[currentSceneIndex];
    sendCommand('SET_SCENE', {
      scene: scene,
      text: `Mock Backend: Welcome to ${scene}`
    });

    if (scene === 'PICK_GIFT' || scene === 'LASER_PROCESS') {
      let subProgress = 0;
      const progressInterval = setInterval(() => {
        subProgress += 0.05;
        sendCommand('PROGRESS_UPDATE', {
          value: Math.min(subProgress, 1.0),
          label: scene === 'PICK_GIFT' ? 'Retrieving Gift...' : 'Laser Engraving...'
        });
        if (subProgress >= 1.0) clearInterval(progressInterval);
      }, 200);
    }

    currentSceneIndex = (currentSceneIndex + 1) % scenes.length;
  }, 8000);

  // Simulate Camera Stream when in QR scene (Sends a 1x1 black pixel or static image placeholder)
  const cameraInterval = setInterval(() => {
    const currentScene = scenes[currentSceneIndex];
    if (currentScene === 'QR') {
      // Sending a very small static red/blue alternating pixel as base64 to simulate a feed
      const color = Date.now() % 1000 > 500 ? 'red' : 'blue';
      const dummyFrame = color === 'red' 
        ? 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' 
        : 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      
      sendCommand('CAMERA_FRAME', {
        image: dummyFrame,
        format: 'png',
        width: 1280,
        height: 720
      });
    }
  }, 100); // 10 FPS mock stream

  ws.on('message', (data: string) => {
    try {
      const msg = JSON.parse(data);
      console.log(`[Frontend Event] ${msg.header.name}:`, msg.data);
    } catch (e) {
      console.error('Invalid message received from frontend');
    }
  });

  ws.on('close', () => {
    clearInterval(interval);
    clearInterval(cameraInterval);
  });
});
