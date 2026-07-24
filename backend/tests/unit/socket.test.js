import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { io as Client } from 'socket.io-client';
import socketManager, { SOCKET_EVENTS } from '../../src/services/socketService.js';

test('SocketServerManager - Client connection & account_status_changed event emission', (t, done) => {
  const server = http.createServer();
  socketManager.init(server);

  server.listen(0, () => {
    const port = server.address().port;
    const clientSocket = Client(`http://localhost:${port}`, {
      transports: ['websocket', 'polling'],
    });

    clientSocket.on('connect', () => {
      assert.ok(clientSocket.id, 'Socket client should have a valid socket ID on connection');

      // Trigger socket event emission from service
      socketManager.emitAccountStatusChange({ userId: 'test-user-123', platform: 'LINKEDIN', action: 'CONNECTED' });
    });

    clientSocket.on(SOCKET_EVENTS.ACCOUNT_STATUS_CHANGED, (data) => {
      assert.equal(data.platform, 'LINKEDIN');
      assert.equal(data.action, 'CONNECTED');
      assert.ok(data.timestamp, 'Timestamp should be present');

      clientSocket.close();
      server.close();
      done();
    });
  });
});

test('SocketServerManager - check_platform_connection roundtrip verification', (t, done) => {
  const server = http.createServer();
  socketManager.init(server);

  server.listen(0, () => {
    const port = server.address().port;
    const clientSocket = Client(`http://localhost:${port}`, {
      transports: ['websocket', 'polling'],
    });

    clientSocket.on('connect', () => {
      // Emit check_platform_connection request
      clientSocket.emit(SOCKET_EVENTS.CHECK_PLATFORM_CONNECTION, { platform: 'LINKEDIN', userId: 'non-existent-user' });
    });

    clientSocket.on(SOCKET_EVENTS.PLATFORM_CONNECTION_STATUS, (data) => {
      assert.equal(data.platform, 'LINKEDIN');
      assert.equal(typeof data.isConnected, 'boolean');
      assert.ok(data.timestamp, 'Timestamp should be present');

      clientSocket.close();
      server.close();
      done();
    });
  });
});
