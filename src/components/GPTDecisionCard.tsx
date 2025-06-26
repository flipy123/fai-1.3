import React from 'react';
import { Brain, Target, Shield, TrendingUp } from 'lucide-react';

interface GPTDecisionCardProps {
  decision: {
    action: string;
    symbol: string;
    quantity: number;
    price: number;
    stopLoss: number;
    target: number;
    reasoning: string;
    confidence: number;
    timestamp: string;
  } | null;
  isTrading: boolean;
}

export function GPTDecisionCard({ decision, isTrading }: GPTDecisionCardProps) {
  const getActionColor = (action: string) => {
    switch (action) {
      case 'BUY':
        return 'text-green-400 bg-green-400/10';
      case 'SELL':
        return 'text-red-400 bg-red-400/10';
      case 'HOLD':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'EXIT':
        return 'text-orange-400 bg-orange-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 8) return 'text-green-400';
    if (confidence >= 6) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <Brain className="h-5 w-5 text-blue-400" />
          <span>GPT Brain Decision</span>
        </h3>
        {isTrading && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-400">ACTIVE</span>
          </div>
        )}
      </div>

      {decision ? (
        <div className="space-y-4">
          {/* Action and Confidence */}
          <div className="flex items-center justify-between">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getActionColor(decision.action)}`}>
              {decision.action}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">Confidence:</span>
              <span className={`text-sm font-medium ${getConfidenceColor(decision.confidence)}`}>
                {decision.confidence}/10
              </span>
            </div>
          </div>

          {/* Trade Details */}
          {decision.action !== 'HOLD' && (
            <div className="bg-gray-700 rounded-lg p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Symbol:</span>
                <span className="text-sm text-white font-mono">{decision.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Quantity:</span>
                <span className="text-sm text-white">{decision.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Price:</span>
                <span className="text-sm text-white">₹{decision.price}</span>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                <div className="flex items-center space-x-1">
                  <Target className="h-3 w-3 text-green-400" />
                  <span className="text-xs text-gray-400">Target:</span>
                  <span className="text-xs text-green-400">₹{decision.target}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Shield className="h-3 w-3 text-red-400" />
                  <span className="text-xs text-gray-400">SL:</span>
                  <span className="text-xs text-red-400">₹{decision.stopLoss}</span>
                </div>
              </div>
            </div>
          )}

          {/* Reasoning */}
          <div className="bg-gray-700 rounded-lg p-3">
            <h4 className="text-sm font-medium text-white mb-2">GPT Reasoning:</h4>
            <p className="text-sm text-gray-300 leading-relaxed">{decision.reasoning}</p>
          </div>

          {/* Timestamp */}
          <div className="text-xs text-gray-500 text-right">
            Last updated: {new Date(decision.timestamp).toLocaleTimeString()}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Brain className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">
            {isTrading ? 'Waiting for GPT decision...' : 'Start trading to see GPT decisions'}
          </p>
        </div>
      )}
    </div>
  );
}