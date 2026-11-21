import http from 'node:http';
import net from 'node:net';
import { readFileSync, unlinkSync } from 'node:fs';

const faultFile = new URL('./fault', import.meta.url);
const target = { hostname: '127.0.0.1', port: 3688 };
const server = http.createServer((request, response) => {
  let fault;
  if (request.method === 'POST' && request.url === '/api/quotations/update') {
    try {
      fault = readFileSync(faultFile, 'utf8').trim();
      unlinkSync(faultFile);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  if (fault === '500') {
    request.resume();
    response.writeHead(500, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ success: false, error: 'Fixture HTTP error' }));
    console.log('Injected HTTP 500 before forwarding refresh');
    return;
  }
  const upstream = http.request({ ...target, path: request.url, method: request.method, headers: request.headers }, result => {
    if (request.method === 'POST' && request.url === '/api/quotations/update') console.log('Real refresh response', result.statusCode);
    if (fault === 'drop') {
      result.resume();
      result.once('end', () => {
        console.log('Truncated downstream body after complete real response', result.statusCode);
        response.writeHead(result.statusCode, { 'Content-Type': 'application/json', 'Content-Length': 1000 });
        response.write('{');
        setTimeout(() => response.destroy(), 150);
      });
      return;
    }
    response.writeHead(result.statusCode, result.headers);
    result.pipe(response);
  });
  upstream.on('error', () => response.destroy());
  request.pipe(upstream);
});
server.on('upgrade', (request, socket, head) => {
  const upstream = net.connect(target.port, target.hostname, () => {
    const headers = request.rawHeaders.reduce((lines, value, index, all) =>
      index % 2 ? lines : [...lines, value + ': ' + all[index + 1]], []);
    upstream.write([request.method + ' ' + request.url + ' HTTP/' + request.httpVersion, ...headers, '', ''].join('\r\n'));
    upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
});
server.listen(3678, '127.0.0.1');
