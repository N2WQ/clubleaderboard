import { Socket } from 'net';
import { storage } from './storage';
import { broadcast } from './websocket';

interface ClusterConfig {
  fqdn: string;
  port: number;
  loginCallsign: string;
  enabled: boolean;
}

interface SpotData {
  spotter: string;
  frequency: string;
  spotted: string;
  comment: string;
  time: string;
}

class ClusterClient {
  private socket: Socket | null = null;
  private config: ClusterConfig | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;
  private isShuttingDown: boolean = false;
  private memberCache: Set<string> = new Set();
  private eligibleMemberCache: Map<string, number> = new Map(); // callsign -> expiration year
  private lastCacheUpdate: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async start() {
    try {
      // Load cluster configuration
      await this.loadConfig();
      
      if (!this.config?.enabled) {
        console.log('DX Cluster client disabled in configuration');
        return;
      }

      // Load member cache
      await this.refreshMemberCache();
      
      // Connect to cluster
      this.connect();
    } catch (error) {
      console.error('Failed to start cluster client:', error);
      this.scheduleReconnect();
    }
  }

  async loadConfig() {
    const enabledConfig = await storage.getScoringConfig('cluster_enabled');
    const fqdnConfig = await storage.getScoringConfig('cluster_fqdn');
    const portConfig = await storage.getScoringConfig('cluster_port');
    const callsignConfig = await storage.getScoringConfig('cluster_login_callsign');

    this.config = {
      enabled: enabledConfig?.value === 'true',
      fqdn: fqdnConfig?.value || 'dxc.w6cua.org',
      port: parseInt(portConfig?.value || '7300', 10),
      loginCallsign: callsignConfig?.value || 'AJ1I',
    };

    console.log('Cluster configuration loaded:', {
      enabled: this.config.enabled,
      fqdn: this.config.fqdn,
      port: this.config.port,
      loginCallsign: this.config.loginCallsign,
    });
  }

  async refreshMemberCache() {
    try {
      const now = Date.now();
      if (now - this.lastCacheUpdate < this.CACHE_TTL) {
        return; // Cache still valid
      }

      const allMembers = await storage.getAllActiveMembers();
      this.memberCache.clear();
      this.eligibleMemberCache.clear();

      const currentYear = new Date().getFullYear();

      for (const member of allMembers) {
        this.memberCache.add(member.callsign.toUpperCase());
        
        // Check if member has valid dues for current year
        if (member.duesExpiration) {
          const parts = member.duesExpiration.split('/');
          if (parts.length === 3) {
            const expirationYear = parseInt(parts[2], 10);
            if (!isNaN(expirationYear) && expirationYear >= currentYear) {
              this.eligibleMemberCache.set(member.callsign.toUpperCase(), expirationYear);
            }
          }
        }
      }

      this.lastCacheUpdate = now;
      console.log(`Member cache refreshed: ${this.memberCache.size} total, ${this.eligibleMemberCache.size} eligible for ${currentYear}`);
    } catch (error) {
      console.error('Failed to refresh member cache:', error);
    }
  }

  connect() {
    if (!this.config || this.isShuttingDown) return;

    console.log(`Connecting to DX Cluster at ${this.config.fqdn}:${this.config.port}...`);

    this.socket = new Socket();
    let buffer = '';

    this.socket.on('connect', () => {
      console.log('✓ Connected to DX Cluster');
      this.isConnected = true;
      broadcast('cluster:status', { connected: true });
    });

    this.socket.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        this.handleLine(line.trim());
      }
    });

    this.socket.on('close', () => {
      console.log('✗ Disconnected from DX Cluster');
      this.isConnected = false;
      this.socket = null;
      broadcast('cluster:status', { connected: false });
      
      if (!this.isShuttingDown) {
        this.scheduleReconnect();
      }
    });

    this.socket.on('error', (error) => {
      console.error('DX Cluster connection error:', error.message);
      if (this.socket) {
        this.socket.destroy();
      }
    });

    this.socket.connect(this.config.port, this.config.fqdn);
  }

  handleLine(line: string) {
    // Login prompt - send callsign
    if (line.toLowerCase().includes('login:') || line.toLowerCase().includes('call')) {
      if (this.socket && this.config) {
        this.socket.write(`${this.config.loginCallsign}\n`);
        console.log(`Logged in as ${this.config.loginCallsign}`);
      }
      return;
    }

    // Parse DX spot
    const spot = this.parseSpot(line);
    if (spot) {
      this.processSpot(spot);
    }
  }

  parseSpot(line: string): SpotData | null {
    // DX spot format: "DX de SPOTTER: FREQUENCY SPOTTED COMMENT TIME"
    // Example: "DX de K1AR:     14.025 WK1O        Great signal!     1830Z"
    const spotPattern = /^DX de\s+([A-Z0-9/-]+):\s+(\d+\.?\d*)\s+([A-Z0-9/-]+)\s+(.*?)\s+(\d{4}Z)$/i;
    const match = line.match(spotPattern);

    if (!match) {
      return null;
    }

    return {
      spotter: match[1].trim().toUpperCase(),
      frequency: match[2].trim(),
      spotted: match[3].trim().toUpperCase(),
      comment: match[4].trim(),
      time: match[5].trim(),
    };
  }

  async processSpot(spot: SpotData) {
    try {
      // Filter 1: Ignore automated spots (containing -# in spotter callsign)
      if (spot.spotter.includes('-')) {
        const suffix = spot.spotter.split('-')[1];
        if (suffix && /^\d+$/.test(suffix)) {
          // Contains -# where # is a digit, skip automated spot
          return;
        }
      }

      // Refresh cache if needed
      await this.refreshMemberCache();

      // Filter 2: Spotter must be eligible YCCC member (valid dues)
      if (!this.eligibleMemberCache.has(spot.spotter)) {
        return;
      }

      // Filter 3: Spotted station must be any YCCC member
      if (!this.memberCache.has(spot.spotted)) {
        return;
      }

      // Award cheerleader points
      await this.awardCheerleaderPoints(spot.spotter);

      console.log(`✓ Cheerleader spot: ${spot.spotter} spotted ${spot.spotted} on ${spot.frequency}`);
    } catch (error) {
      console.error('Error processing spot:', error);
    }
  }

  async awardCheerleaderPoints(spotterCallsign: string) {
    try {
      const currentYear = new Date().getFullYear();
      
      // Get points per spot configuration
      const pointsConfig = await storage.getScoringConfig('cheerleader_points_per_spot');
      const pointsPerSpot = parseInt(pointsConfig?.value || '100', 10);

      // Increment cheerleader points for this member/year
      await storage.incrementCheerleaderPoints(spotterCallsign, currentYear, pointsPerSpot);

      // Broadcast update
      broadcast('cheerleader:spot', {
        spotter: spotterCallsign,
        year: currentYear,
        pointsAwarded: pointsPerSpot,
      });
    } catch (error) {
      console.error('Error awarding cheerleader points:', error);
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    console.log('Reconnecting to DX Cluster in 60 seconds...');
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 60 * 1000); // 1 minute
  }

  stop() {
    this.isShuttingDown = true;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }

    this.isConnected = false;
    console.log('DX Cluster client stopped');
  }

  async restart() {
    console.log('Restarting DX Cluster client...');
    this.stop();
    this.isShuttingDown = false;
    await this.start();
  }

  getStatus() {
    return {
      connected: this.isConnected,
      config: this.config,
      membersCached: this.memberCache.size,
      eligibleMembersCached: this.eligibleMemberCache.size,
    };
  }
}

export const clusterClient = new ClusterClient();
