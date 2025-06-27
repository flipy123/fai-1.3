import React from 'react';
import { WalletCard } from './WalletCard';
import { PositionsCard } from './PositionsCard';
import { OrdersCard } from './OrdersCard';
import { ChartCard } from './ChartCard';
import { GPTDecisionCard } from './GPTDecisionCard';
import { TradeLogsCard } from './TradeLogsCard';
import { OptionChainCard } from './OptionChainCard';
import { IndicatorsCard } from './IndicatorsCard';
import { TradeStatsCard } from './TradeStatsCard';
import { RotateCcw } from 'lucide-react';

interface DashboardProps {
  marketData: any;
  positions: any[];
  orders: any[];
  wallet: any;
  optionChain: any[];
  gptDecision: any;
  tradeLogs: any[];
  isTrading: boolean;
  selectedIndex: string;
}

export function Dashboard({
  marketData,
  positions,
  orders,
  wallet,
  optionChain,
  gptDecision,
  tradeLogs,
  isTrading,
  selectedIndex
}: DashboardProps) {
  const handleResetAll = async () => {
    if (window.confirm('Are you sure you want to reset all trades and GPT memory? This action cannot be undone.')) {
      try {
        const response = await fetch('http://localhost:3001/api/trading/reset-all', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ symbol: selectedIndex })
        });

        if (response.ok) {
          alert('All trades and GPT memory have been reset successfully!');
          // Refresh the page to show clean state
          window.location.reload();
        } else {
          throw new Error('Failed to reset');
        }
      } catch (error) {
        console.error('Error resetting trades:', error);
        alert('Failed to reset trades. Please try again.');
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Reset Button */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">FAi-3.0 Trading Dashboard</h1>
        <button
          onClick={handleResetAll}
          disabled={isTrading}
          className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Reset All</span>
        </button>
      </div>

      {/* Top Row - Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <WalletCard wallet={wallet} />
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Open Positions</h3>
          <p className="text-2xl font-bold text-white">{positions?.length || 0}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Orders</h3>
          <p className="text-2xl font-bold text-white">{orders?.length || 0}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Live P&L</h3>
          <p className="text-2xl font-bold text-green-400">
            ₹{positions?.reduce((sum, pos) => sum + (pos.pnl || 0), 0).toFixed(2) || '0.00'}
          </p>
        </div>
      </div>

      {/* Second Row - Chart and GPT Decision */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard marketData={marketData} selectedIndex={selectedIndex} />
        <GPTDecisionCard decision={gptDecision} isTrading={isTrading} />
      </div>

      {/* Third Row - Technical Indicators and Trade Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IndicatorsCard marketData={marketData} selectedIndex={selectedIndex} />
        <TradeStatsCard selectedIndex={selectedIndex} />
      </div>

      {/* Fourth Row - Positions and Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PositionsCard positions={positions} />
        <OrdersCard orders={orders} />
      </div>

      {/* Fifth Row - Option Chain and Trade Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OptionChainCard optionChain={optionChain} selectedIndex={selectedIndex} />
        <TradeLogsCard logs={tradeLogs} />
      </div>
    </div>
  );
}