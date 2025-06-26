import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

export function useTradingState(socket: Socket | null) {
  const [isTrading, setIsTrading] = useState(false);
  const [gptDecision, setGptDecision] = useState<any>(null);
  const [tradeLogs, setTradeLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!socket) return;

    const handleTradingStarted = () => {
      setIsTrading(true);
    };

    const handleTradingStopped = () => {
      setIsTrading(false);
    };

    const handleGptDecision = (data: any) => {
      setGptDecision(data);
    };

    const handleTradeLog = (log: any) => {
      setTradeLogs(prev => [...prev, log].slice(-100)); // Keep last 100 logs
    };

    const handleError = (error: any) => {
      setTradeLogs(prev => [...prev, {
        type: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      }].slice(-100));
    };

    socket.on('trading-started', handleTradingStarted);
    socket.on('trading-stopped', handleTradingStopped);
    socket.on('gpt-decision', handleGptDecision);
    socket.on('trade-log', handleTradeLog);
    socket.on('error', handleError);

    return () => {
      socket.off('trading-started', handleTradingStarted);
      socket.off('trading-stopped', handleTradingStopped);
      socket.off('gpt-decision', handleGptDecision);
      socket.off('trade-log', handleTradeLog);
      socket.off('error', handleError);
    };
  }, [socket]);

  const startTrading = () => {
    setTradeLogs([]);
    setGptDecision(null);
  };

  const stopTrading = () => {
    // Keep logs and decision for review
  };

  return {
    isTrading,
    gptDecision,
    tradeLogs,
    startTrading,
    stopTrading
  };
}