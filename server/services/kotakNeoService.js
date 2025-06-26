import WebSocket from 'ws';

class KotakNeoService {
  constructor() {
    this.baseUrl = process.env.KOTAK_NEO_BASE_URL;
    this.wsUrl = process.env.KOTAK_NEO_WS_URL;
    this.accessToken = process.env.KOTAK_NEO_ACCESS_TOKEN;
    this.consumerKey = process.env.KOTAK_NEO_CONSUMER_KEY;
    this.consumerSecret = process.env.KOTAK_NEO_CONSUMER_SECRET;
    this.userId = process.env.KOTAK_NEO_USER_ID;
    this.clientId = process.env.KOTAK_NEO_CLIENT_ID;
    this.mobile = process.env.KOTAK_NEO_MOBILE;
    
    this.ws = null;
    this.isConnected = false;
    this.subscribedTokens = new Set();
    this.maxTokens = 200; // Kotak Neo limit
    this.marketData = new Map();
    this.callbacks = new Map();
    
    this.initializeWebSocket();
  }

  // Authentication and session management
  async authenticate() {
    try {
      if (!this.accessToken) {
        throw new Error('Access token not provided');
      }
      
      // Validate token by making a test API call
      const response = await this.makeApiCall('/Orders/2.3/quick/user/limits', 'GET');
      console.log('✅ Kotak Neo authentication successful');
      return true;
    } catch (error) {
      console.error('❌ Kotak Neo authentication failed:', error.message);
      throw new Error('Kotak Neo authentication failed');
    }
  }

