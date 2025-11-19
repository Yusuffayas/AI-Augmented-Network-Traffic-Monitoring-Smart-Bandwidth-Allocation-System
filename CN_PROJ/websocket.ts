import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { getTrafficLogs, getActiveFlows, getSystemAlerts, getNetworkStats } from './db';

export interface ClientConnection {
  id: string;
  socket: Socket;
  connectedAt: Date;
  subscriptions: Set<string>;
}

class WebSocketManager {
  private io: SocketIOServer;
  private clients: Map<string, ClientConnection> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private updateIntervalMs = 1000; // Update every 1 second

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.setupConnections();
    this.startBroadcasting();
  }

  private setupConnections() {
    this.io.on('connection', (socket: Socket) => {
      const clientId = socket.id;
      const client: ClientConnection = {
        id: clientId,
        socket,
        connectedAt: new Date(),
        subscriptions: new Set(),
      };

      this.clients.set(clientId, client);
      console.log(`[WebSocket] Client connected: ${clientId}`);

      // Handle subscriptions
      socket.on('subscribe', (channel: string) => {
        client.subscriptions.add(channel);
        socket.emit('subscribed', { channel });
        console.log(`[WebSocket] Client ${clientId} subscribed to ${channel}`);
      });

      socket.on('unsubscribe', (channel: string) => {
        client.subscriptions.delete(channel);
        socket.emit('unsubscribed', { channel });
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.clients.delete(clientId);
        console.log(`[WebSocket] Client disconnected: ${clientId}`);
      });

      // Handle errors
      socket.on('error', (error: any) => {
        console.error(`[WebSocket] Error from ${clientId}:`, error);
      });

      // Send initial connection message
      socket.emit('connected', {
        clientId,
        timestamp: new Date().toISOString(),
      });
    });
  }

  private startBroadcasting() {
    this.updateInterval = setInterval(async () => {
      try {
        // Get current data
        const trafficLogs = await getTrafficLogs(100, 0);
        const activeFlows = await getActiveFlows();
        const alerts = await getSystemAlerts(true, 10);
        const stats = await getNetworkStats();

        // Broadcast to all connected clients
        this.io.emit('traffic-update', {
          timestamp: new Date().toISOString(),
          trafficLogs: trafficLogs.slice(0, 50), // Last 50 logs
          activeFlows,
          alerts,
          stats: {
            totalFlows: activeFlows.length,
            totalPackets: trafficLogs.reduce((sum) => sum + 1, 0),
            activeAlerts: alerts.length,
          },
        });

        // Broadcast per-type statistics
        const videoTraffic = trafficLogs.filter(
          (log: any) => log.trafficType === 'video'
        );
        const voiceTraffic = trafficLogs.filter(
          (log: any) => log.trafficType === 'voice'
        );
        const fileTraffic = trafficLogs.filter(
          (log: any) => log.trafficType === 'file'
        );
        const backgroundTraffic = trafficLogs.filter(
          (log: any) => log.trafficType === 'background'
        );

        this.io.emit('traffic-by-type', {
          timestamp: new Date().toISOString(),
          video: {
            count: videoTraffic.length,
            avgThroughput:
              videoTraffic.length > 0
                ? (
                    videoTraffic.reduce(
                      (sum: number, log: any) => sum + (log.throughput || 0),
                      0
                    ) / videoTraffic.length
                  ).toFixed(2)
                : 0,
          },
          voice: {
            count: voiceTraffic.length,
            avgThroughput:
              voiceTraffic.length > 0
                ? (
                    voiceTraffic.reduce(
                      (sum: number, log: any) => sum + (log.throughput || 0),
                      0
                    ) / voiceTraffic.length
                  ).toFixed(2)
                : 0,
          },
          file: {
            count: fileTraffic.length,
            avgThroughput:
              fileTraffic.length > 0
                ? (
                    fileTraffic.reduce(
                      (sum: number, log: any) => sum + (log.throughput || 0),
                      0
                    ) / fileTraffic.length
                  ).toFixed(2)
                : 0,
          },
          background: {
            count: backgroundTraffic.length,
            avgThroughput:
              backgroundTraffic.length > 0
                ? (
                    backgroundTraffic.reduce(
                      (sum: number, log: any) => sum + (log.throughput || 0),
                      0
                    ) / backgroundTraffic.length
                  ).toFixed(2)
                : 0,
          },
        });
      } catch (error) {
        console.error('[WebSocket] Broadcasting error:', error);
      }
    }, this.updateIntervalMs);
  }

  public broadcast(event: string, data: any) {
    this.io.emit(event, {
      timestamp: new Date().toISOString(),
      ...data,
    });
  }

  public broadcastToSubscribers(channel: string, event: string, data: any) {
    const clientsArray = Array.from(this.clients.values());
    for (let i = 0; i < clientsArray.length; i++) {
      const client = clientsArray[i];
      if (client.subscriptions.has(channel)) {
        client.socket.emit(event, {
          timestamp: new Date().toISOString(),
          channel,
          ...data,
        });
      }
    }
  }

  public getConnectedClients() {
    const result: any[] = [];
    const clientsArray = Array.from(this.clients.values());
    for (let i = 0; i < clientsArray.length; i++) {
      const client = clientsArray[i];
      result.push({
        id: client.id,
        connectedAt: client.connectedAt,
        subscriptions: Array.from(client.subscriptions),
      });
    }
    return result;
  }

  public stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.io.close();
  }
}

let wsManager: WebSocketManager | null = null;

export function initializeWebSocket(httpServer: HTTPServer): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager(httpServer);
  }
  return wsManager;
}

export function getWebSocketManager(): WebSocketManager | null {
  return wsManager;
}
