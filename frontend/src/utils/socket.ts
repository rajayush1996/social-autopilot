import { io, Socket } from 'socket.io-client';
import CONFIG from '@/config';
import accountEvents from './accountEvents';

declare global {
  interface Window {
    __app_socket_instance__?: Socket;
  }
}

/**
 * Returns a strict singleton Socket.io client instance across React renders and HMR.
 */
export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;

  if (!window.__app_socket_instance__) {
    let socketUrl = CONFIG.API_URL || 'http://localhost:5000';
    if (socketUrl.endsWith('/api')) {
      socketUrl = socketUrl.replace(/\/api$/, '');
    }
    if (!socketUrl || socketUrl === '/' || socketUrl.includes(':3000')) {
      socketUrl = 'http://localhost:5000';
    }

    console.log('⚡ [Socket.io Client] Connecting to Express Backend WebSocket server at:', socketUrl);

    const socketInstance = io(socketUrl, {
      transports: ['polling', 'websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      withCredentials: true,
    });

    socketInstance.on('connect', () => {
      console.log('⚡ [Socket.io Client] Connected cleanly with ID:', socketInstance.id);
    });

    socketInstance.on('account_status_changed', (data: { platform: string; action: 'CONNECTED' | 'DISCONNECTED' }) => {
      console.log('⚡ [Socket.io Client] Realtime account_status_changed event received:', data);
      accountEvents.notifyAccountChange(data.action, data.platform);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('⚡ [Socket.io Client] Connection notice:', err.message);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('⚡ [Socket.io Client] Disconnected:', reason);
    });

    window.__app_socket_instance__ = socketInstance;
  }

  return window.__app_socket_instance__;
}

export default getSocket;
