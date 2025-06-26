import React from 'react';
import { WalletCard } from './WalletCard';
import { PositionsCard } from './PositionsCard';
import { OrdersCard } from './OrdersCard';
import { ChartCard } from './ChartCard';
import { GPTDecisionCard } from './GPTDecisionCard';
import { TradeLogsCard } from './TradeLogsCard';
import { OptionChainCard } from './OptionChainCard';

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
  return (
    <div className="p-6 space-y-6">
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

      {/* Third Row - Positions and Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PositionsCard positions={positions} />
        <OrdersCard orders={orders} />
      </div>

      {/* Fourth Row - Option Chain and Trade Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OptionChainCard optionChain={optionChain} />
        <TradeLogsCard logs={tradeLogs} />
      </div>
    </div>
  );
}