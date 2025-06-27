import WebSocket from 'ws';

class KotakNeoService {
  constructor() {
    this.baseUrl = process.env.KOTAK_NEO_BASE_URL || 'https://gw-napi.kotaksecurities.com';
    this.wsUrl = process.env.KOTAK_NEO_WS_URL || 'wss://mlhsi.kotaksecurities.com';
    this.accessToken = process.env.KOTAK_NEO_ACCESS_TOKEN;
    this.consumerKey = process.env.KOTAK_NEO_CONSUMER_KEY;
    this.consumerSecret = process.env.KOTAK_NEO_CONSUMER_SECRET;
    this.userId = process.env.KOTAK_NEO_USER_ID;
    this.clientId = process.env.KOTAK_NEO_CLIENT_ID;
    this.mobile = process.env.KOTAK_NEO_MOBILE;
    
    this.ws = null;
    this.isConnected = false;
    this.subscribedTokens = new Set();
    this.maxTokens = 200;
    this.marketData = new Map();
    this.callbacks = new Map();
    this.sessionToken = null;
    this.isAuthenticated = false;
    
    console.log('🔧 KotakNeoService initialized');
    this.authenticate();
  }

  // Step 1: Authentication with Kotak Neo
  async authenticate() {
    try {
      console.log('🔐 Starting Kotak Neo authentication...');
      
      if (!this.accessToken) {
        throw new Error('Access token not provided in environment variables');
      }

      // Test the access token by making a simple API call
      const response = await this.makeApiCall('/Orders/2.3/quick/user/limits', 'GET');
      
      if (response) {
        this.isAuthenticated = true;
        console.log('✅ Kotak Neo authentication successful');
        this.initializeWebSocket();
        return true;
      }
      
    } catch (error) {
      console.error('❌ Kotak Neo authentication failed:', error.message);
      this.isAuthenticated = false;
      
      // If access token is expired, we need manual intervention
      if (error.message.includes('401') || error.message.includes('403')) {
        console.log('🔄 Access token may be expired. Please regenerate token manually.');
        console.log('📋 Steps to regenerate token:');
        console.log('1. Visit Kotak Neo API portal');
        console.log('2. Login with your credentials');
        console.log('3. Generate new access token');
        console.log('4. Update KOTAK_NEO_ACCESS_TOKEN in .env file');
      }
      
      return false;
    }
  }

