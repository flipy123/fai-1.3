import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

export function useMarketData(socket: Socket | null) {
  const [marketData, setMarketData] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [optionChain, setOptionChain] = useState<any[]>([]);

  useEffect(() => {
    if (!socket) return;

    const handleMarketData = (data: any) => {
      setMarketData(data.marketData);
      setPositions(data.positions || []);
      setOrders(data.orders || []);
      setWallet(data.wallet);
      setOptionChain(data.optionChain || []);
    };

    socket.on('market-data', handleMarketData);

    return () => {
      socket.off('market-data', handleMarketData);
    };
  }, [socket]);

  return {
    marketData,
    positions,
    orders,
    wallet,
    optionChain
  };
}