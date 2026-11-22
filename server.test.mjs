import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp, isBlockedPath } from './server.js';

function request(server, reqPath) {
  return new Promise((resolve, reject) => {
    const { port } = server.address();
    http
      .get({ hostname: '127.0.0.1', port, path: reqPath }, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      })
      .on('error', reject);
  });
}

test('isBlockedPath blocks internal files and permits public site assets', () => {
  assert.equal(isBlockedPath('/server.js'), true);
  assert.equal(isBlockedPath('/package.json'), true);
  assert.equal(isBlockedPath('/tools/check_site.py'), true);
  assert.equal(isBlockedPath('/.github/workflows/pr-checks.yml'), true);
  assert.equal(isBlockedPath('/'), false);
  assert.equal(isBlockedPath('/index.html'), false);
  assert.equal(isBlockedPath('/assets/abertura-capa.webp'), false);
  assert.equal(isBlockedPath('/robots.txt'), false);
});

test('Express static server serves index.html and public assets, blocks internal files', async () => {
  const app = createApp();
  const server = await new Promise((resolve) => {
    const srv = app.listen(0, '127.0.0.1', () => resolve(srv));
  });

  try {
    const home = await request(server, '/');
    assert.equal(home.statusCode, 200);
    assert.match(home.body, /<title>Biografia Musical — SrChZ<\/title>/);

    const cover = await request(server, '/assets/abertura-capa.webp');
    assert.equal(cover.statusCode, 200);

    const robots = await request(server, '/robots.txt');
    assert.equal(robots.statusCode, 200);

    const blockedServer = await request(server, '/server.js');
    assert.equal(blockedServer.statusCode, 404);

    const blockedPkg = await request(server, '/package.json');
    assert.equal(blockedPkg.statusCode, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