  async makeApiCall(endpoint, method = 'GET', data = null) {
    if (!this.isAuthenticated && !endpoint.includes('/oauth2/')) {
      throw new Error('Not authenticated with Kotak Neo API');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'FAi-3.0-Trading-System'
    };

    const options = {
      method,
      headers
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    console.log(`📡 API Call: ${method} ${endpoint}`);

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status} - ${errorText}`);
      throw new Error(`Kotak API call failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ API Success: ${endpoint}`);
    return result;
  }

  // WebSocket connection for live data
  initializeWebSocket() {
    if (!this.isAuthenticated) {
      console.log('⚠️ Cannot initialize WebSocket - not authenticated');
      return;
    }

    if (this.ws) {
      this.ws.close();
    }

    try {
      // Kotak Neo WebSocket URL format
      const wsUrl = `${this.wsUrl}/?token=${this.accessToken}`;
      console.log('🔌 Connecting to Kotak Neo WebSocket...');
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.on('open', () => {
        console.log('✅ Kotak Neo WebSocket connected');
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

      this.ws.on('close', (code, reason) => {
        console.log(`🔌 WebSocket disconnected: ${code} - ${reason}`);
        this.isConnected = false;
        
        // Reconnect after 5 seconds if authenticated
        if (this.isAuthenticated) {
          setTimeout(() => this.initializeWebSocket(), 5000);
        }
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        this.isConnected = false;
      });

    } catch (error) {
      console.error('❌ WebSocket initialization failed:', error);
    }
  }

  handleWebSocketMessage(message) {
    // Handle different message types from Kotak Neo WebSocket
    if (message.type === 'live_feed' && message.data) {
      const { tk, lp, c, o, h, l, v, ltt } = message.data;
      
      const marketData = {
        token: tk,
        ltp: parseFloat(lp) || 0,
        change: parseFloat(c) || 0,
        open: parseFloat(o) || 0,
        high: parseFloat(h) || 0,
        low: parseFloat(l) || 0,
        volume: parseInt(v) || 0,
        lastTradeTime: ltt,
        timestamp: new Date().toISOString()
      };

      this.marketData.set(tk, marketData);

      // Notify callbacks
      if (this.callbacks.has('market_data')) {
        this.callbacks.get('market_data')(marketData);
      }
    }
  }

  subscribeToDefaultTokens() {
    // Subscribe to major indices - these are standard NSE tokens
    const defaultTokens = [
      '26000', // NIFTY 50
      '26009', // BANK NIFTY  
      '26037', // FIN NIFTY
      '26074'  // MIDCAP NIFTY
    ];

    console.log('📡 Subscribing to default index tokens...');
    defaultTokens.forEach(token => {
      this.subscribeToToken(token);
    });
  }

  subscribeToToken(token) {
    if (!this.isConnected || !this.ws) {
      console.log(`⚠️ Cannot subscribe to ${token} - WebSocket not connected`);
      return false;
    }

    if (this.subscribedTokens.size >= this.maxTokens) {
      console.warn('⚠️ Maximum token subscription limit reached');
      return false;
    }

    if (this.subscribedTokens.has(token)) {
      return true;
    }

    try {
      const subscribeMessage = {
        type: 'subscribe',
        scrips: [token]
      };
      
      this.ws.send(JSON.stringify(subscribeMessage));
      this.subscribedTokens.add(token);
      console.log(`✅ Subscribed to token: ${token}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to subscribe to token ${token}:`, error);
      return false;
    }
  }

  unsubscribeFromToken(token) {
    if (!this.isConnected || !this.ws) {
      return true;
    }

    if (!this.subscribedTokens.has(token)) {
      return true;
    }

    try {
      const unsubscribeMessage = {
        type: 'unsubscribe',
        scrips: [token]
      };
      
      this.ws.send(JSON.stringify(unsubscribeMessage));
      this.subscribedTokens.delete(token);
      console.log(`✅ Unsubscribed from token: ${token}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to unsubscribe from token ${token}:`, error);
      return false;
    }
  }

  onMarketData(callback) {
    this.callbacks.set('market_data', callback);
  }

  // API Methods according to Kotak Neo documentation
  async getIndices() {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Not authenticated');
      }

      // Get live quotes for indices
      const indices = [
        { symbol: 'NIFTY', name: 'NIFTY 50', token: '26000', exchange: 'NSE' },
        { symbol: 'BANKNIFTY', name: 'BANK NIFTY', token: '26009', exchange: 'NSE' },
        { symbol: 'FINNIFTY', name: 'FIN NIFTY', token: '26037', exchange: 'NSE' },
        { symbol: 'MIDCPNIFTY', name: 'MIDCAP NIFTY', token: '26074', exchange: 'NSE' }
      ];

      // Get live data for each index
      const indicesWithData = await Promise.all(
        indices.map(async (index) => {
          try {
            const liveData = this.marketData.get(index.token);
            if (liveData) {
              return {
                ...index,
                ltp: liveData.ltp,
                change: liveData.change,
                changePercent: liveData.ltp && liveData.change ? 
                  ((liveData.change / (liveData.ltp - liveData.change)) * 100) : 0,
                high: liveData.high,
                low: liveData.low,
                volume: liveData.volume
              };
            }
            
            // Fallback to REST API if WebSocket data not available
            const quoteResponse = await this.makeApiCall(`/Quotes/2.3/quote/NSE:${index.symbol}`, 'GET');
            
            return {
              ...index,
              ltp: parseFloat(quoteResponse.ltp) || 0,
              change: parseFloat(quoteResponse.netChng) || 0,
              changePercent: parseFloat(quoteResponse.prcntChng) || 0,
              high: parseFloat(quoteResponse.dayHigh) || 0,
              low: parseFloat(quoteResponse.dayLow) || 0,
              volume: parseInt(quoteResponse.vol) || 0
            };
          } catch (error) {
            console.error(`Error fetching data for ${index.symbol}:`, error);
            return {
              ...index,
              ltp: 0,
              change: 0,
              changePercent: 0,
              high: 0,
              low: 0,
              volume: 0
            };
          }
        })
      );

      return indicesWithData;

    } catch (error) {
      console.error('❌ Error fetching indices:', error);
      
      // Return default indices structure if API fails
      return [
        { symbol: 'NIFTY', name: 'NIFTY 50', ltp: 0, change: 0, changePercent: 0, token: '26000' },
        { symbol: 'BANKNIFTY', name: 'BANK NIFTY', ltp: 0, change: 0, changePercent: 0, token: '26009' },
        { symbol: 'FINNIFTY', name: 'FIN NIFTY', ltp: 0, change: 0, changePercent: 0, token: '26037' },
        { symbol: 'MIDCPNIFTY', name: 'MIDCAP NIFTY', ltp: 0, change: 0, changePercent: 0, token: '26074' }
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

      // Fallback to REST API
      const response = await this.makeApiCall(`/Quotes/2.3/quote/NSE:${symbol}`, 'GET');
      
      return {
        symbol,
        token,
        ltp: parseFloat(response.ltp) || 0,
        change: parseFloat(response.netChng) || 0,
        changePercent: parseFloat(response.prcntChng) || 0,
        high: parseFloat(response.dayHigh) || 0,
        low: parseFloat(response.dayLow) || 0,
        open: parseFloat(response.open) || 0,
        volume: parseInt(response.vol) || 0,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Error fetching market data for ${symbol}:`, error);
      throw error;
    }
  }

  async getOptionChain(symbol) {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Not authenticated');
      }

      // Use the correct endpoint for option chain
      const response = await this.makeApiCall(`/OptionChain/2.3/optionchain/NSE:${symbol}`, 'GET');
      
      if (response && response.data && Array.isArray(response.data)) {
        return response.data.map(strike => ({
          strike: parseFloat(strike.strikePrice) || 0,
          ce: {
            ltp: parseFloat(strike.CE?.ltp) || 0,
            bid: parseFloat(strike.CE?.bid) || 0,
            ask: parseFloat(strike.CE?.ask) || 0,
            volume: parseInt(strike.CE?.volume) || 0,
            oi: parseInt(strike.CE?.openInterest) || 0,
            token: strike.CE?.token || null
          },
          pe: {
            ltp: parseFloat(strike.PE?.ltp) || 0,
            bid: parseFloat(strike.PE?.bid) || 0,
            ask: parseFloat(strike.PE?.ask) || 0,
            volume: parseInt(strike.PE?.volume) || 0,
            oi: parseInt(strike.PE?.openInterest) || 0,
            token: strike.PE?.token || null
          }
        }));
      }

      // If no data, return empty array
      return [];

    } catch (error) {
      console.error(`❌ Error fetching option chain for ${symbol}:`, error);
      
      // Return mock option chain for development
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
            oi: Math.floor(Math.random() * 50000),
            token: null
          },
          pe: {
            ltp: Math.random() * 100 + 10,
            bid: Math.random() * 100 + 5,
            ask: Math.random() * 100 + 15,
            volume: Math.floor(Math.random() * 10000),
            oi: Math.floor(Math.random() * 50000),
            token: null
          }
        });
      }
      
      return strikes;
    }
  }

  async getPositions() {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Not authenticated');
      }

      const response = await this.makeApiCall('/Portfolio/2.3/portfolio/positions', 'GET');
      
      if (response && response.data && Array.isArray(response.data)) {
        return response.data.map(position => ({
          id: position.positionId || position.tradingSymbol || Date.now().toString(),
          symbol: position.tradingSymbol || 'Unknown',
          quantity: parseInt(position.netQuantity) || 0,
          avgPrice: parseFloat(position.avgPrice) || 0,
          ltp: parseFloat(position.ltp) || 0,
          pnl: parseFloat(position.unrealizedPnl) || 0,
          pnlPercent: parseFloat(position.pnlPercent) || 0,
          product: position.product || 'MIS',
          exchange: position.exchange || 'NSE'
        }));
      }

      return [];

    } catch (error) {
      console.error('❌ Error fetching positions:', error);
      return [];
    }
  }

  async getOrders() {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Not authenticated');
      }

      const response = await this.makeApiCall('/Orders/2.3/quick/user/orders', 'GET');
      
      if (response && response.data && Array.isArray(response.data)) {
        return response.data.map(order => ({
          id: order.orderId || Date.now().toString(),
          symbol: order.tradingSymbol || 'Unknown',
          side: order.transactionType || 'BUY',
          quantity: parseInt(order.quantity) || 0,
          price: parseFloat(order.price) || 0,
          status: order.orderStatus || 'PENDING',
          timestamp: order.orderTimestamp || new Date().toISOString(),
          product: order.product || 'MIS',
          exchange: order.exchange || 'NSE'
        }));
      }

      return [];

    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      return [];
    }
  }

  async placeOrder(orderData) {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Not authenticated');
      }

      const orderPayload = {
        tradingSymbol: orderData.symbol,
        transactionType: orderData.side,
        quantity: orderData.quantity.toString(),
        price: orderData.price.toString(),
        product: orderData.product || 'MIS',
        orderType: orderData.orderType || 'L',
        validity: orderData.validity || 'DAY',
        exchange: orderData.exchange || 'NSE'
      };

      // Add stop loss and target if provided
      if (orderData.stopLoss) {
        orderPayload.stopLoss = orderData.stopLoss.toString();
      }
      if (orderData.target) {
        orderPayload.target = orderData.target.toString();
      }

      const response = await this.makeApiCall('/Orders/2.3/quick/order/place', 'POST', orderPayload);
      
      return {
        orderId: response.orderId || Date.now().toString(),
        status: response.status || 'PENDING',
        message: response.message || 'Order placed successfully'
      };

    } catch (error) {
      console.error('❌ Error placing order:', error);
      throw error;
    }
  }

  async getWallet() {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Not authenticated');
      }

      const response = await this.makeApiCall('/Orders/2.3/quick/user/limits', 'GET');
      
      if (response && response.data) {
        return {
          availableBalance: parseFloat(response.data.availableBalance) || 0,
          usedMargin: parseFloat(response.data.usedMargin) || 0,
          totalBalance: parseFloat(response.data.totalBalance) || 0
        };
      }

      // Return default wallet if no data
      return {
        availableBalance: 0,
        usedMargin: 0,
        totalBalance: 0
      };

    } catch (error) {
      console.error('❌ Error fetching wallet:', error);
      
      // Return mock wallet for development
      return {
        availableBalance: 150000.50,
        usedMargin: 45000.25,
        totalBalance: 195000.75
      };
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isAuthenticated: this.isAuthenticated,
      isConnected: this.isConnected,
      subscribedTokens: this.subscribedTokens.size,
      maxTokens: this.maxTokens
    };
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
    console.log('🔌 Kotak Neo service disconnected');
  }
}

export const kotakNeoService = new KotakNeoService();