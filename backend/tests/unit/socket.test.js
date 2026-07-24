import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { io as Client } from 'socket.io-client';
import { initSocket, emitAccountStatusChange } from '../../src/services/socketService.js';

test('SocketService - Client connection & account_status_changed event emission', (t, done) => {
  const server = http.createServer();
  initSocket(server);

  server.listen(0, () => {
    const port = server.address().port;
    const clientSocket = Client(`http://localhost:${port}`, {
      transports: ['websocket', 'polling'],
    });

    clientSocket.on('connect', () => {
      assert.ok(clientSocket.id, 'Socket client should have a valid socket ID on connection');

      // Trigger socket event emission from service
      emitAccountStatusChange({ userId: 'test-user-123', platform: 'LINKEDIN', action: 'CONNECTED' });
    });

    clientSocket.on('account_status_changed', (data) => {
      assert.equal(data.platform, 'LINKEDIN');
      assert.equal(data.action, 'CONNECTED');
      assert.ok(data.timestamp, 'Timestamp should be present');

      clientSocket.close();
      server.close();
      done();
    });
  });
});
