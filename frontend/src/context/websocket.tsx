import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { userCallStore } from '../store/callStore';
import { useUserStore } from '../store/userStore';


type Callback = (data: any) => void;

interface WebSocketContextType {
  ws: WebSocket | null;
  subscribe: (type: string, callback: Callback) => void;
  unsubscribe: (type: string, callback: Callback) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider = ({
  userId,
  children,
}: {
  userId: number;
  children: React.ReactNode;
}) => {
  const listeners = useRef<Map<string, Set<Callback>>>(new Map());
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const url = import.meta.env.VITE_API_PREFIX.replace('http://', 'ws://').replace('https://', 'wss://');
    const socket = new WebSocket(`${url}/ws/${userId}`);

    // global access
    window.ws = socket;

    socket.onmessage = (event) => {
      try {
        const [type, payload] = JSON.parse(event.data);
        const callbacks = listeners.current.get(type);
        if (callbacks) {
          callbacks.forEach((cb) => cb(payload));
        }

        if (type === 'incoming_call') {
          const { user } = useUserStore.getState();
          if (user?.id !== payload.from) {
            userCallStore.getState().receiveCall(payload.from, payload.room);
          }

        }

        if (type === 'call_accepted') {
            userCallStore.getState().startCall(payload.from, payload.room);
        }

        if (type === 'call_rejected') {
          console.log('تماس رد شد');
          userCallStore.getState().cancelCall();
        }
      } catch (err) {
        console.error('Invalid message', err);
      }
    };

    socket.onclose = () => console.log('WebSocket closed');
    socket.onerror = (err) => console.error('WebSocket error', err);
    setWs(socket);

    return () => {
      socket.close();
      setWs(null);
    };
  }, [userId]);

  const subscribe = (type: string, callback: Callback) => {
    if (!listeners.current.has(type)) {
      listeners.current.set(type, new Set());
    }
    listeners.current.get(type)!.add(callback);
  };

  const unsubscribe = (type: string, callback: Callback) => {
    listeners.current.get(type)?.delete(callback);
  };

  return (
    <WebSocketContext.Provider value={{ subscribe, unsubscribe, ws }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error('useWebSocket must be used within a WebSocketProvider');
  return context;
};
