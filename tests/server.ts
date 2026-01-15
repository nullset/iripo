// Simple test server for serving iripo tests
const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // Serve the built iripo library
    if (url.pathname === '/iripo.js') {
      const file = Bun.file('./dist/index.js');
      return new Response(file, {
        headers: { 'Content-Type': 'application/javascript' },
      });
    }

    // Serve test HTML page
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const file = Bun.file('./tests/index.html');
      return new Response(file, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
});

console.log(`Test server running at http://localhost:${server.port}`);