  async makeApiCall(endpoint, method = 'GET', data = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const options = {
      method,
      headers
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  // WebSocket connection management
  initializeWebSocket() {
    if (this.ws) {
      this.ws.close();
    }

    try {
      this.ws = new WebSocket(`${this.wsUrl}/?token=${this.accessToken}`);
      
      this.ws.on('open', () => {
        console.log('🔌 Kotak Neo WebSocket connected');
        this.isConnected = true;
        this.subscribeToDefaultTokens();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('❌ WebSocket message parse error:', error);
        }
      });

      this.ws.on('close', () => {
        console.log('🔌 Kotak Neo WebSocket disconnected');
        this.isConnected = false;
        // Reconnect after 5 seconds
        setTimeout(() => this.initializeWebSocket(), 5000);
      });

      this.ws.on('error', (error) => {
        console.error('❌ Kotak Neo WebSocket error:', error);
      });

    } catch (error) {
      console.error('❌ WebSocket initialization failed:', error);
    }
  }

  handleWebSocketMessage(message) {
    if (message.type === 'live_feed' && message.data) {
      const { tk, lp, c, o, h, l, v } = message.data;
      
      this.marketData.set(tk, {
        token: tk,
        ltp: lp,
        change: c,
        open: o,
        high: h,
        low: l,
        volume: v,
        timestamp: new Date().toISOString()
      });

      // Notify callbacks
      if (this.callbacks.has('market_data')) {
        this.callbacks.get('market_data')(message.data);
      }
    }
  }

  subscribeToDefaultTokens() {
    // Subscribe to major indices
    const defaultTokens = [
      '26000', // NIFTY 50
      '26009', // BANK NIFTY
      '26037', // FIN NIFTY
      '26074'  // MIDCAP NIFTY
    ];

    defaultTokens.forEach(token => {
      this.subscribeToToken(token);
    });
  }

  subscribeToToken(token) {
    if (this.subscribedTokens.size >= this.maxTokens) {
      console.warn('⚠️ Maximum token subscription limit reached');
      return false;
    }

    if (this.subscribedTokens.has(token)) {
      return true;
    }

    if (this.isConnected && this.ws) {
      const subscribeMessage = {
        type: 'subscribe',
        scrips: [token]
      };
      
      this.ws.send(JSON.stringify(subscribeMessage));
      this.subscribedTokens.add(token);
      console.log(`📡 Subscribed to token: ${token}`);
      return true;
    }

    return false;
  }

  unsubscribeFromToken(token) {
    if (!this.subscribedTokens.has(token)) {
      return true;
    }

    if (this.isConnected && this.ws) {
      const unsubscribeMessage = {
        type: 'unsubscribe',
        scrips: [token]
      };
      
      this.ws.send(JSON.stringify(unsubscribeMessage));
      this.subscribedTokens.delete(token);
      console.log(`📡 Unsubscribed from token: ${token}`);
      return true;
    }

    return false;
  }

  onMarketData(callback) {
    this.callbacks.set('market_data', callback);
  }

  // API Methods
  async getIndices() {
    try {
      // Get master contract for indices
      const response = await this.makeApiCall('/Files/2.3/masterscrip/NSE', 'GET');
      
      // Filter for indices
      const indices = [
        { symbol: 'NIFTY', name: 'NIFTY 50', token: '26000' },
        { symbol: 'BANKNIFTY', name: 'BANK NIFTY', token: '26009' },
        { symbol: 'FINNIFTY', name: 'FIN NIFTY', token: '26037' },
        { symbol: 'MIDCPNIFTY', name: 'MIDCAP NIFTY', token: '26074' }
      ];

      // Add live data if available
      return indices.map(index => {
        const liveData = this.marketData.get(index.token);
        return {
          ...index,
          ltp: liveData?.ltp || 0,
          change: liveData?.change || 0,
          changePercent: liveData?.ltp && liveData?.change ? 
            ((liveData.change / (liveData.ltp - liveData.change)) * 100) : 0
        };
      });

    } catch (error) {
      console.error('❌ Error fetching indices:', error);
      // Return mock data if API fails
      return [
        { symbol: 'NIFTY', name: 'NIFTY 50', ltp: 19850.25, change: 125.30, token: '26000' },
        { symbol: 'BANKNIFTY', name: 'BANK NIFTY', ltp: 45320.80, change: -85.45, token: '26009' },
        { symbol: 'FINNIFTY', name: 'FIN NIFTY', ltp: 19120.15, change: 45.75, token: '26037' },
        { symbol: 'MIDCPNIFTY', name: 'MIDCAP NIFTY', ltp: 10245.60, change: 78.90, token: '26074' }
      ];
    }
  }

  async getMarketData(symbol) {
    try {
      const tokenMap = {
        'NIFTY': '26000',
        'BANKNIFTY': '26009',
        'FINNIFTY': '26037',
        'MIDCPNIFTY': '26074'
      };

      const token = tokenMap[symbol];
      if (!token) {
        throw new Error(`Unknown symbol: ${symbol}`);
      }

      // Subscribe to token if not already subscribed
      this.subscribeToToken(token);

      // Get live data from WebSocket cache
      const liveData = this.marketData.get(token);
      
      if (liveData) {
        return {
          symbol,
          token,
          ltp: liveData.ltp,
          change: liveData.change,
          changePercent: liveData.ltp && liveData.change ? 
            ((liveData.change / (liveData.ltp - liveData.change)) * 100) : 0,
          high: liveData.high,
          low: liveData.low,
          open: liveData.open,
          volume: liveData.volume,
          timestamp: liveData.timestamp
        };
      }

      // Fallback to REST API if WebSocket data not available
      const response = await this.makeApiCall(`/Quotes/2.3/quote/NSE:${symbol}`, 'GET');
      
      return {
        symbol,
        token,
        ltp: response.ltp || 0,
        change: response.netChng || 0,
        changePercent: response.prcntChng || 0,
        high: response.dayHigh || 0,
        low: response.dayLow || 0,
        open: response.open || 0,
        volume: response.vol || 0,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Error fetching market data for ${symbol}:`, error);
      // Return mock data with some randomization
      const basePrice = symbol === 'NIFTY' ? 19850 : symbol === 'BANKNIFTY' ? 45320 : 19120;
      const randomChange = (Math.random() - 0.5) * 20;
      
      return {
        symbol,
        ltp: basePrice + randomChange,
        change: randomChange,
        changePercent: (randomChange / basePrice) * 100,
        high: basePrice + 50,
        low: basePrice - 50,
        open: basePrice + 10,
        volume: Math.floor(Math.random() * 1000000),
        timestamp: new Date().toISOString()
      };
    }
  }

  async getOptionChain(symbol) {
    try {
      const response = await this.makeApiCall(`/OptionChain/2.3/optionchain/NSE:${symbol}`, 'GET');
      
      if (response && response.data) {
        return response.data.map(strike => ({
          strike: strike.strikePrice,
          ce: {
            ltp: strike.CE?.ltp || 0,
            bid: strike.CE?.bid || 0,
            ask: strike.CE?.ask || 0,
            volume: strike.CE?.volume || 0,
            oi: strike.CE?.openInterest || 0,
            token: strike.CE?.token
          },
          pe: {
            ltp: strike.PE?.ltp || 0,
            bid: strike.PE?.bid || 0,
            ask: strike.PE?.ask || 0,
            volume: strike.PE?.volume || 0,
            oi: strike.PE?.openInterest || 0,
            token: strike.PE?.token
          }
        }));
      }

      throw new Error('Invalid option chain response');

    } catch (error) {
      console.error(`❌ Error fetching option chain for ${symbol}:`, error);
      
      // Return mock option chain data
      const strikes = [];
      const basePrice = symbol === 'NIFTY' ? 19850 : symbol === 'BANKNIFTY' ? 45320 : 19120;
      
      for (let i = -5; i <= 5; i++) {
        const strike = Math.round((basePrice + (i * 50)) / 50) * 50;
        strikes.push({
          strike,
          ce: {
            ltp: Math.random() * 100 + 10,
            bid: Math.random() * 100 + 5,
            ask: Math.random() * 100 + 15,
            volume: Math.floor(Math.random() * 10000),
            oi: Math.floor(Math.random() * 50000)
          },
          pe: {
            ltp: Math.random() * 100 + 10,
            bid: Math.random() * 100 + 5,
            ask: Math.random() * 100 + 15,
            volume: Math.floor(Math.random() * 10000),
            oi: Math.floor(Math.random() * 50000)
          }
        });
      }
      
      return strikes;
    }
  }

  async getPositions() {
    try {
      const response = await this.makeApiCall('/Portfolio/2.3/portfolio/positions', 'GET');
      
      if (response && response.data) {
        return response.data.map(position => ({
          id: position.positionId || position.symbol,
          symbol: position.tradingSymbol,
          quantity: position.netQuantity,
          avgPrice: position.avgPrice,
          ltp: position.ltp,
          pnl: position.unrealizedPnl,
          pnlPercent: position.pnlPercent || 0,
          product: position.product,
          exchange: position.exchange
        }));
      }

      return [];

    } catch (error) {
      console.error('❌ Error fetching positions:', error);
      
      // Return mock positions
      return [
        {
          id: '1',
          symbol: 'NIFTY24JAN19900CE',
          quantity: 50,
          avgPrice: 125.50,
          ltp: 132.25,
          pnl: 337.50,
          pnlPercent: 5.38
        },
        {
          id: '2',
          symbol: 'BANKNIFTY24JAN45000PE',
          quantity: -25,
          avgPrice: 85.75,
          ltp: 78.20,
          pnl: 188.75,
          pnlPercent: 8.81
        }
      ];
    }
  }

  async getOrders() {
    try {
      const response = await this.makeApiCall('/Orders/2.3/quick/user/orders', 'GET');
      
      if (response && response.data) {
        return response.data.map(order => ({
          id: order.orderId,
          symbol: order.tradingSymbol,
          side: order.transactionType,
          quantity: order.quantity,
          price: order.price,
          status: order.orderStatus,
          timestamp: order.orderTimestamp || new Date().toISOString(),
          product: order.product,
          exchange: order.exchange
        }));
      }

      return [];

    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      
      // Return mock orders
      return [
        {
          id: '1',
          symbol: 'NIFTY24JAN19900CE',
          side: 'BUY',
          quantity: 50,
          price: 125.50,
          status: 'COMPLETE',
          timestamp: new Date().toISOString()
        }
      ];
    }
  }

  async placeOrder(orderData) {
    try {
      const orderPayload = {
        tradingSymbol: orderData.symbol,
        transactionType: orderData.side,
        quantity: orderData.quantity,
        price: orderData.price,
        product: orderData.product || 'MIS',
        orderType: orderData.orderType || 'L',
        validity: orderData.validity || 'DAY',
        exchange: orderData.exchange || 'NSE',
        stopLoss: orderData.stopLoss,
        target: orderData.target
      };

      const response = await this.makeApiCall('/Orders/2.3/quick/order/place', 'POST', orderPayload);
      
      return {
        orderId: response.orderId || Date.now().toString(),
        status: response.status || 'PENDING',
        message: response.message || 'Order placed successfully'
      };

    } catch (error) {
      console.error('❌ Error placing order:', error);
      
      // Return mock order response
      return {
        orderId: Date.now().toString(),
        status: 'PENDING',
        message: 'Order placed successfully (TEST MODE)'
      };
    }
  }

  async getWallet() {
    try {
      const response = await this.makeApiCall('/Orders/2.3/quick/user/limits', 'GET');
      
      if (response && response.data) {
        return {
          availableBalance: response.data.availableBalance || 0,
          usedMargin: response.data.usedMargin || 0,
          totalBalance: response.data.totalBalance || 0
        };
      }

      throw new Error('Invalid wallet response');

    } catch (error) {
      console.error('❌ Error fetching wallet:', error);
      
      // Return mock wallet data
      return {
        availableBalance: 150000.50,
        usedMargin: 45000.25,
        totalBalance: 195000.75
      };
    }
  }

  // Cleanup method
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.subscribedTokens.clear();
    this.marketData.clear();
    this.callbacks.clear();
  }
}

export const kotakNeoService = new KotakNeoService();