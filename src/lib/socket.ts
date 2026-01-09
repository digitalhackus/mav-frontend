import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export const connectSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Socket.IO connected:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });
  }

  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const onJobUpdated = (callback: (data: { type: string; job?: any; jobId?: string }) => void) => {
  const socketInstance = socket || connectSocket();
  socketInstance.on('jobUpdated', callback);
  
  return () => {
    socketInstance.off('jobUpdated', callback);
  };
};

export const onCommentAdded = (callback: (comment: any) => void) => {
  const socketInstance = socket || connectSocket();
  socketInstance.on('commentAdded', callback);
  
  return () => {
    socketInstance.off('commentAdded', callback);
  };
};

export const onInvoiceUpdated = (callback: (data: { type: string; invoice?: any; invoiceId?: string }) => void) => {
  const socketInstance = socket || connectSocket();
  socketInstance.on('invoiceUpdated', callback);
  
  return () => {
    socketInstance.off('invoiceUpdated', callback);
  };
};

