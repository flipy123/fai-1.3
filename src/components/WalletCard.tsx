import React from 'react';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';

interface WalletCardProps {
  wallet: {
    availableBalance: number;
    usedMargin: number;
    totalBalance: number;
  } | null;
}

export function WalletCard({ wallet }: WalletCardProps) {
  if (!wallet) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 animate-pulse">
        <div className="h-4 bg-gray-700 rounded mb-2"></div>
        <div className="h-8 bg-gray-700 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-400">Wallet Balance</h3>
        <Wallet className="h-4 w-4 text-gray-400" />
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Available</span>
          <span className="text-lg font-bold text-green-400">
            ₹{wallet.availableBalance.toLocaleString()}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Used Margin</span>
          <span className="text-sm text-red-400">
            ₹{wallet.usedMargin.toLocaleString()}
          </span>
        </div>
        
        <div className="border-t border-gray-700 pt-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Total</span>
            <span className="text-sm font-medium text-white">
              ₹{wallet.totalBalance.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}