import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { createReadStream } from 'fs';
import fetch from 'node-fetch';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UsageAnalyzer {
  constructor() {
    this.pricingCache = null;
    this.pricingCacheTime = null;
    this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    this.LITELLM_PRICING_URL = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';
  }

  async getCredentials() {
    try {
      const homeDir = process.env.HOME || os.homedir();
      const credentialsPath = path.join(homeDir, '.claude', '.credentials.json');
      const credentialsContent = await fs.readFile(credentialsPath, 'utf8');
      const credentials = JSON.parse(credentialsContent);
      return credentials;
    } catch (error) {
      console.error('Failed to read credentials:', error);
      return null;
    }
  }

  async getPricing() {
    const now = Date.now();
    
    // Check if cache is valid
    if (this.pricingCache && this.pricingCacheTime && (now - this.pricingCacheTime < this.CACHE_DURATION)) {
      return this.pricingCache;
    }

    try {
      // Fetch new pricing data from LiteLLM
      const response = await fetch(this.LITELLM_PRICING_URL);
      if (response.ok) {
        const data = await response.json();
        this.pricingCache = this.processPricingData(data);
        this.pricingCacheTime = now;
        
        // Save to local cache file
        const cacheFile = path.join(__dirname, '.pricing-cache.json');
        await fs.writeFile(cacheFile, JSON.stringify({
          data: this.pricingCache,
          timestamp: now
        }), 'utf8');
        
        return this.pricingCache;
      }
    } catch (error) {
      console.error('Failed to fetch pricing data:', error);
    }

    // Try to load from local cache if fetch fails
    try {
      const cacheFile = path.join(__dirname, '.pricing-cache.json');
      const cached = JSON.parse(await fs.readFile(cacheFile, 'utf8'));
      this.pricingCache = cached.data;
      this.pricingCacheTime = cached.timestamp;
      return this.pricingCache;
    } catch (error) {
      console.error('Failed to load cached pricing:', error);
      return this.getDefaultPricing();
    }
  }

  processPricingData(rawData) {
    const processed = {};
    
    // Process LiteLLM pricing format
    for (const [model, info] of Object.entries(rawData)) {
      if (info.input_cost_per_token && info.output_cost_per_token) {
        processed[model] = {
          inputCostPerToken: parseFloat(info.input_cost_per_token),
          outputCostPerToken: parseFloat(info.output_cost_per_token),
          // LiteLLM uses underscored field names for cache pricing
          cacheCreationCostPerToken: info.cache_creation_input_token_cost ? 
            parseFloat(info.cache_creation_input_token_cost) : undefined,
          cacheReadCostPerToken: info.cache_read_input_token_cost ? 
            parseFloat(info.cache_read_input_token_cost) : undefined,
          maxTokens: info.max_tokens || 4096,
          provider: info.litellm_provider || 'unknown'
        };
      }
    }
    
    return processed;
  }

  getDefaultPricing() {
    // Fallback pricing for common models
    return {
      'claude-3-opus-20240229': {
        inputCostPerToken: 0.000015,
        outputCostPerToken: 0.000075,
        cacheCreationCostPerToken: 0.00001875,  // 1.25x input
        cacheReadCostPerToken: 0.0000015,       // 0.1x input
        maxTokens: 200000
      },
      'claude-3-sonnet-20240229': {
        inputCostPerToken: 0.000003,
        outputCostPerToken: 0.000015,
        cacheCreationCostPerToken: 0.00000375,  // 1.25x input
        cacheReadCostPerToken: 0.0000003,       // 0.1x input
        maxTokens: 200000
      },
      'claude-3-haiku-20240307': {
        inputCostPerToken: 0.00000025,
        outputCostPerToken: 0.00000125,
        cacheCreationCostPerToken: 0.0000003125, // 1.25x input
        cacheReadCostPerToken: 0.000000025,      // 0.1x input
        maxTokens: 200000
      },
      'claude-3-5-sonnet-20241022': {
        inputCostPerToken: 0.000003,
        outputCostPerToken: 0.000015,
        cacheCreationCostPerToken: 0.00000375,  // 1.25x input
        cacheReadCostPerToken: 0.0000003,       // 0.1x input
        maxTokens: 200000
      },
      'claude-opus-4-1-20250805': {
        inputCostPerToken: 0.000015,
        outputCostPerToken: 0.000075,
        cacheCreationCostPerToken: 0.00001875,  // 1.25x input
        cacheReadCostPerToken: 0.0000015,       // 0.1x input
        maxTokens: 200000
      },
      'claude-sonnet-4-20250514': {
        inputCostPerToken: 0.000003,
        outputCostPerToken: 0.000015,
        cacheCreationCostPerToken: 0.00000375,  // 1.25x input
        cacheReadCostPerToken: 0.0000003,       // 0.1x input
        maxTokens: 200000
      },
      'gpt-4': {
        inputCostPerToken: 0.00003,
        outputCostPerToken: 0.00006,
        maxTokens: 8192
      },
      'gpt-4-turbo': {
        inputCostPerToken: 0.00001,
        outputCostPerToken: 0.00003,
        maxTokens: 128000
      },
      'gpt-3.5-turbo': {
        inputCostPerToken: 0.0000005,
        outputCostPerToken: 0.0000015,
        maxTokens: 16385
      }
    };
  }

  async getClaudeDataPath() {
    const homeDir = process.env.HOME || os.homedir();
    const possiblePaths = [
      path.join(homeDir, '.config', 'claude'),  // New XDG standard path (priority)
      path.join(homeDir, '.claude'),  // Old path for compatibility
      path.join(homeDir, 'Library', 'Application Support', 'Claude')  // macOS path
    ];

    // Check for environment variable override
    if (process.env.CLAUDE_CONFIG_DIR) {
      const envPaths = process.env.CLAUDE_CONFIG_DIR.split(',').map(p => p.trim());
      possiblePaths.unshift(...envPaths);
    }

    for (const dir of possiblePaths) {
      try {
        const projectsPath = path.join(dir, 'projects');
        await fs.access(projectsPath);
        console.log('Found Claude data path:', dir);
        return dir;
      } catch (error) {
        // Directory doesn't exist, try next
      }
    }

    console.log('Using default Claude data path:', possiblePaths[0]);
    return possiblePaths[0]; // Default to first option
  }

  async parseJSONLFile(filePath) {
    const entries = [];
    
    return new Promise((resolve, reject) => {
      const stream = createReadStream(filePath);
      const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity
      });

      rl.on('line', (line) => {
        try {
          const entry = JSON.parse(line);
          entries.push(entry);
        } catch (error) {
          // Skip invalid JSON lines
        }
      });

      rl.on('close', () => resolve(entries));
      rl.on('error', reject);
    });
  }

  async analyzeUsage(options = {}) {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate = new Date(),
      project = null
    } = options;

    const claudePath = await this.getClaudeDataPath();
    const projectsPath = path.join(claudePath, 'projects');
    const pricing = await this.getPricing();
    
    const usageStats = {
      daily: {},
      monthly: {},
      sessions: [],
      models: {},
      totalCost: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCacheCreationTokens: 0,
      totalCacheReadTokens: 0
    };

    const processedMessageIds = new Set();

    try {
      // Use glob pattern to find all JSONL files
      const pattern = path.join(projectsPath, '**', '*.jsonl');
      
      // Get all JSONL files recursively
      const { glob } = await import('glob');
      const files = await glob(pattern);
      
      console.log(`Found ${files.length} JSONL files in ${projectsPath}`);
      
      for (const filePath of files) {
        // Extract project name from path
        const relativePath = path.relative(projectsPath, filePath);
        const projectName = relativePath.split(path.sep)[0];
        
        if (project && projectName !== project) continue;
        
        const entries = await this.parseJSONLFile(filePath);
        
        for (const entry of entries) {
          try {
            // Parse according to ccusage schema
            if (!entry.timestamp) continue;
            const timestamp = new Date(entry.timestamp);
            
            // Check if timestamp is valid
            if (isNaN(timestamp.getTime())) continue;
            
            // Filter based on local date (not exact timestamp)
            // This matches ccusage behavior which groups by calendar date in local timezone
            const localDateString = timestamp.toLocaleDateString('en-CA'); // YYYY-MM-DD format
            const startDateString = startDate.toLocaleDateString('en-CA');
            const endDateString = endDate.toLocaleDateString('en-CA');
            
            if (localDateString < startDateString || localDateString > endDateString) continue;
            
            // Handle nested message structure
            const message = entry.message || {};
            const usage = message.usage || {};
            
            // Skip entries without usage data (matches ccusage validation)
            if (!usage.input_tokens && !usage.output_tokens) {
              continue;
            }
            
            const model = message.model || entry.model || 'claude-3-5-sonnet-20241022';
            
            const inputTokens = usage.input_tokens || 0;
            const outputTokens = usage.output_tokens || 0;
            const cacheCreationTokens = usage.cache_creation_input_tokens || 0;
            const cacheReadTokens = usage.cache_read_input_tokens || 0;
            
            // Create unique hash to avoid duplicates using message ID and request ID
            // This matches ccusage's deduplication logic exactly
            const messageId = message.id;
            const requestId = entry.requestId;
            
            // Skip entries without both message ID and request ID (matches ccusage)
            if (!messageId || !requestId) {
              continue;
            }
            
            // Create unique hash like ccusage: "messageId:requestId"
            const uniqueHash = `${messageId}:${requestId}`;
            
            if (processedMessageIds.has(uniqueHash)) {
              continue;
            }
            processedMessageIds.add(uniqueHash);
            
            // Calculate cost (pricing is per token, not per million tokens)
            const modelPricing = pricing[model] || pricing['claude-3-5-sonnet-20241022'] || {
              inputCostPerToken: 0.000003,  // $3 per million tokens
              outputCostPerToken: 0.000015   // $15 per million tokens
            };
            
            // Calculate cost using 'auto' mode like ccusage
            // Use pre-calculated costUSD if available, otherwise calculate from tokens
            const cost = entry.costUSD !== undefined && entry.costUSD !== null ? 
              entry.costUSD : 
              (
                (inputTokens * modelPricing.inputCostPerToken) + 
                (outputTokens * modelPricing.outputCostPerToken) +
                (cacheCreationTokens * (modelPricing.cacheCreationCostPerToken || modelPricing.inputCostPerToken * 1.25)) +
                (cacheReadTokens * (modelPricing.cacheReadCostPerToken || modelPricing.inputCostPerToken * 0.1))
              );
            
            // Update daily stats
            // Use local date to match ccusage behavior
            const dateKey = timestamp.toLocaleDateString('en-CA'); // YYYY-MM-DD format in local timezone
            if (!usageStats.daily[dateKey]) {
              usageStats.daily[dateKey] = {
                inputTokens: 0,
                outputTokens: 0,
                cacheCreationTokens: 0,
                cacheReadTokens: 0,
                cost: 0,
                sessions: 0
              };
            }
            usageStats.daily[dateKey].inputTokens += inputTokens;
            usageStats.daily[dateKey].outputTokens += outputTokens;
            usageStats.daily[dateKey].cacheCreationTokens += cacheCreationTokens;
            usageStats.daily[dateKey].cacheReadTokens += cacheReadTokens;
            usageStats.daily[dateKey].cost += cost;
            usageStats.daily[dateKey].sessions += 1;
            
            // Update monthly stats
            // Use local date to match ccusage behavior
            const monthKey = timestamp.toLocaleDateString('en-CA').substring(0, 7); // YYYY-MM format in local timezone
            if (!usageStats.monthly[monthKey]) {
              usageStats.monthly[monthKey] = {
                inputTokens: 0,
                outputTokens: 0,
                cacheCreationTokens: 0,
                cacheReadTokens: 0,
                cost: 0,
                sessions: 0
              };
            }
            usageStats.monthly[monthKey].inputTokens += inputTokens;
            usageStats.monthly[monthKey].outputTokens += outputTokens;
            usageStats.monthly[monthKey].cacheCreationTokens += cacheCreationTokens;
            usageStats.monthly[monthKey].cacheReadTokens += cacheReadTokens;
            usageStats.monthly[monthKey].cost += cost;
            usageStats.monthly[monthKey].sessions += 1;
            
            // Update model stats
            if (!usageStats.models[model]) {
              usageStats.models[model] = {
                inputTokens: 0,
                outputTokens: 0,
                cacheCreationTokens: 0,
                cacheReadTokens: 0,
                cost: 0,
                sessions: 0
              };
            }
            usageStats.models[model].inputTokens += inputTokens;
            usageStats.models[model].outputTokens += outputTokens;
            usageStats.models[model].cacheCreationTokens += cacheCreationTokens;
            usageStats.models[model].cacheReadTokens += cacheReadTokens;
            usageStats.models[model].cost += cost;
            usageStats.models[model].sessions += 1;
            
            // Update totals
            usageStats.totalInputTokens += inputTokens;
            usageStats.totalOutputTokens += outputTokens;
            usageStats.totalCacheCreationTokens += cacheCreationTokens;
            usageStats.totalCacheReadTokens += cacheReadTokens;
            usageStats.totalCost += cost;
            
            // Add session info (only for unique entries)
            // Use the message ID for session tracking to avoid duplicates
            const sessionId = message.id; // Use message.id which is part of our deduplication
            if (sessionId) {
              usageStats.sessions.push({
                id: sessionId,
                timestamp: timestamp.toISOString(),
                model,
                inputTokens,
                outputTokens,
                cacheCreationTokens,
                cacheReadTokens,
                cost,
                project: projectName
              });
            }
          } catch (error) {
            // Skip invalid entries
            console.error('Error processing entry:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error analyzing usage:', error);
    }
    
    return usageStats;
  }

  async getSummary() {
    const now = new Date();
    // Create date boundaries at midnight in local timezone
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const weekStart = new Date(now.getTime() - (now.getDay() * 24 * 60 * 60 * 1000));
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    
    const [todayUsage, weekUsage, monthUsage] = await Promise.all([
      this.analyzeUsage({ startDate: todayStart, endDate: todayEnd }),
      this.analyzeUsage({ startDate: weekStart, endDate: now }),
      this.analyzeUsage({ startDate: monthStart, endDate: now })
    ]);
    
    // Calculate rate limits (example logic)
    const dailyLimit = 1000000; // 1M tokens per day
    const usedToday = todayUsage.totalInputTokens + todayUsage.totalOutputTokens;
    const remaining = Math.max(0, dailyLimit - usedToday);
    const remainingPercentage = (remaining / dailyLimit) * 100;
    
    // Calculate current rate (tokens per minute) - only count last 1 minute
    const oneMinuteAgo = new Date(now.getTime() - 60000); // 1 minute ago
    let tokensPerMinute = 0;
    
    // Filter sessions from the last minute
    const recentSessions = todayUsage.sessions.filter(s => {
      const sessionTime = new Date(s.timestamp);
      return sessionTime >= oneMinuteAgo && sessionTime <= now;
    });
    
    if (recentSessions.length > 0) {
      // Sum tokens from sessions in the last minute
      const totalTokens = recentSessions.reduce((sum, s) => sum + s.inputTokens + s.outputTokens, 0);
      tokensPerMinute = totalTokens; // This is already tokens in the last minute
    }
    
    return {
      today: {
        cost: todayUsage.totalCost,
        tokens: todayUsage.totalInputTokens + todayUsage.totalOutputTokens
      },
      week: {
        cost: weekUsage.totalCost,
        tokens: weekUsage.totalInputTokens + weekUsage.totalOutputTokens
      },
      month: {
        cost: monthUsage.totalCost,
        tokens: monthUsage.totalInputTokens + monthUsage.totalOutputTokens
      },
      rateLimit: {
        remaining: remainingPercentage,
        used: usedToday,
        total: dailyLimit
      },
      currentRate: {
        tokensPerMinute
      }
    };
  }

  async getDetailed(tab, range, project) {
    const now = new Date();
    let startDate;
    
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }
    
    const usage = await this.analyzeUsage({
      startDate,
      endDate: now,
      project: project === 'all' ? null : project
    });
    
    const result = {
      projects: await this.getProjects()
    };
    
    switch (tab) {
      case 'bytime':
      case 'daily':
        // Calculate today and week costs using local dates
        const today = now.toLocaleDateString('en-CA'); // YYYY-MM-DD in local timezone
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
        
        const todayCost = usage.daily[today]?.cost || 0;
        const weekCost = Object.entries(usage.daily)
          .filter(([date]) => date >= weekAgo)
          .reduce((sum, [, data]) => sum + data.cost, 0);
        
        result.daily = {
          totalCost: usage.totalCost,
          totalTokens: usage.totalInputTokens + usage.totalOutputTokens + usage.totalCacheCreationTokens + usage.totalCacheReadTokens,
          totalInputTokens: usage.totalInputTokens,
          totalOutputTokens: usage.totalOutputTokens,
          totalCacheCreationTokens: usage.totalCacheCreationTokens,
          totalCacheReadTokens: usage.totalCacheReadTokens,
          avgPerDay: usage.totalCost / Object.keys(usage.daily).length || 0,
          days: Object.entries(usage.daily).map(([date, data]) => ({
            date,
            inputTokens: data.inputTokens,
            outputTokens: data.outputTokens,
            cacheCreationTokens: data.cacheCreationTokens,
            cacheReadTokens: data.cacheReadTokens,
            cost: data.cost
          })).sort((a, b) => b.date.localeCompare(a.date))
        };
        
        // Add today and week data for bytime tab
        if (tab === 'bytime') {
          result.today = { cost: todayCost, tokens: usage.daily[today]?.inputTokens + usage.daily[today]?.outputTokens || 0 };
          result.week = { cost: weekCost, tokens: 0 }; // Calculate week tokens if needed
        }
        break;
        
      case 'monthly':
        result.monthly = {
          months: Object.entries(usage.monthly).map(([month, data]) => ({
            name: month,
            inputTokens: data.inputTokens,
            outputTokens: data.outputTokens,
            cost: data.cost,
            sessions: data.sessions
          })).sort((a, b) => b.name.localeCompare(a.name))
        };
        break;
        
      case 'session':
        result.sessions = usage.sessions
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
          .slice(0, 100)
          .map(session => ({
            ...session,
            duration: '5m', // Example duration
            totalTokens: session.inputTokens + session.outputTokens
          }));
        break;
        
      case 'billing':
        const monthlyLimit = 100; // $100 per month example
        const dailySpend = usage.totalCost;
        const monthlySpend = Object.values(usage.monthly).reduce((sum, m) => sum + m.cost, 0);
        
        result.billing = {
          currentPeriod: monthlySpend,
          limitPercentage: (monthlySpend / monthlyLimit) * 100,
          periodStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
          periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
          dailyLimit: (dailySpend / 10) * 100, // Example: $10 daily limit
          monthlyLimit: (monthlySpend / monthlyLimit) * 100
        };
        break;
        
      case 'models':
        const totalCost = usage.totalCost;
        result.models = Object.entries(usage.models).map(([name, data]) => ({
          name,
          inputTokens: data.inputTokens,
          outputTokens: data.outputTokens,
          cacheCreationTokens: data.cacheCreationTokens,
          cacheReadTokens: data.cacheReadTokens,
          cost: data.cost,
          percentage: totalCost > 0 ? (data.cost / totalCost) * 100 : 0,
          cacheRatio: data.cacheReadTokens > 0 ? 
            (data.cacheReadTokens / (data.inputTokens + data.outputTokens + data.cacheCreationTokens + data.cacheReadTokens)) * 100 : 0
        })).sort((a, b) => b.cost - a.cost);
        break;
    }
    
    return result;
  }

  async getProjects() {
    const claudePath = await this.getClaudeDataPath();
    const projectsPath = path.join(claudePath, 'projects');
    
    try {
      const projects = await fs.readdir(projectsPath);
      return projects.map(name => ({
        id: name,
        name: name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      }));
    } catch (error) {
      return [];
    }
  }
}

export default UsageAnalyzer;