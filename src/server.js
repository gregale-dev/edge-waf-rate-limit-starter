import { createServer } from './app.js';

const server = createServer({
  demoUser: process.env.DEMO_USER || 'alice',
  demoPass: process.env.DEMO_PASS || 'demo-pass-change-me',
});

const port = Number.parseInt(process.env.PORT || '8080', 10);
server.listen(port, '0.0.0.0', () => {
  console.log(`edge-waf-rate-limit-starter listening on :${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
