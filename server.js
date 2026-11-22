import express from 'express';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BLOCKED_PATHS = new Set([
  '/server.js',
  '/server.test.mjs',
  '/package.json',
  '/package-lock.json',
  '/metadata.json',
]);

const BLOCKED_PREFIXES = ['/node_modules/', '/tools/', '/.git/', '/.github/'];

export function isBlockedPath(reqPath) {
  const normalized = path.posix.normalize(reqPath);
  if (BLOCKED_PATHS.has(normalized)) return true;
  if (normalized.startsWith('/.')) return true;
  return BLOCKED_PREFIXES.some(
    (prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix)
  );
}

export function createApp() {
  const app = express();

  app.use((req, res, next) => {
    if (isBlockedPath(req.path)) {
      res.status(404).type('text/plain').send('Not Found');
      return;
    }
    next();
  });

  app.use(
    express.static(__dirname, {
      dotfiles: 'ignore',
      index: 'index.html',
    })
  );

  return app;
}

const isMainModule =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = '0.0.0.0';
  const app = createApp();

  app.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
  });
}
