import fs from 'fs';
import path from 'path';

class MasterDataService {
  constructor() {
    this.baseUrl = process.env.KOTAK_NEO_BASE_URL || 'https://gw-napi.kotaksecurities.com';
    this.accessToken = process.env.KOTAK_NEO_ACCESS_TOKEN;
    this.dataPath = './data';
    this.masterDataFile = path.join(this.dataPath, 'master_data.json');
    this.lastDownloadFile = path.join(this.dataPath, 'last_download.json');
    
    // Ensure data directory exists
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
    }
    
    this.masterData = null;
    this.indicesData = new Map();
    this.optionsData = new Map();
    this.instrumentTokens = new Map();
    
    console.log('📂 Master Data Service initialized');
  }

  async initialize() {
    try {
      await this.loadMasterData();
      console.log('✅ Master Data Service ready');
    } catch (error) {
      console.error('❌ Master Data Service initialization failed:', error);
    }
  }

  async loadMasterData() {
    const today = new Date().toDateString();
    const lastDownload = this.getLastDownloadDate();

    // Check if we need to download fresh data
    if (lastDownload !== today || !fs.existsSync(this.masterDataFile)) {
      console.log('📥 Downloading fresh master data...');
      await this.downloadMasterData();
    } else {
      console.log('📂 Loading cached master data...');
      this.loadCachedData();
    }

    this.processMasterData();
  }

  getLastDownloadDate() {
    try {
      if (fs.existsSync(this.lastDownloadFile)) {
        const data = JSON.parse(fs.readFileSync(this.lastDownloadFile, 'utf8'));
        return data.date;
      }
    } catch (error) {
      console.error('Error reading last download date:', error);
    }
    return null;
  }

  async downloadMasterData() {
    try {
      if (!this.accessToken) {
        throw new Error('Access token not available');
      }

      const exchanges = ['NSE', 'NFO']; // NSE for indices, NFO for options
      const allData = {};

      for (const exchange of exchanges) {
        try {
          console.log(`📡 Downloading ${exchange} master data...`);
          
          const response = await fetch(`${this.baseUrl}/Files/2.3/masterscrip/${exchange}`, {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch ${exchange} master data: ${response.status}`);
          }

          const data = await response.json();
          allData[exchange] = Array.isArray(data) ? data : (data.data || []);
          
          console.log(`✅ Downloaded ${exchange} master data: ${allData[exchange].length} instruments`);
        } catch (error) {
          console.error(`❌ Failed to download ${exchange} data:`, error);
          allData[exchange] = [];
        }
      }

      // Save to file
      fs.writeFileSync(this.masterDataFile, JSON.stringify(allData, null, 2));
      
      // Update last download date
      fs.writeFileSync(this.lastDownloadFile, JSON.stringify({
        date: new Date().toDateString(),
        timestamp: new Date().toISOString()
      }));

      this.masterData = allData;
      console.log('💾 Master data saved to cache');

    } catch (error) {
      console.error('❌ Failed to download master data:', error);
      // Try to load cached data as fallback
      this.loadCachedData();
    }
  }

  loadCachedData() {
    try {
      if (fs.existsSync(this.masterDataFile)) {
        const data = fs.readFileSync(this.masterDataFile, 'utf8');
        this.masterData = JSON.parse(data);
        console.log('✅ Loaded cached master data');
      } else {
        console.log('⚠️ No cached master data found, using defaults');
        this.masterData = { NSE: [], NFO: [] };
      }
    } catch (error) {
      console.error('❌ Failed to load cached data:', error);
      this.masterData = { NSE: [], NFO: [] };
    }
  }

  processMasterData() {
    if (!this.masterData) return;

    console.log('🔄 Processing master data...');

    // Process NSE data for indices only
    if (this.masterData.NSE && Array.isArray(this.masterData.NSE)) {
      let indicesCount = 0;
      
      this.masterData.NSE.forEach(instrument => {
        if (this.isIndex(instrument.tradingSymbol || instrument.symbol)) {
          const symbol = instrument.tradingSymbol || instrument.symbol;
          const token = instrument.token || instrument.instrumentToken;
          
          this.indicesData.set(symbol, {
            token: token,
            symbol: symbol,
            name: instrument.companyName || instrument.name || symbol,
            exchange: 'NSE',
            lotSize: instrument.lotSize || 1,
            tickSize: instrument.tickSize || 0.05
          });
          
          this.instrumentTokens.set(symbol, token);
          indicesCount++;
        }
      });
      
      console.log(`📊 Processed ${indicesCount} indices from NSE data`);
    }

    // Process NFO data for options only
    if (this.masterData.NFO && Array.isArray(this.masterData.NFO)) {
      const optionsByUnderlying = new Map();
      let optionsCount = 0;

      this.masterData.NFO.forEach(instrument => {
        if (this.isOption(instrument)) {
          const symbol = instrument.tradingSymbol || instrument.symbol;
          const underlying = this.getUnderlyingFromOption(symbol);
          
          // Only process options for our supported indices
          if (this.isSupportedUnderlying(underlying)) {
            if (!optionsByUnderlying.has(underlying)) {
              optionsByUnderlying.set(underlying, []);
            }

            optionsByUnderlying.get(underlying).push({
              token: instrument.token || instrument.instrumentToken,
              symbol: symbol,
              underlying: underlying,
              strike: this.extractStrike(symbol),
              optionType: this.getOptionType(symbol),
              expiry: instrument.expiry || instrument.expiryDate,
              lotSize: instrument.lotSize || 1,
              tickSize: instrument.tickSize || 0.05
            });
            
            optionsCount++;
          }
        }
      });

      // Sort options by expiry and strike
      optionsByUnderlying.forEach((options, underlying) => {
        options.sort((a, b) => {
          // First by expiry (nearest first)
          const expiryDiff = new Date(a.expiry) - new Date(b.expiry);
          if (expiryDiff !== 0) return expiryDiff;
          
          // Then by strike
          return a.strike - b.strike;
        });

        this.optionsData.set(underlying, options);
      });

      console.log(`📈 Processed ${optionsCount} options for ${optionsByUnderlying.size} underlyings`);
    }

    console.log(`📋 Master data processing complete:`);
    console.log(`   - Indices: ${this.indicesData.size}`);
    console.log(`   - Option chains: ${this.optionsData.size}`);
  }

  isIndex(symbol) {
    if (!symbol) return false;
    const indices = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'SENSEX', 'BANKEX'];
    return indices.some(index => symbol.toUpperCase().includes(index));
  }

  isOption(instrument) {
    const symbol = instrument.tradingSymbol || instrument.symbol || '';
    return symbol && 
           (symbol.includes('CE') || symbol.includes('PE')) &&
           (instrument.expiry || instrument.expiryDate) &&
           (instrument.instrumentType === 'OPTIDX' || symbol.match(/\d+(CE|PE)$/));
  }

  isSupportedUnderlying(underlying) {
    const supported = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY'];
    return supported.includes(underlying);
  }

  getUnderlyingFromOption(symbol) {
    if (!symbol) return null;
    
    // Extract underlying from option symbol
    // e.g., "NIFTY24JAN19900CE" -> "NIFTY"
    const match = symbol.match(/^([A-Z]+)/);
    return match ? match[1] : null;
  }

  extractStrike(symbol) {
    if (!symbol) return 0;
    
    // Extract strike price from option symbol
    // e.g., "NIFTY24JAN19900CE" -> 19900
    const match = symbol.match(/(\d+)(CE|PE)$/);
    return match ? parseInt(match[1]) : 0;
  }

  getOptionType(symbol) {
    if (!symbol) return 'CE';
    return symbol.endsWith('CE') ? 'CE' : 'PE';
  }

  // Public methods
  getAllIndices() {
    const indices = Array.from(this.indicesData.values());
    
    // If no indices from master data, return defaults
    if (indices.length === 0) {
      return [
        { symbol: 'NIFTY', name: 'NIFTY 50', token: '26000', exchange: 'NSE' },
        { symbol: 'BANKNIFTY', name: 'BANK NIFTY', token: '26009', exchange: 'NSE' },
        { symbol: 'FINNIFTY', name: 'FIN NIFTY', token: '26037', exchange: 'NSE' },
        { symbol: 'MIDCPNIFTY', name: 'MIDCAP NIFTY', token: '26074', exchange: 'NSE' }
      ];
    }
    
    return indices;
  }

  getIndexToken(symbol) {
    return this.indicesData.get(symbol);
  }

  getOptionsForUnderlying(underlying, nearestExpiry = true) {
    const options = this.optionsData.get(underlying) || [];
    
    if (!nearestExpiry || options.length === 0) {
      return options;
    }

    // Get only nearest expiry options
    const nearestExpiryDate = options[0].expiry;
    return options.filter(option => option.expiry === nearestExpiryDate);
  }

  getOptionChainStrikes(underlying, atmStrike, range = 10) {
    const options = this.getOptionsForUnderlying(underlying);
    
    if (options.length === 0) {
      return [];
    }
    
    // Filter strikes around ATM
    const minStrike = atmStrike - (range * 50);
    const maxStrike = atmStrike + (range * 50);
    
    const filteredOptions = options.filter(option => 
      option.strike >= minStrike && option.strike <= maxStrike
    );

    // Group by strike
    const strikeMap = new Map();
    filteredOptions.forEach(option => {
      if (!strikeMap.has(option.strike)) {
        strikeMap.set(option.strike, { strike: option.strike, ce: null, pe: null });
      }
      
      const strike = strikeMap.get(option.strike);
      if (option.optionType === 'CE') {
        strike.ce = option;
      } else {
        strike.pe = option;
      }
    });

    return Array.from(strikeMap.values()).sort((a, b) => a.strike - b.strike);
  }

  getTokensForSubscription(underlying, atmStrike, range = 5) {
    const strikes = this.getOptionChainStrikes(underlying, atmStrike, range);
    const tokens = [];

    // Add index token
    const indexData = this.getIndexToken(underlying);
    if (indexData && indexData.token) {
      tokens.push(indexData.token);
    }

    // Add option tokens
    strikes.forEach(strike => {
      if (strike.ce && strike.ce.token) tokens.push(strike.ce.token);
      if (strike.pe && strike.pe.token) tokens.push(strike.pe.token);
    });

    return tokens.slice(0, 200); // Respect Kotak's 200 token limit
  }

  // Force refresh master data
  async forceRefresh() {
    console.log('🔄 Force refreshing master data...');
    
    // Delete cached files
    if (fs.existsSync(this.masterDataFile)) {
      fs.unlinkSync(this.masterDataFile);
    }
    if (fs.existsSync(this.lastDownloadFile)) {
      fs.unlinkSync(this.lastDownloadFile);
    }

    // Clear in-memory data
    this.indicesData.clear();
    this.optionsData.clear();
    this.instrumentTokens.clear();

    // Download fresh data
    await this.loadMasterData();
  }

  // Get statistics
  getStats() {
    return {
      indices: this.indicesData.size,
      optionChains: this.optionsData.size,
      lastDownload: this.getLastDownloadDate(),
      totalOptions: Array.from(this.optionsData.values()).reduce((sum, options) => sum + options.length, 0),
      supportedIndices: Array.from(this.indicesData.keys())
    };
  }
}

export const masterDataService = new MasterDataService();