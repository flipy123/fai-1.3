import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Volume2 } from 'lucide-react';

interface OptionChainCardProps {
  optionChain: Array<{
    strike: number;
    ce: {
      ltp: number;
      bid: number;
      ask: number;
      volume: number;
      oi: number;
    };
    pe: {
      ltp: number;
      bid: number;
      ask: number;
      volume: number;
      oi: number;
    };
  }>;
  selectedIndex: string;
}

export function OptionChainCard({ optionChain, selectedIndex }: OptionChainCardProps) {
  const [sortBy, setSortBy] = useState<'strike' | 'ce_volume' | 'pe_volume' | 'ce_oi' | 'pe_oi'>('strike');
  const [filterRange, setFilterRange] = useState(10);

  // Sort option chain based on selected criteria
  const sortedOptionChain = React.useMemo(() => {
    if (!optionChain || optionChain.length === 0) return [];

    let sorted = [...optionChain];
    
    switch (sortBy) {
      case 'ce_volume':
        sorted.sort((a, b) => b.ce.volume - a.ce.volume);
        break;
      case 'pe_volume':
        sorted.sort((a, b) => b.pe.volume - a.pe.volume);
        break;
      case 'ce_oi':
        sorted.sort((a, b) => b.ce.oi - a.ce.oi);
        break;
      case 'pe_oi':
        sorted.sort((a, b) => b.pe.oi - a.pe.oi);
        break;
      default:
        sorted.sort((a, b) => a.strike - b.strike);
    }

    return sorted.slice(0, filterRange);
  }, [optionChain, sortBy, filterRange]);

  const getVolumeColor = (volume: number, maxVolume: number) => {
    const intensity = volume / maxVolume;
    if (intensity > 0.7) return 'text-green-400';
    if (intensity > 0.4) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const maxCEVolume = Math.max(...(optionChain?.map(s => s.ce.volume) || [0]));
  const maxPEVolume = Math.max(...(optionChain?.map(s => s.pe.volume) || [0]));

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          {selectedIndex} Option Chain
        </h3>
        
        <div className="flex items-center space-x-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-gray-700 text-white px-2 py-1 rounded text-xs border border-gray-600"
          >
            <option value="strike">Strike</option>
            <option value="ce_volume">CE Volume</option>
            <option value="pe_volume">PE Volume</option>
            <option value="ce_oi">CE OI</option>
            <option value="pe_oi">PE OI</option>
          </select>
          
          <select
            value={filterRange}
            onChange={(e) => setFilterRange(parseInt(e.target.value))}
            className="bg-gray-700 text-white px-2 py-1 rounded text-xs border border-gray-600"
          >
            <option value={5}>Top 5</option>
            <option value={10}>Top 10</option>
            <option value={15}>Top 15</option>
            <option value={20}>Top 20</option>
          </select>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        {sortedOptionChain && sortedOptionChain.length > 0 ? (
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-11 gap-1 text-xs font-medium text-gray-400 pb-2 border-b border-gray-700">
              <div className="text-center">CE OI</div>
              <div className="text-center">CE Vol</div>
              <div className="text-center">CE LTP</div>
              <div className="text-center">CE Bid</div>
              <div className="text-center">CE Ask</div>
              <div className="text-center font-bold text-white">Strike</div>
              <div className="text-center">PE Bid</div>
              <div className="text-center">PE Ask</div>
              <div className="text-center">PE LTP</div>
              <div className="text-center">PE Vol</div>
              <div className="text-center">PE OI</div>
            </div>

            {/* Data Rows */}
            {sortedOptionChain.map((strike, index) => (
              <div key={index} className="grid grid-cols-11 gap-1 text-xs hover:bg-gray-700/30 py-1 rounded">
                {/* CE Side */}
                <div className="text-center text-blue-300 font-mono">
                  {strike.ce.oi.toLocaleString()}
                </div>
                <div className={`text-center font-mono ${getVolumeColor(strike.ce.volume, maxCEVolume)}`}>
                  {strike.ce.volume.toLocaleString()}
                </div>
                <div className="text-center text-green-400 font-mono font-semibold">
                  {strike.ce.ltp.toFixed(2)}
                </div>
                <div className="text-center text-gray-300 font-mono">
                  {strike.ce.bid.toFixed(2)}
                </div>
                <div className="text-center text-gray-300 font-mono">
                  {strike.ce.ask.toFixed(2)}
                </div>

                {/* Strike */}
                <div className="text-center font-bold text-white bg-gray-700 rounded px-1">
                  {strike.strike}
                </div>

                {/* PE Side */}
                <div className="text-center text-gray-300 font-mono">
                  {strike.pe.bid.toFixed(2)}
                </div>
                <div className="text-center text-gray-300 font-mono">
                  {strike.pe.ask.toFixed(2)}
                </div>
                <div className="text-center text-red-400 font-mono font-semibold">
                  {strike.pe.ltp.toFixed(2)}
                </div>
                <div className={`text-center font-mono ${getVolumeColor(strike.pe.volume, maxPEVolume)}`}>
                  {strike.pe.volume.toLocaleString()}
                </div>
                <div className="text-center text-blue-300 font-mono">
                  {strike.pe.oi.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="flex flex-col items-center space-y-2">
              <Volume2 className="h-8 w-8 text-gray-600" />
              <p className="text-gray-400">Loading {selectedIndex} option chain...</p>
              <p className="text-xs text-gray-500">Fetching live option data from Kotak Neo</p>
            </div>
          </div>
        )}
      </div>

      {/* Option Chain Summary */}
      {sortedOptionChain && sortedOptionChain.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Total CE Volume:</span>
                <span className="text-green-400 font-mono">
                  {sortedOptionChain.reduce((sum, s) => sum + s.ce.volume, 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total CE OI:</span>
                <span className="text-blue-300 font-mono">
                  {sortedOptionChain.reduce((sum, s) => sum + s.ce.oi, 0).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Total PE Volume:</span>
                <span className="text-red-400 font-mono">
                  {sortedOptionChain.reduce((sum, s) => sum + s.pe.volume, 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total PE OI:</span>
                <span className="text-blue-300 font-mono">
                  {sortedOptionChain.reduce((sum, s) => sum + s.pe.oi, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}