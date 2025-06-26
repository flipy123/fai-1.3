import fs from 'fs';
import path from 'path';

class TradeMemoryService {
  constructor() {
    this.dataPath = './data';
    this.tradesFile = path.join(this.dataPath, 'trades.json');
    this.memoryFile = path.join(this.dataPath, 'gpt_memory.json');
    
    // Ensure data directory exists
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
    }
    
    this.trades = new Map(); // symbol -> trades array
    this.gptMemory = new Map(); // symbol -> memory object
    this.currentDay = new Date().toDateString();
    
    this.loadFromDisk();
  }

  loadFromDisk() {
    try {
      // Load trades
      if (fs.existsSync(this.tradesFile)) {
        const tradesData = JSON.parse(fs.readFileSync(this.tradesFile, 'utf8'));
        
        // Filter trades for current day only
        Object.entries(tradesData).forEach(([symbol, trades]) => {
          const todayTrades = trades.filter(trade => {
            const tradeDate = new Date(trade.timestamp).toDateString();
            return tradeDate === this.currentDay;
          });
          
          if (todayTrades.length > 0) {
            this.trades.set(symbol, todayTrades);
          }
        });
      }

      // Load GPT memory
      if (fs.existsSync(this.memoryFile)) {
        const memoryData = JSON.parse(fs.readFileSync(this.memoryFile, 'utf8'));
        Object.entries(memoryData).forEach(([symbol, memory]) => {
          this.gptMemory.set(symbol, memory);
        });
      }

      console.log(`📚 Loaded trade memory: ${this.trades.size} symbols with trades`);
    } catch (error) {
      console.error('❌ Error loading trade memory:', error);
    }
  }

  saveToDisk() {
    try {
      // Save trades
      const tradesData = {};
      this.trades.forEach((trades, symbol) => {
        tradesData[symbol] = trades;
      });
      fs.writeFileSync(this.tradesFile, JSON.stringify(tradesData, null, 2));

      // Save GPT memory
      const memoryData = {};
      this.gptMemory.forEach((memory, symbol) => {
        memoryData[symbol] = memory;
      });
      fs.writeFileSync(this.memoryFile, JSON.stringify(memoryData, null, 2));

    } catch (error) {
      console.error('❌ Error saving trade memory:', error);
    }
  }

  // Add a new trade
  addTrade(symbol, tradeData) {
    if (!this.trades.has(symbol)) {
      this.trades.set(symbol, []);
    }

    const trade = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      date: new Date().toDateString(),
      ...tradeData
    };

    this.trades.get(symbol).push(trade);
    
    // Keep only last 100 trades per symbol
    const symbolTrades = this.trades.get(symbol);
    if (symbolTrades.length > 100) {
      symbolTrades.splice(0, symbolTrades.length - 100);
    }

    this.saveToDisk();
    console.log(`📝 Added trade for ${symbol}:`, trade.action, trade.symbol);
    
    return trade;
  }

  // Get trades for a symbol
  getTrades(symbol, limit = 50) {
    const trades = this.trades.get(symbol) || [];
    return trades.slice(-limit);
  }

  // Get all trades for today
  getAllTradesToday() {
    const allTrades = [];
    this.trades.forEach((trades, symbol) => {
      allTrades.push(...trades);
    });
    
    return allTrades.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // Calculate performance metrics
  getPerformanceMetrics(symbol) {
    const trades = this.getTrades(symbol);
    const completedTrades = trades.filter(t => t.status === 'COMPLETED' && t.pnl !== undefined);
    
    if (completedTrades.length === 0) {
      return {
        totalTrades: trades.length,
        completedTrades: 0,
        totalPnL: 0,
        winRate: 0,
        avgPnL: 0,
        maxProfit: 0,
        maxLoss: 0,
        profitFactor: 0
      };
    }

    const totalPnL = completedTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const winningTrades = completedTrades.filter(t => t.pnl > 0);
    const losingTrades = completedTrades.filter(t => t.pnl < 0);
    
    const totalProfit = winningTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.pnl, 0));
    
    return {
      totalTrades: trades.length,
      completedTrades: completedTrades.length,
      totalPnL: Math.round(totalPnL * 100) / 100,
      winRate: Math.round((winningTrades.length / completedTrades.length) * 100),
      avgPnL: Math.round((totalPnL / completedTrades.length) * 100) / 100,
      maxProfit: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl)) : 0,
      maxLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl)) : 0,
      profitFactor: totalLoss > 0 ? Math.round((totalProfit / totalLoss) * 100) / 100 : 0,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length
    };
  }

  // Update GPT memory
  updateGPTMemory(symbol, memoryData) {
    const currentMemory = this.gptMemory.get(symbol) || {
      patterns: [],
      preferences: {},
      performance: {},
      lastUpdate: null
    };

    const updatedMemory = {
      ...currentMemory,
      ...memoryData,
      lastUpdate: new Date().toISOString()
    };

    this.gptMemory.set(symbol, updatedMemory);
    this.saveToDisk();
    
    console.log(`🧠 Updated GPT memory for ${symbol}`);
  }

  // Get GPT memory
  getGPTMemory(symbol) {
    return this.gptMemory.get(symbol) || {
      patterns: [],
      preferences: {},
      performance: {},
      lastUpdate: null
    };
  }

  // Get trading context for GPT
  getTradingContext(symbol) {
    const trades = this.getTrades(symbol, 20); // Last 20 trades
    const performance = this.getPerformanceMetrics(symbol);
    const memory = this.getGPTMemory(symbol);
    
    // Analyze recent patterns
    const recentPatterns = this.analyzeRecentPatterns(trades);
    
    return {
      recentTrades: trades,
      performance: performance,
      memory: memory,
      patterns: recentPatterns,
      tradingDay: this.currentDay,
      summary: this.generateTradingSummary(symbol, trades, performance)
    };
  }

  analyzeRecentPatterns(trades) {
    if (trades.length < 5) return [];

    const patterns = [];
    
    // Time-based patterns
    const hourlyPerformance = {};
    trades.forEach(trade => {
      if (trade.pnl !== undefined) {
        const hour = new Date(trade.timestamp).getHours();
        if (!hourlyPerformance[hour]) {
          hourlyPerformance[hour] = { count: 0, pnl: 0 };
        }
        hourlyPerformance[hour].count++;
        hourlyPerformance[hour].pnl += trade.pnl;
      }
    });

    // Find best performing hours
    const bestHours = Object.entries(hourlyPerformance)
      .filter(([_, data]) => data.count >= 2)
      .sort(([_, a], [__, b]) => (b.pnl / b.count) - (a.pnl / a.count))
      .slice(0, 2);

    if (bestHours.length > 0) {
      patterns.push({
        type: 'TIME_PERFORMANCE',
        description: `Best trading hours: ${bestHours.map(([hour]) => `${hour}:00`).join(', ')}`,
        confidence: 0.7
      });
    }

    // Strike selection patterns
    const strikePatterns = this.analyzeStrikePatterns(trades);
    patterns.push(...strikePatterns);

    // Risk management patterns
    const riskPatterns = this.analyzeRiskPatterns(trades);
    patterns.push(...riskPatterns);

    return patterns;
  }

  analyzeStrikePatterns(trades) {
    const patterns = [];
    const optionTrades = trades.filter(t => t.symbol && (t.symbol.includes('CE') || t.symbol.includes('PE')));
    
    if (optionTrades.length < 3) return patterns;

    // ITM vs OTM performance
    let itmPerformance = 0;
    let otmPerformance = 0;
    let itmCount = 0;
    let otmCount = 0;

    optionTrades.forEach(trade => {
      if (trade.pnl !== undefined && trade.strikeDistance !== undefined) {
        if (Math.abs(trade.strikeDistance) < 100) { // ITM/ATM
          itmPerformance += trade.pnl;
          itmCount++;
        } else { // OTM
          otmPerformance += trade.pnl;
          otmCount++;
        }
      }
    });

    if (itmCount > 0 && otmCount > 0) {
      const itmAvg = itmPerformance / itmCount;
      const otmAvg = otmPerformance / otmCount;
      
      if (itmAvg > otmAvg && itmAvg > 0) {
        patterns.push({
          type: 'STRIKE_PREFERENCE',
          description: 'ITM/ATM options showing better performance',
          confidence: 0.8
        });
      } else if (otmAvg > itmAvg && otmAvg > 0) {
        patterns.push({
          type: 'STRIKE_PREFERENCE',
          description: 'OTM options showing better performance',
          confidence: 0.8
        });
      }
    }

    return patterns;
  }

  analyzeRiskPatterns(trades) {
    const patterns = [];
    const completedTrades = trades.filter(t => t.status === 'COMPLETED' && t.pnl !== undefined);
    
    if (completedTrades.length < 5) return patterns;

    // Stop loss effectiveness
    const slTrades = completedTrades.filter(t => t.exitReason === 'STOP_LOSS');
    const targetTrades = completedTrades.filter(t => t.exitReason === 'TARGET');
    
    if (slTrades.length > 0 && targetTrades.length > 0) {
      const slAvgLoss = slTrades.reduce((sum, t) => sum + t.pnl, 0) / slTrades.length;
      const targetAvgProfit = targetTrades.reduce((sum, t) => sum + t.pnl, 0) / targetTrades.length;
      
      const riskReward = Math.abs(targetAvgProfit / slAvgLoss);
      
      if (riskReward > 2) {
        patterns.push({
          type: 'RISK_MANAGEMENT',
          description: `Good risk-reward ratio: ${riskReward.toFixed(1)}:1`,
          confidence: 0.9
        });
      } else if (riskReward < 1) {
        patterns.push({
          type: 'RISK_MANAGEMENT',
          description: `Poor risk-reward ratio: ${riskReward.toFixed(1)}:1 - Consider tighter stops or wider targets`,
          confidence: 0.8
        });
      }
    }

    return patterns;
  }

  generateTradingSummary(symbol, trades, performance) {
    if (trades.length === 0) {
      return `No trades yet for ${symbol} today. Ready to start fresh.`;
    }

    const summary = [];
    summary.push(`${trades.length} trades today for ${symbol}`);
    
    if (performance.completedTrades > 0) {
      summary.push(`${performance.winRate}% win rate`);
      summary.push(`₹${performance.totalPnL} total P&L`);
      
      if (performance.totalPnL > 0) {
        summary.push('Currently profitable');
      } else {
        summary.push('Currently in loss - need better entries');
      }
    }

    const lastTrade = trades[trades.length - 1];
    if (lastTrade) {
      summary.push(`Last trade: ${lastTrade.action} ${lastTrade.symbol} at ${new Date(lastTrade.timestamp).toLocaleTimeString()}`);
    }

    return summary.join('. ');
  }

  // Reset trades for a symbol (or all)
  resetTrades(symbol = null) {
    if (symbol) {
      this.trades.delete(symbol);
      this.gptMemory.delete(symbol);
      console.log(`🗑️ Reset trades for ${symbol}`);
    } else {
      this.trades.clear();
      this.gptMemory.clear();
      console.log('🗑️ Reset all trades');
    }
    
    this.saveToDisk();
  }

  // Get dashboard stats
  getDashboardStats() {
    const allTrades = this.getAllTradesToday();
    const totalPnL = allTrades
      .filter(t => t.pnl !== undefined)
      .reduce((sum, t) => sum + t.pnl, 0);
    
    const activeSymbols = this.trades.size;
    const completedTrades = allTrades.filter(t => t.status === 'COMPLETED').length;
    
    return {
      totalTrades: allTrades.length,
      completedTrades: completedTrades,
      activeSymbols: activeSymbols,
      totalPnL: Math.round(totalPnL * 100) / 100,
      tradingDay: this.currentDay
    };
  }
}

export const tradeMemoryService = new TradeMemoryService();