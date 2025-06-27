import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Target, Shield } from 'lucide-react';

interface TradeStatsCardProps {
  selectedIndex: string;
}

interface TradeStats {
  totalTrades: number;
  completedTrades: number;
  totalPnL: number;
  winRate: number;
  avgPnL: number;
  maxProfit: number;
  maxLoss: number;
  profitFactor: number;
  winningTrades: number;
  losingTrades: number;
}

export function TradeStatsCard({ selectedIndex }: TradeStatsCardProps) {
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTradeStats();
    
    // Refresh stats every 10 seconds
    const interval = setInterval(fetchTradeStats, 10000);
    return () => clearInterval(interval);
  }, [selectedIndex]);

  const fetchTradeStats = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/kotak/trading/stats/${selectedIndex}`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching trade stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 animate-pulse">
        <div className="h-4 bg-gray-700 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-3 bg-gray-700 rounded"></div>
          <div className="h-3 bg-gray-700 rounded"></div>
          <div className="h-3 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-blue-400" />
          <span>{selectedIndex} Trade Stats</span>
        </h3>
        <div className="text-xs text-gray-400">Today</div>
      </div>

      {stats && stats.totalTrades > 0 ? (
        <div className="space-y-4">
          {/* Overall Performance */}
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ₹{stats.totalPnL.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400">Total P&L</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${stats.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.winRate}%
                </div>
                <div className="text-xs text-gray-400">Win Rate</div>
              </div>
            </div>
          </div>

          {/* Trade Breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-white">{stats.totalTrades}</div>
                  <div className="text-xs text-gray-400">Total Trades</div>
                </div>
                <BarChart3 className="h-4 w-4 text-blue-400" />
              </div>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-white">{stats.completedTrades}</div>
                  <div className="text-xs text-gray-400">Completed</div>
                </div>
                <Target className="h-4 w-4 text-green-400" />
              </div>
            </div>
          </div>

          {/* Win/Loss Breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-green-400">{stats.winningTrades}</div>
                  <div className="text-xs text-gray-400">Winners</div>
                </div>
                <TrendingUp className="h-4 w-4 text-green-400" />
              </div>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-red-400">{stats.losingTrades}</div>
                  <div className="text-xs text-gray-400">Losers</div>
                </div>
                <TrendingDown className="h-4 w-4 text-red-400" />
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Avg P&L per Trade:</span>
              <span className={`text-sm font-medium ${stats.avgPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ₹{stats.avgPnL.toFixed(2)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Max Profit:</span>
              <span className="text-sm font-medium text-green-400">₹{stats.maxProfit.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Max Loss:</span>
              <span className="text-sm font-medium text-red-400">₹{stats.maxLoss.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Profit Factor:</span>
              <span className={`text-sm font-medium ${stats.profitFactor >= 1 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.profitFactor.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Performance Bar */}
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-400">Performance</span>
              <span className={`text-xs font-medium ${stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.totalPnL >= 0 ? 'Profitable' : 'Loss'}
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${stats.winRate >= 50 ? 'bg-green-400' : 'bg-red-400'}`}
                style={{ width: `${Math.min(stats.winRate, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <BarChart3 className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No trades yet for {selectedIndex}</p>
          <p className="text-xs text-gray-500 mt-1">Start trading to see performance stats</p>
        </div>
      )}
    </div>
  );
}