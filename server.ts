import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter, anomalyDetector } from './backend/api/router.js';
import { simulator } from './backend/simulator/DistributedSimulator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // Mount API router
  app.use('/api', apiRouter);

  // Background autonomous simulator & anomaly detection loop
  // Ticks every 1000ms
  setInterval(() => {
    try {
      const state = simulator.getState();
      if (state.running) {
        simulator.tick();
        anomalyDetector.check(simulator.getTopology());
      }
    } catch (err) {
      console.error('Error in simulation tick cycle:', err);
    }
  }, 1000);

  // Setup Vite in development or static serve in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, port: Number(PORT), host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const server = http.createServer(app);
  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`AEGIS-X Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start AEGIS-X server:', err);
  process.exit(1);
});
