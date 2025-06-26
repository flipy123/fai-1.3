class GPTService {
  constructor() {
    this.memory = new Map(); // Store trading memory per symbol
    this.conversationHistory = new Map(); // Store chat history per symbol
    this.tradingContext = new Map(); // Store trading context per symbol
  }

  async chat(message, context, provider = 'openrouter') {
    try {
      const systemPrompt = `You are FAi, a friendly AI trading assistant with deep knowledge of Indian options trading. 
      
      You help traders understand market movements, explain trading decisions, and provide insights in a casual, human-like manner.
      
      Current context: ${JSON.stringify(context)}
      
      Respond as a knowledgeable friend who understands trading psychology and market dynamics. Keep responses conversational and helpful.`;
      
      const response = await this.callGPT([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ], provider);

      return response;
    } catch (error) {
      throw new Error(`GPT chat failed: ${error.message}`);
    }
  }

  async getTradingDecision(marketData, context, provider = 'openrouter') {
    try {
      const { symbol, positions, orders, wallet } = context;
      const memory = this.memory.get(symbol) || { trades: [], performance: {}, patterns: [] };
      const tradingContext = this.tradingContext.get(symbol) || {};

      const systemPrompt = `You are an expert options trader specializing in Indian indices (NIFTY, BANKNIFTY, FINNIFTY, MIDCPNIFTY).
      
      CURRENT MARKET DATA:
      ${JSON.stringify(marketData, null, 2)}
      
      PORTFOLIO STATUS:
      Open Positions: ${JSON.stringify(positions, null, 2)}
      Recent Orders: ${JSON.stringify(orders, null, 2)}
      Wallet: ${JSON.stringify(wallet, null, 2)}
      
      TRADING MEMORY:
      Past Trades: ${JSON.stringify(memory.trades.slice(-10), null, 2)}
      Performance: ${JSON.stringify(memory.performance, null, 2)}
      Identified Patterns: ${JSON.stringify(memory.patterns, null, 2)}
      
      TRADING CONTEXT:
      Current Strategy: ${tradingContext.strategy || 'Adaptive'}
      Risk Level: ${tradingContext.riskLevel || 'Medium'}
      Market Sentiment: ${tradingContext.sentiment || 'Neutral'}
      
      INSTRUCTIONS:
      1. Analyze the current market conditions, price action, and volatility
      2. Consider your trading memory and past performance
      3. Factor in current positions and available capital
      4. Make a decision based on technical analysis and market sentiment
      5. Always include proper risk management (stop loss and target)
      
      Respond with ONLY a valid JSON object in this exact format:
      {
        "action": "BUY|SELL|HOLD|EXIT",
        "symbol": "exact_option_symbol_if_trading",
        "quantity": number_of_lots,
        "price": entry_price,
        "stopLoss": stop_loss_price,
        "target": target_price,
        "reasoning": "detailed_explanation_of_decision",
        "confidence": number_1_to_10,
        "marketSentiment": "BULLISH|BEARISH|NEUTRAL",
        "riskReward": ratio_number,
        "timeframe": "INTRADAY|SWING|POSITIONAL"
      }
      
      If no trading opportunity exists, use action: "HOLD"`;

      const response = await this.callGPT([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Analyze current market conditions and provide your trading decision.' }
      ], provider);

      try {
        const decision = JSON.parse(response);
        
        // Validate decision structure
        if (!decision.action || !decision.reasoning || !decision.confidence) {
          throw new Error('Invalid decision structure');
        }

        // Update trading context based on decision
        this.updateTradingContext(symbol, decision);

        return decision;
      } catch (parseError) {
        console.error('❌ Failed to parse GPT decision:', parseError);
        return { 
          action: 'HOLD', 
          reasoning: 'Unable to parse GPT response. Market analysis inconclusive.', 
          confidence: 1,
          marketSentiment: 'NEUTRAL',
          riskReward: 0,
          timeframe: 'INTRADAY'
        };
      }
    } catch (error) {
      throw new Error(`Trading decision failed: ${error.message}`);
    }
  }

  async callGPT(messages, provider = 'openrouter') {
    try {
      const isOpenRouter = provider === 'openrouter';
      const url = isOpenRouter 
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';
      
      const apiKey = isOpenRouter 
        ? process.env.OPENROUTER_API_KEY 
        : process.env.OPENAI_API_KEY;

      if (!apiKey) {
        throw new Error(`${provider} API key not configured`);
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };

      // Add OpenRouter specific headers
      if (isOpenRouter) {
        headers['HTTP-Referer'] = 'http://localhost:3001';
        headers['X-Title'] = 'FAi-3.0 Trading System';
      }

      const body = {
        model: isOpenRouter ? 'openai/gpt-4o-2024-08-06' : 'gpt-4o',
        messages,
        temperature: 0.7,
        max_tokens: 2000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      };

      console.log(`🧠 Calling ${provider} API...`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${provider} API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid API response structure');
      }

      const content = data.choices[0].message.content;
      console.log(`✅ ${provider} API response received`);
      
      return content;

    } catch (error) {
      console.error(`❌ ${provider} API call failed:`, error);
      
      // Fallback responses based on message type
      if (messages.some(m => m.content.includes('trading decision'))) {
        return JSON.stringify({
          action: 'HOLD',
          symbol: 'NIFTY24JAN19900CE',
          quantity: 50,
          price: 125.50,
          stopLoss: 110.00,
          target: 145.00,
          reasoning: `${provider} API unavailable. Holding current positions until connection is restored. Market conditions require careful observation.`,
          confidence: 3,
          marketSentiment: 'NEUTRAL',
          riskReward: 1.5,
          timeframe: 'INTRADAY'
        });
      }

      return `I'm having trouble connecting to my brain right now (${provider} API issue). Let me try to help you with the information I have. The market seems to be in a consolidation phase, so I'd suggest being cautious with new positions.`;
    }
  }

  updateMemory(symbol, tradeData) {
    const memory = this.memory.get(symbol) || { trades: [], performance: {}, patterns: [] };
    
    // Add trade to memory
    memory.trades.push({
      ...tradeData,
      timestamp: new Date().toISOString(),
      outcome: tradeData.result?.status || 'PENDING'
    });
    
    // Keep only last 100 trades
    if (memory.trades.length > 100) {
      memory.trades = memory.trades.slice(-100);
    }

    // Update performance metrics
    if (tradeData.result && tradeData.result.pnl !== undefined) {
      memory.performance.totalTrades = (memory.performance.totalTrades || 0) + 1;
      memory.performance.totalPnl = (memory.performance.totalPnl || 0) + tradeData.result.pnl;
      memory.performance.winRate = this.calculateWinRate(memory.trades);
      memory.performance.avgPnl = memory.performance.totalPnl / memory.performance.totalTrades;
    }

    // Identify patterns
    this.identifyPatterns(memory);
    
    this.memory.set(symbol, memory);
    console.log(`🧠 Updated trading memory for ${symbol}`);
  }

  updateTradingContext(symbol, decision) {
    const context = this.tradingContext.get(symbol) || {};
    
    context.lastDecision = decision;
    context.sentiment = decision.marketSentiment;
    context.lastUpdate = new Date().toISOString();
    
    // Update strategy based on recent decisions
    if (decision.confidence >= 8) {
      context.strategy = 'Aggressive';
    } else if (decision.confidence >= 6) {
      context.strategy = 'Moderate';
    } else {
      context.strategy = 'Conservative';
    }

    this.tradingContext.set(symbol, context);
  }

  calculateWinRate(trades) {
    if (trades.length === 0) return 0;
    
    const completedTrades = trades.filter(t => t.outcome === 'COMPLETE' && t.result?.pnl !== undefined);
    if (completedTrades.length === 0) return 0;
    
    const winningTrades = completedTrades.filter(t => t.result.pnl > 0);
    return (winningTrades.length / completedTrades.length) * 100;
  }

  identifyPatterns(memory) {
    // Simple pattern identification
    const recentTrades = memory.trades.slice(-20);
    const patterns = [];

    // Time-based patterns
    const timePatterns = this.analyzeTimePatterns(recentTrades);
    patterns.push(...timePatterns);

    // Price action patterns
    const pricePatterns = this.analyzePricePatterns(recentTrades);
    patterns.push(...pricePatterns);

    memory.patterns = patterns;
  }

  analyzeTimePatterns(trades) {
    // Analyze performance by time of day
    const patterns = [];
    const hourlyPerformance = {};

    trades.forEach(trade => {
      if (trade.timestamp && trade.result?.pnl !== undefined) {
        const hour = new Date(trade.timestamp).getHours();
        if (!hourlyPerformance[hour]) {
          hourlyPerformance[hour] = { trades: 0, pnl: 0 };
        }
        hourlyPerformance[hour].trades++;
        hourlyPerformance[hour].pnl += trade.result.pnl;
      }
    });

    // Find best performing hours
    const bestHours = Object.entries(hourlyPerformance)
      .filter(([_, data]) => data.trades >= 3)
      .sort(([_, a], [__, b]) => (b.pnl / b.trades) - (a.pnl / a.trades))
      .slice(0, 3);

    if (bestHours.length > 0) {
      patterns.push({
        type: 'TIME_PERFORMANCE',
        description: `Best trading hours: ${bestHours.map(([hour]) => `${hour}:00`).join(', ')}`,
        confidence: 0.7
      });
    }

    return patterns;
  }

  analyzePricePatterns(trades) {
    // Analyze price movement patterns
    const patterns = [];
    
    // Trend following vs counter-trend
    let trendFollowing = 0;
    let counterTrend = 0;

    trades.forEach(trade => {
      if (trade.marketSentiment && trade.action && trade.result?.pnl !== undefined) {
        const isWithTrend = (
          (trade.marketSentiment === 'BULLISH' && trade.action === 'BUY') ||
          (trade.marketSentiment === 'BEARISH' && trade.action === 'SELL')
        );

        if (isWithTrend) {
          trendFollowing += trade.result.pnl;
        } else {
          counterTrend += trade.result.pnl;
        }
      }
    });

    if (trendFollowing > counterTrend && trendFollowing > 0) {
      patterns.push({
        type: 'TREND_FOLLOWING',
        description: 'Trend following strategies show better performance',
        confidence: 0.8
      });
    } else if (counterTrend > trendFollowing && counterTrend > 0) {
      patterns.push({
        type: 'COUNTER_TREND',
        description: 'Counter-trend strategies show better performance',
        confidence: 0.8
      });
    }

    return patterns;
  }

  // Get trading insights for a symbol
  getTradingInsights(symbol) {
    const memory = this.memory.get(symbol) || { trades: [], performance: {}, patterns: [] };
    const context = this.tradingContext.get(symbol) || {};

    return {
      performance: memory.performance,
      patterns: memory.patterns,
      context: context,
      recentTrades: memory.trades.slice(-10)
    };
  }
}

export const gptService = new GPTService();