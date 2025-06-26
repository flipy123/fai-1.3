class IndicatorService {
  constructor() {
    this.priceHistory = new Map(); // Store OHLC data per symbol
    this.maxHistoryLength = 200; // Keep last 200 candles
  }

  // Add new OHLC data
  addPriceData(symbol, ohlc) {
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }

    const history = this.priceHistory.get(symbol);
    history.push({
      timestamp: ohlc.timestamp || new Date().toISOString(),
      open: ohlc.open,
      high: ohlc.high,
      low: ohlc.low,
      close: ohlc.close,
      volume: ohlc.volume || 0
    });

    // Keep only recent data
    if (history.length > this.maxHistoryLength) {
      history.splice(0, history.length - this.maxHistoryLength);
    }
  }

  // Get price history for a symbol
  getPriceHistory(symbol, length = 50) {
    const history = this.priceHistory.get(symbol) || [];
    return history.slice(-length);
  }

  // Calculate Simple Moving Average
  calculateSMA(prices, period) {
    if (prices.length < period) return null;
    
    const sum = prices.slice(-period).reduce((acc, price) => acc + price, 0);
    return sum / period;
  }

  // Calculate Exponential Moving Average
  calculateEMA(prices, period) {
    if (prices.length < period) return null;
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  // Calculate RSI
  calculateRSI(symbol, period = 14) {
    const history = this.getPriceHistory(symbol, period + 1);
    if (history.length < period + 1) return null;

    const closes = history.map(h => h.close);
    const gains = [];
    const losses = [];

    for (let i = 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    const avgGain = this.calculateSMA(gains, period);
    const avgLoss = this.calculateSMA(losses, period);

    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return Math.round(rsi * 100) / 100;
  }

  // Calculate MACD
  calculateMACD(symbol, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const history = this.getPriceHistory(symbol, slowPeriod + signalPeriod);
    if (history.length < slowPeriod + signalPeriod) return null;

    const closes = history.map(h => h.close);
    
    const fastEMA = this.calculateEMA(closes, fastPeriod);
    const slowEMA = this.calculateEMA(closes, slowPeriod);
    
    if (!fastEMA || !slowEMA) return null;
    
    const macdLine = fastEMA - slowEMA;
    
    // For signal line, we need MACD history
    // Simplified calculation for demo
    const signal = macdLine * 0.8; // Approximation
    const histogram = macdLine - signal;

    return {
      macd: Math.round(macdLine * 100) / 100,
      signal: Math.round(signal * 100) / 100,
      histogram: Math.round(histogram * 100) / 100
    };
  }

  // Calculate Bollinger Bands
  calculateBollingerBands(symbol, period = 20, stdDev = 2) {
    const history = this.getPriceHistory(symbol, period);
    if (history.length < period) return null;

    const closes = history.map(h => h.close);
    const sma = this.calculateSMA(closes, period);
    
    if (!sma) return null;

    // Calculate standard deviation
    const squaredDiffs = closes.slice(-period).map(close => Math.pow(close - sma, 2));
    const variance = squaredDiffs.reduce((acc, diff) => acc + diff, 0) / period;
    const standardDeviation = Math.sqrt(variance);

    return {
      upper: Math.round((sma + (stdDev * standardDeviation)) * 100) / 100,
      middle: Math.round(sma * 100) / 100,
      lower: Math.round((sma - (stdDev * standardDeviation)) * 100) / 100
    };
  }

  // Calculate Supertrend
  calculateSupertrend(symbol, period = 10, multiplier = 3) {
    const history = this.getPriceHistory(symbol, period + 1);
    if (history.length < period + 1) return null;

    // Calculate ATR (Average True Range)
    const atr = this.calculateATR(symbol, period);
    if (!atr) return null;

    const latest = history[history.length - 1];
    const hl2 = (latest.high + latest.low) / 2;
    
    const upperBand = hl2 + (multiplier * atr);
    const lowerBand = hl2 - (multiplier * atr);

    // Simplified Supertrend calculation
    const supertrend = latest.close > hl2 ? lowerBand : upperBand;
    const trend = latest.close > supertrend ? 'BULLISH' : 'BEARISH';

    return {
      value: Math.round(supertrend * 100) / 100,
      trend: trend
    };
  }

  // Calculate ATR (Average True Range)
  calculateATR(symbol, period = 14) {
    const history = this.getPriceHistory(symbol, period + 1);
    if (history.length < period + 1) return null;

    const trueRanges = [];
    
    for (let i = 1; i < history.length; i++) {
      const current = history[i];
      const previous = history[i - 1];
      
      const tr1 = current.high - current.low;
      const tr2 = Math.abs(current.high - previous.close);
      const tr3 = Math.abs(current.low - previous.close);
      
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }

    return this.calculateSMA(trueRanges, period);
  }

  // Calculate Stochastic
  calculateStochastic(symbol, kPeriod = 14, dPeriod = 3) {
    const history = this.getPriceHistory(symbol, kPeriod);
    if (history.length < kPeriod) return null;

    const recent = history.slice(-kPeriod);
    const currentClose = recent[recent.length - 1].close;
    const lowestLow = Math.min(...recent.map(h => h.low));
    const highestHigh = Math.max(...recent.map(h => h.high));

    const kPercent = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    const dPercent = kPercent * 0.8; // Simplified D% calculation

    return {
      k: Math.round(kPercent * 100) / 100,
      d: Math.round(dPercent * 100) / 100
    };
  }

  // Get all indicators for a symbol
  getAllIndicators(symbol) {
    const history = this.getPriceHistory(symbol);
    if (history.length < 20) {
      return {
        error: 'Insufficient data for indicators',
        dataPoints: history.length
      };
    }

    const latest = history[history.length - 1];
    
    return {
      price: {
        current: latest.close,
        open: latest.open,
        high: latest.high,
        low: latest.low,
        volume: latest.volume
      },
      sma: {
        sma20: this.calculateSMA(history.map(h => h.close), 20),
        sma50: this.calculateSMA(history.map(h => h.close), 50)
      },
      ema: {
        ema12: this.calculateEMA(history.map(h => h.close), 12),
        ema26: this.calculateEMA(history.map(h => h.close), 26)
      },
      rsi: this.calculateRSI(symbol),
      macd: this.calculateMACD(symbol),
      bollinger: this.calculateBollingerBands(symbol),
      supertrend: this.calculateSupertrend(symbol),
      stochastic: this.calculateStochastic(symbol),
      atr: this.calculateATR(symbol),
      timestamp: latest.timestamp,
      dataPoints: history.length
    };
  }

  // Update indicators with new price data
  updateIndicators(symbol, priceData) {
    this.addPriceData(symbol, priceData);
    return this.getAllIndicators(symbol);
  }

  // Clear history for a symbol
  clearHistory(symbol) {
    this.priceHistory.delete(symbol);
  }

  // Clear all history
  clearAllHistory() {
    this.priceHistory.clear();
  }

  // Get indicator summary for GPT
  getIndicatorSummary(symbol) {
    const indicators = this.getAllIndicators(symbol);
    
    if (indicators.error) {
      return {
        status: 'insufficient_data',
        message: indicators.error,
        dataPoints: indicators.dataPoints
      };
    }

    // Determine overall trend
    let trendSignals = 0;
    let totalSignals = 0;

    // RSI signal
    if (indicators.rsi) {
      totalSignals++;
      if (indicators.rsi > 70) trendSignals -= 1; // Overbought
      else if (indicators.rsi < 30) trendSignals += 1; // Oversold
    }

    // MACD signal
    if (indicators.macd) {
      totalSignals++;
      if (indicators.macd.macd > indicators.macd.signal) trendSignals += 1;
      else trendSignals -= 1;
    }

    // Supertrend signal
    if (indicators.supertrend) {
      totalSignals++;
      if (indicators.supertrend.trend === 'BULLISH') trendSignals += 1;
      else trendSignals -= 1;
    }

    // Moving average signal
    if (indicators.sma.sma20 && indicators.price.current) {
      totalSignals++;
      if (indicators.price.current > indicators.sma.sma20) trendSignals += 1;
      else trendSignals -= 1;
    }

    const trendStrength = totalSignals > 0 ? (trendSignals / totalSignals) : 0;
    let overallTrend = 'NEUTRAL';
    
    if (trendStrength > 0.3) overallTrend = 'BULLISH';
    else if (trendStrength < -0.3) overallTrend = 'BEARISH';

    return {
      status: 'ready',
      trend: overallTrend,
      strength: Math.abs(trendStrength),
      signals: {
        rsi: indicators.rsi,
        macd: indicators.macd,
        supertrend: indicators.supertrend,
        bollinger: indicators.bollinger,
        stochastic: indicators.stochastic
      },
      price: indicators.price,
      summary: `${overallTrend} trend with ${Math.round(Math.abs(trendStrength) * 100)}% confidence`
    };
  }
}

export const indicatorService = new IndicatorService();