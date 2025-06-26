import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PositionsCardProps {
  positions: Array<{
    id: string;
    symbol: string;
    quantity: number;
    avgPrice: number;
    ltp: number;
    pnl: number;
    pnlPercent: number;
  }>;
}

export function PositionsCard({ positions }: PositionsCardProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">Open Positions</h3>
      
      {positions && positions.length > 0 ? (
        <div className="space-y-3">
          {positions.map((position) => (
            <div key={position.id} className="bg-gray-700 rounded-lg p-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-medium text-white text-sm">{position.symbol}</h4>
                  <p className="text-xs text-gray-400">
                    Qty: {position.quantity} | Avg: ₹{position.avgPrice}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-white">₹{position.ltp}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className={`flex items-center space-x-1 ${position.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {position.pnl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span className="text-sm font-medium">₹{position.pnl.toFixed(2)}</span>
                </div>
                <span className={`text-xs ${position.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-400">No open positions</p>
        </div>
      )}
    </div>
  );
}