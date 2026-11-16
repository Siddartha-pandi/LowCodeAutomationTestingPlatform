import { WsAdapter } from '@nestjs/platform-ws';
import * as http from 'http';

export class AppWsAdapter extends WsAdapter {
  ensureHttpServerExists(port: number, httpServer = http.createServer()): http.Server {
    if (this.httpServersRegistry.has(port)) {
      return this.httpServersRegistry.get(port);
    }
    this.httpServersRegistry.set(port, httpServer);

    httpServer.on('upgrade', (request: any, socket: any, head: any) => {
      try {
        const host = request.headers.host || 'localhost';
        const baseUrl = 'ws://' + host + '/';
        const pathname = new URL(request.url, baseUrl).pathname;
        const wsServersCollection = this.wsServersRegistry.get(port) || [];
        let isRequestDelegated = false;

        for (const wsServer of wsServersCollection) {
          // Exact match or prefix match (e.g. /ws/executions/:id matching /ws/executions)
          if (
            !wsServer.path ||
            pathname === wsServer.path ||
            pathname.startsWith(wsServer.path + '/')
          ) {
            wsServer.handleUpgrade(request, socket, head, (ws: any) => {
              wsServer.emit('connection', ws, request);
            });
            isRequestDelegated = true;
            break;
          }
        }

        if (!isRequestDelegated) {
          socket.destroy();
        }
      } catch (err: any) {
        socket.end('HTTP/1.1 400\r\n' + err.message);
      }
    });

    return httpServer;
  }
}
