import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Dashboard } from './components/Dashboard';
import { TradingHeader } from './components/TradingHeader';
import { ChatSidebar } from './components/ChatSidebar';
import { useMarketData } from './hooks/useMarketData';
import { useTradingState } from './hooks/useTradingState';

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [selectedIndex, setSelectedIndex] = useState('NIFTY');
  const [isTestMode, setIsTestMode] = useState(true);
  const [gptProvider, setGptProvider] = useState<'openai' | 'openrouter'>('openrouter');
  const [gptInterval, setGptInterval] = useState(8);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [indices, setIndices] = useState<any[]>([]);

  const { marketData, positions, orders, wallet, optionChain } = useMarketData(socket);
  const { isTrading, startTrading, stopTrading, gptDecision, tradeLogs } = useTradingState(socket);

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    // Fetch indices on startup
    fetchIndices();

    return () => {
      newSocket.close();
    };
  }, []);

  const fetchIndices = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/kotak/indices');
      const data = await response.json();
      setIndices(data);
    } catch (error) {
      console.error('Failed to fetch indices:', error);
      // Fallback to default indices
      setIndices([
        { symbol: 'NIFTY', name: 'NIFTY 50', ltp: 0, change: 0 },
        { symbol: 'BANKNIFTY', name: 'BANK NIFTY', ltp: 0, change: 0 },
        { symbol: 'FINNIFTY', name: 'FIN NIFTY', ltp: 0, change: 0 },
        { symbol: 'MIDCPNIFTY', name: 'MIDCAP NIFTY', ltp: 0, change: 0 }
      ]);
    }
  };

  const handleStart = () => {
    if (socket) {
      startTrading();
      socket.emit('start-trading', {
        symbol: selectedIndex,
        testMode: isTestMode,
        gptProvider
      });
    }
  };

  const handleStop = () => {
    if (socket) {
      stopTrading();
      socket.emit('stop-trading');
    }
  };

  const handleIntervalChange = (interval: number) => {
    setGptInterval(interval);
    if (socket) {
      socket.emit('set-gpt-interval', interval * 1000);
    }
  };

  const handleProviderSwitch = (provider: 'openai' | 'openrouter') => {
    setGptProvider(provider);
    if (socket) {
      socket.emit('switch-provider', provider);
    }
  };

  const handleIndexChange = (index: string) => {
    setSelectedIndex(index);
    // If trading is active, restart with new index
    if (isTrading && socket) {
      socket.emit('stop-trading');
      setTimeout(() => {
        socket.emit('start-trading', {
          symbol: index,
          testMode: isTestMode,
          gptProvider
        });
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <TradingHeader
        selectedIndex={selectedIndex}
        onIndexChange={handleIndexChange}
        isTestMode={isTestMode}
        onTestModeChange={setIsTestMode}
        gptProvider={gptProvider}
        onProviderChange={handleProviderSwitch}
        gptInterval={gptInterval}
        onIntervalChange={handleIntervalChange}
        isTrading={isTrading}
        onStart={handleStart}
        onStop={handleStop}
        marketData={marketData}
        indices={indices}
      />
      
      <div className="flex h-[calc(100vh-80px)]">
        <div className={`flex-1 transition-all duration-300 ${isChatOpen ? 'mr-96' : ''}`}>
          <Dashboard
            marketData={marketData}
            positions={positions}
            orders={orders}
            wallet={wallet}
            optionChain={optionChain}
            gptDecision={gptDecision}
            tradeLogs={tradeLogs}
            isTrading={isTrading}
            selectedIndex={selectedIndex}
          />
        </div>
        
        <ChatSidebar
          isOpen={isChatOpen}
          onToggle={() => setIsChatOpen(!isChatOpen)}
          selectedIndex={selectedIndex}
          gptProvider={gptProvider}
          marketData={marketData}
        />
      </div>
    </div>
  );
}

export default App;