import React, { useState } from 'react';
import { Play, Square, Brain, Timer, TrendingUp, TrendingDown } from 'lucide-react';

interface TradingHeaderProps {
  selectedIndex: string;
  onIndexChange: (index: string) => void;
  isTestMode: boolean;
  onTestModeChange: (testMode: boolean) => void;
  gptProvider: 'openai' | 'openrouter';
  onProviderChange: (provider: 'openai' | 'openrouter') => void;
  gptInterval: number;
  onIntervalChange: (interval: number) => void;
  isTrading: boolean;
  onStart: () => void;
  onStop: () => void;
  marketData: any;
  indices: any[];
}

export function TradingHeader({
  selectedIndex,
  onIndexChange,
  isTestMode,
  onTestModeChange,
  gptProvider,
  onProviderChange,
  gptInterval,
  onIntervalChange,
  isTrading,
  onStart,
  onStop,
  marketData,
  indices = []
}: TradingHeaderProps) {
  const [intervalInput, setIntervalInput] = useState(gptInterval.toString());

  const handleIntervalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newInterval = parseInt(intervalInput);
    if (newInterval >= 1 && newInterval <= 600) {
      onIntervalChange(newInterval);
    } else {
      setIntervalInput(gptInterval.toString());
    }
  };

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || (/^\d+$/.test(value) && parseInt(value) <= 600)) {
      setIntervalInput(value);
    }
  };

  // Get current index data
  const currentIndex = indices.find(idx => idx.symbol === selectedIndex) || marketData;

  return (
    <div className="bg-gray-800 border-b border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Brain className="h-8 w-8 text-blue-400" />
            <span className="text-xl font-bold text-white">FAi-3.0</span>
          </div>

          {/* Index Selection */}
          <select
            value={selectedIndex}
            onChange={(e) => onIndexChange(e.target.value)}
            disabled={isTrading}
            className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none disabled:opacity-50 min-w-[160px]"
          >
            {indices.length > 0 ? (
              indices.map((index) => (
                <option key={index.symbol} value={index.symbol}>
                  {index.name}
                </option>
              ))
            ) : (
              <>
                <option value="NIFTY">NIFTY 50</option>
                <option value="BANKNIFTY">BANK NIFTY</option>
                <option value="FINNIFTY">FIN NIFTY</option>
                <option value="MIDCPNIFTY">MIDCAP NIFTY</option>
              </>
            )}
          </select>

          {/* Live Market Data */}
          {currentIndex && (
            <div className="flex items-center space-x-4 px-4 py-2 bg-gray-700 rounded-lg border border-gray-600">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-300">LTP:</span>
                <span className="font-mono text-white text-lg font-semibold">
                  {currentIndex.ltp?.toFixed(2) || '0.00'}
                </span>
              </div>
              
              <div className={`flex items-center space-x-1 ${
                (currentIndex.change || 0) >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {(currentIndex.change || 0) >= 0 ? 
                  <TrendingUp className="h-4 w-4" /> : 
                  <TrendingDown className="h-4 w-4" />
                }
                <span className="text-sm font-medium">
                  {(currentIndex.change || 0) >= 0 ? '+' : ''}{(currentIndex.change || 0).toFixed(2)}
                </span>
                <span className="text-xs">
                  ({(currentIndex.changePercent || 0) >= 0 ? '+' : ''}{(currentIndex.changePercent || 0).toFixed(2)}%)
                </span>
              </div>

              {currentIndex.volume && (
                <div className="flex items-center space-x-1 text-gray-400">
                  <span className="text-xs">Vol:</span>
                  <span className="text-xs">{(currentIndex.volume / 1000000).toFixed(1)}M</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {/* GPT Timer - Show when trading */}
          {isTrading && (
            <div className="flex items-center space-x-2 px-3 py-2 bg-blue-600 rounded-lg animate-pulse">
              <Timer className="h-4 w-4" />
              <span className="text-sm font-medium">GPT: {gptInterval}s</span>
            </div>
          )}

          {/* GPT Interval Input */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-300">GPT Interval:</span>
            <form onSubmit={handleIntervalSubmit} className="flex items-center space-x-1">
              <input
                type="text"
                value={intervalInput}
                onChange={handleIntervalChange}
                onBlur={handleIntervalSubmit}
                className="bg-gray-700 text-white px-2 py-1 rounded border border-gray-600 focus:border-blue-400 focus:outline-none text-sm w-12 text-center"
                placeholder="8"
                disabled={isTrading}
              />
              <span className="text-xs text-gray-400">sec</span>
            </form>
            <span className="text-xs text-gray-500">(1-600)</span>
          </div>

          {/* Brain Provider Switch */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-300">Brain:</span>
            <div className="flex bg-gray-700 rounded-lg p-1 border border-gray-600">
              <button
                onClick={() => onProviderChange('openrouter')}
                disabled={isTrading}
                className={`px-3 py-1 rounded text-sm transition-colors disabled:opacity-50 ${
                  gptProvider === 'openrouter'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-300 hover:text-white hover:bg-gray-600'
                }`}
              >
                OpenRouter
              </button>
              <button
                onClick={() => onProviderChange('openai')}
                disabled={isTrading}
                className={`px-3 py-1 rounded text-sm transition-colors disabled:opacity-50 ${
                  gptProvider === 'openai'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-300 hover:text-white hover:bg-gray-600'
                }`}
              >
                OpenAI
              </button>
            </div>
          </div>

          {/* Test/Live Mode */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-300">Mode:</span>
            <div className="flex bg-gray-700 rounded-lg p-1 border border-gray-600">
              <button
                onClick={() => onTestModeChange(true)}
                disabled={isTrading}
                className={`px-3 py-1 rounded text-sm transition-colors disabled:opacity-50 ${
                  isTestMode
                    ? 'bg-yellow-600 text-white shadow-sm'
                    : 'text-gray-300 hover:text-white hover:bg-gray-600'
                }`}
              >
                TEST
              </button>
              <button
                onClick={() => onTestModeChange(false)}
                disabled={isTrading}
                className={`px-3 py-1 rounded text-sm transition-colors disabled:opacity-50 ${
                  !isTestMode
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-gray-300 hover:text-white hover:bg-gray-600'
                }`}
              >
                LIVE
              </button>
            </div>
          </div>

          {/* Start/Stop Button */}
          <button
            onClick={isTrading ? onStop : onStart}
            className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg ${
              isTrading
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/25'
                : 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/25'
            }`}
          >
            {isTrading ? (
              <>
                <Square className="h-4 w-4" />
                <span>STOP</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>START</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}