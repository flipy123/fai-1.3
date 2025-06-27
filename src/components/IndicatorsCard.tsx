import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Target } from 'lucide-react';

interface IndicatorsCardProps {
  marketData: any;
  selectedIndex: string;
}

interface Indicators {
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  supertrend: {
    value: number;
    trend: string;
  };
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
  };
  stochastic: {
    k: number;
    d: number;
  };
  trend: string;
  strength: number;
  summary: string;
}

export function IndicatorsCard({ marketData, selectedIndex }: IndicatorsCardProps) {
  const [indicators, setIndicators] = useState<Indicators | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (marketData) {
      fetchIndicators();
    }
  }, [marketData, selectedIndex]);

  const fetchIndicators = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/indicators/${selectedIndex}`);
      const data = await response.json();
      setIndicators(data);
    } catch (error) {
      console.error('Error fetching indicators:', error);
      // Mock indicators for development
      setIndicators({
        rsi: 45 + Math.random() * 20,
        macd: {
          macd: (Math.random() - 0.5) * 10,
          signal: (Math.random() - 0.5) * 8,
          histogram: (Math.random() - 0.5) * 5
        },
        supertrend: {
          value: marketData?.ltp ? marketData.ltp + (Math.random() - 0.5) * 100 : 19800,
          trend: Math.random() > 0.5 ? 'BULLISH' : 'BEARISH'
        },
        bollinger: {
          upper: marketData?.ltp ? marketData.ltp + 50 : 19900,
          middle: marketData?.ltp || 19850,
          lower: marketData?.ltp ? marketData.ltp - 50 : 19800
        },
        stochastic: {
          k: 20 + Math.random() * 60,
          d: 20 + Math.random() * 60
        },
        trend: Math.random() > 0.5 ? 'BULLISH' : 'BEARISH',
        strength: Math.random(),
        summary: 'Mixed signals with moderate volatility'
      });
    } finally {
      setLoading(false);
    }
  };

  const getRSIColor = (rsi: number) => {
    if (rsi > 70) return 'text-red-400';
    if (rsi < 30) return 'text-green-400';
    return 'text-yellow-400';
  };

  const getRSILabel = (rsi: number) => {
    if (rsi > 70) return 'Overbought';
    if (rsi < 30) return 'Oversold';
    return 'Neutral';
  };

  const getTrendColor = (trend: string) => {
    return trend === 'BULLISH' ? 'text-green-400' : 'text-red-400';
  };

  const getTrendIcon = (trend: string) => {
    return trend === 'BULLISH' ? TrendingUp : TrendingDown;
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
          <Activity className="h-5 w-5 text-blue-400" />
          <span>Technical Indicators</span>
        </h3>
        <div className="text-xs text-gray-400">Live</div>
      </div>

      {indicators ? (
        <div className="space-y-4">
          {/* Overall Trend */}
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {React.createElement(getTrendIcon(indicators.trend), {
                  className: `h-5 w-5 ${getTrendColor(indicators.trend)}`
                })}
                <span className={`font-semibold ${getTrendColor(indicators.trend)}`}>
                  {indicators.trend}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm text-white">
                  {Math.round(indicators.strength * 100)}% Confidence
                </div>
                <div className="text-xs text-gray-400">{indicators.summary}</div>
              </div>
            </div>
          </div>

          {/* Key Indicators Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* RSI */}
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">RSI (14)</span>
                <span className={`text-xs font-medium ${getRSIColor(indicators.rsi)}`}>
                  {getRSILabel(indicators.rsi)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-lg font-bold ${getRSIColor(indicators.rsi)}`}>
                  {indicators.rsi.toFixed(1)}
                </span>
                <div className="w-16 bg-gray-600 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getRSIColor(indicators.rsi).replace('text-', 'bg-')}`}
                    style={{ width: `${indicators.rsi}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Supertrend */}
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Supertrend</span>
                <span className={`text-xs font-medium ${getTrendColor(indicators.supertrend.trend)}`}>
                  {indicators.supertrend.trend}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-white">
                  {indicators.supertrend.value.toFixed(0)}
                </span>
                {React.createElement(getTrendIcon(indicators.supertrend.trend), {
                  className: `h-4 w-4 ${getTrendColor(indicators.supertrend.trend)}`
                })}
              </div>
            </div>
          </div>

          {/* MACD */}
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">MACD (12,26,9)</span>
              <span className={`text-xs font-medium ${indicators.macd.macd > indicators.macd.signal ? 'text-green-400' : 'text-red-400'}`}>
                {indicators.macd.macd > indicators.macd.signal ? 'Bullish' : 'Bearish'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="text-white font-mono">{indicators.macd.macd.toFixed(2)}</div>
                <div className="text-gray-400">MACD</div>
              </div>
              <div className="text-center">
                <div className="text-white font-mono">{indicators.macd.signal.toFixed(2)}</div>
                <div className="text-gray-400">Signal</div>
              </div>
              <div className="text-center">
                <div className={`font-mono ${indicators.macd.histogram >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {indicators.macd.histogram.toFixed(2)}
                </div>
                <div className="text-gray-400">Histogram</div>
              </div>
            </div>
          </div>

          {/* Bollinger Bands */}
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Bollinger Bands (20,2)</span>
              <Target className="h-4 w-4 text-blue-400" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="text-red-400 font-mono">{indicators.bollinger.upper.toFixed(0)}</div>
                <div className="text-gray-400">Upper</div>
              </div>
              <div className="text-center">
                <div className="text-white font-mono">{indicators.bollinger.middle.toFixed(0)}</div>
                <div className="text-gray-400">Middle</div>
              </div>
              <div className="text-center">
                <div className="text-green-400 font-mono">{indicators.bollinger.lower.toFixed(0)}</div>
                <div className="text-gray-400">Lower</div>
              </div>
            </div>
          </div>

          {/* Stochastic */}
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Stochastic (14,3)</span>
              <span className={`text-xs font-medium ${
                indicators.stochastic.k > 80 ? 'text-red-400' : 
                indicators.stochastic.k < 20 ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {indicators.stochastic.k > 80 ? 'Overbought' : 
                 indicators.stochastic.k < 20 ? 'Oversold' : 'Neutral'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-center">
                <div className="text-white font-mono">{indicators.stochastic.k.toFixed(1)}</div>
                <div className="text-gray-400">%K</div>
              </div>
              <div className="text-center">
                <div className="text-white font-mono">{indicators.stochastic.d.toFixed(1)}</div>
                <div className="text-gray-400">%D</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Activity className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Loading technical indicators...</p>
          <p className="text-xs text-gray-500 mt-1">Calculating RSI, MACD, Supertrend...</p>
        </div>
      )}
    </div>
  );
}