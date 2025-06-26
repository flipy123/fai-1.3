import fs from 'fs';
import path from 'path';

class MasterDataService {
  constructor() {
    this.baseUrl = process.env.KOTAK_NEO_BASE_URL;
    this.accessToken = process.env.KOTAK_NEO_ACCESS_TOKEN;
    this.dataPath = './data';
    this.masterDataFile = path.join(this.dataPath, 'master_data.json');
    this.lastDownloadFile = path.join(this.dataPath, 'last_download.json');
    
    // Ensure data directory exists
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
    }
    
    this.masterData = null;
    this.optionsData = new Map();
    this.instrumentTokens = new Map();
  }

  async initialize() {
    try {
      await this.loadMasterData();
      console.log('✅ Master Data Service initialized');
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
      const exchanges = ['NSE', 'NFO']; // NSE for indices, NFO for options
      const allData = {};

      for (const exchange of exchanges) {
        const response = await fetch(`${this.baseUrl}/Files/2.3/masterscrip/${exchange}`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch ${exchange} master data: ${response.status}`);
        }

        const data = await response.json();
        allData[exchange] = data;
        console.log(`✅ Downloaded ${exchange} master data: ${data.length || 0} instruments`);
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
        throw new Error('No cached master data found');
      }
    } catch (error) {
      console.error('❌ Failed to load cached data:', error);
      this.masterData = { NSE: [], NFO: [] }; // Empty fallback
    }
  }

  processMasterData() {
    if (!this.masterData) return;

    // Process NSE data for indices
    if (this.masterData.NSE) {
      this.masterData.NSE.forEach(instrument => {
        if (this.isIndex(instrument.tradingSymbol)) {
          this.instrumentTokens.set(instrument.tradingSymbol, {
            token: instrument.token,
            symbol: instrument.tradingSymbol,
            name: instrument.companyName || instrument.tradingSymbol,
            exchange: 'NSE',
            lotSize: instrument.lotSize || 1
          });
        }
      });
    }

    // Process NFO data for options
    if (this.masterData.NFO) {
      const optionsByUnderlying = new Map();

      this.masterData.NFO.forEach(instrument => {
        if (this.isOption(instrument)) {
          const underlying = this.getUnderlyingFromOption(instrument.tradingSymbol);
          
          if (!optionsByUnderlying.has(underlying)) {
            optionsByUnderlying.set(underlying, []);
          }

          optionsByUnderlying.get(underlying).push({
            token: instrument.token,
            symbol: instrument.tradingSymbol,
            underlying: underlying,
            strike: this.extractStrike(instrument.tradingSymbol),
            optionType: this.getOptionType(instrument.tradingSymbol),
            expiry: instrument.expiry,
            lotSize: instrument.lotSize || 1,
            tickSize: instrument.tickSize || 0.05
          });
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
    }

    console.log(`📊 Processed master data:`);
    console.log(`   - Indices: ${this.instrumentTokens.size}`);
    console.log(`   - Option chains: ${this.optionsData.size}`);
  }

  isIndex(symbol) {
    const indices = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'SENSEX', 'BANKEX'];
    return indices.some(index => symbol.includes(index));
  }

  isOption(instrument) {
    return instrument.tradingSymbol && 
           (instrument.tradingSymbol.includes('CE') || instrument.tradingSymbol.includes('PE')) &&
           instrument.expiry;
  }

  getUnderlyingFromOption(symbol) {
    // Extract underlying from option symbol
    // e.g., "NIFTY24JAN19900CE" -> "NIFTY"
    const match = symbol.match(/^([A-Z]+)/);
    return match ? match[1] : null;
  }

  extractStrike(symbol) {
    // Extract strike price from option symbol
    // e.g., "NIFTY24JAN19900CE" -> 19900
    const match = symbol.match(/(\d+)(CE|PE)$/);
    return match ? parseInt(match[1]) : 0;
  }

  getOptionType(symbol) {
    return symbol.endsWith('CE') ? 'CE' : 'PE';
  }

  // Public methods
  getIndexToken(symbol) {
    return this.instrumentTokens.get(symbol);
  }

  getAllIndices() {
    return Array.from(this.instrumentTokens.values());
  }

  getOptionsForUnderlying(underlying, nearestExpiry = true) {
    const options = this.optionsData.get(underlying) || [];
    
    if (!nearestExpiry) {
      return options;
    }

    // Get only nearest expiry options
    if (options.length === 0) return [];
    
    const nearestExpiryDate = options[0].expiry;
    return options.filter(option => option.expiry === nearestExpiryDate);
  }

  getOptionChainStrikes(underlying, atmStrike, range = 10) {
    const options = this.getOptionsForUnderlying(underlying);
    
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
    const indexToken = this.getIndexToken(underlying);
    if (indexToken) {
      tokens.push(indexToken.token);
    }

    // Add option tokens
    strikes.forEach(strike => {
      if (strike.ce) tokens.push(strike.ce.token);
      if (strike.pe) tokens.push(strike.pe.token);
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

    // Download fresh data
    await this.loadMasterData();
  }

  // Get statistics
  getStats() {
    return {
      indices: this.instrumentTokens.size,
      optionChains: this.optionsData.size,
      lastDownload: this.getLastDownloadDate(),
      totalOptions: Array.from(this.optionsData.values()).reduce((sum, options) => sum + options.length, 0)
    };
  }
}

export const masterDataService = new MasterDataService();