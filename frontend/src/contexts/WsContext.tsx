import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface WsEvent { type: string; data: unknown; timestamp: string; }
interface WsContextValue {
  isConnected: boolean;
  lastEvent: WsEvent | null;
  anomalyCount: number;
}

const WsContext = createContext<WsContextValue>({ isConnected: false, lastEvent: null, anomalyCount: 0 });

export function WsProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WsEvent | null>(null);
  const [anomalyCount, setAnomalyCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${window.location.host}`);
    wsRef.current = ws;

    ws.onopen  = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      retryRef.current = setTimeout(connect, 3000);
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as WsEvent;
        setLastEvent(msg);
        if (msg.type === 'ANOMALY_DETECTED') setAnomalyCount(c => c + 1);
      } catch (_) {}
    };
  }

  useEffect(() => {
    connect();
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, []);

  return <WsContext.Provider value={{ isConnected, lastEvent, anomalyCount }}>{children}</WsContext.Provider>;
}

export const useWs = () => useContext(WsContext);
