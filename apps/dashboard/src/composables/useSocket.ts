import { ref, onMounted, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';

const WS_EVENTS = {
  SMS_RECEIVED: 'sms:received',
  DEVICE_STATUS: 'device:status',
  STATS_UPDATE: 'stats:update',
} as const;

export function useSocket() {
  const connected = ref(false);
  let socket: Socket | null = null;

  function connect() {
    socket = io('/events', {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      connected.value = true;
    });

    socket.on('disconnect', () => {
      connected.value = false;
    });
  }

  function onSmsReceived(handler: (data: unknown) => void) {
    socket?.on(WS_EVENTS.SMS_RECEIVED, handler);
  }

  function onDeviceStatus(handler: (data: unknown) => void) {
    socket?.on(WS_EVENTS.DEVICE_STATUS, handler);
  }

  function onStatsUpdate(handler: (data: unknown) => void) {
    socket?.on(WS_EVENTS.STATS_UPDATE, handler);
  }

  function disconnect() {
    socket?.disconnect();
    socket = null;
    connected.value = false;
  }

  onMounted(connect);
  onUnmounted(disconnect);

  return { connected, onSmsReceived, onDeviceStatus, onStatsUpdate };
}
