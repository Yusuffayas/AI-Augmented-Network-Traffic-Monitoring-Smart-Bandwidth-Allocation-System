import React, { useEffect, useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Activity, TrendingUp, Wifi } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TrafficData {
  timestamp: string;
  video: number;
  voice: number;
  file: number;
  background: number;
}

interface FlowData {
  id: number;
  sourceIp: string;
  destinationIp: string;
  trafficType: string;
  currentBandwidth: number;
  allocatedBandwidth: number;
  priority: number;
}

const COLORS = {
  video: '#ef4444',
  voice: '#f97316',
  file: '#3b82f6',
  background: '#6b7280',
};

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [trafficData, setTrafficData] = useState<TrafficData[]>([]);
  const [flows, setFlows] = useState<FlowData[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [totalBandwidth, setTotalBandwidth] = useState(0);
  const [usedBandwidth, setUsedBandwidth] = useState(0);

  // Fetch traffic logs
  const { data: trafficLogs } = trpc.traffic.getLogs.useQuery(
    { limit: 100, offset: 0 },
    { enabled: isAuthenticated }
  );

  // Fetch active flows
  const { data: activeFlows } = trpc.network.getFlows.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Fetch alerts
  const { data: systemAlerts } = trpc.alerts.getAlerts.useQuery(
    { unresolved: true, limit: 10 },
    { enabled: isAuthenticated }
  );

  // Process traffic data for charts
  useEffect(() => {
    if (trafficLogs && trafficLogs.length > 0) {
      const processed: TrafficData[] = [];
      const timeGroups: { [key: string]: any } = {};

      trafficLogs.forEach((log: any) => {
        const time = new Date(log.timestamp).toLocaleTimeString();
        if (!timeGroups[time]) {
          timeGroups[time] = {
            timestamp: time,
            video: 0,
            voice: 0,
            file: 0,
            background: 0,
          };
        }
        timeGroups[time][log.trafficType] = (timeGroups[time][log.trafficType] || 0) + (log.throughput || 0);
      });

      setTrafficData(Object.values(timeGroups).slice(-20));

      // Calculate bandwidth usage
      const totalUsed = trafficLogs.reduce((sum: number, log: any) => sum + (log.throughput || 0), 0);
      setUsedBandwidth(totalUsed);
    }
  }, [trafficLogs]);

  // Process active flows
  useEffect(() => {
    if (activeFlows && activeFlows.length > 0) {
      setFlows(activeFlows as FlowData[]);
    }
  }, [activeFlows]);

  // Process alerts
  useEffect(() => {
    if (systemAlerts && systemAlerts.length > 0) {
      setAlerts(systemAlerts);
    }
  }, [systemAlerts]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please log in to view the network monitor dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const bandwidthUsagePercent = totalBandwidth > 0 ? (usedBandwidth / totalBandwidth) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Network Monitor</h1>
          <p className="text-slate-400">Real-time traffic analysis and bandwidth allocation</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <Wifi className="w-4 h-4" />
                Total Bandwidth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalBandwidth} Mbps</div>
              <p className="text-xs text-slate-500 mt-1">Available capacity</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Used Bandwidth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{usedBandwidth.toFixed(2)} Mbps</div>
              <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(bandwidthUsagePercent, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-500 mt-1">{bandwidthUsagePercent.toFixed(1)}% utilized</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Active Flows
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{flows.length}</div>
              <p className="text-xs text-slate-500 mt-1">Current connections</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{alerts.length}</div>
              <p className="text-xs text-slate-500 mt-1">Unresolved issues</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="flows">Active Flows</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Bandwidth Over Time */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Bandwidth Usage Over Time</CardTitle>
                  <CardDescription className="text-slate-400">Last 20 data points</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trafficData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis dataKey="timestamp" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                      <Legend />
                      <Line type="monotone" dataKey="video" stroke={COLORS.video} strokeWidth={2} />
                      <Line type="monotone" dataKey="voice" stroke={COLORS.voice} strokeWidth={2} />
                      <Line type="monotone" dataKey="file" stroke={COLORS.file} strokeWidth={2} />
                      <Line type="monotone" dataKey="background" stroke={COLORS.background} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Traffic Distribution */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Traffic Distribution</CardTitle>
                  <CardDescription className="text-slate-400">By traffic type</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Video', value: trafficData.reduce((sum, d) => sum + d.video, 0) },
                          { name: 'Voice', value: trafficData.reduce((sum, d) => sum + d.voice, 0) },
                          { name: 'File', value: trafficData.reduce((sum, d) => sum + d.file, 0) },
                          { name: 'Background', value: trafficData.reduce((sum, d) => sum + d.background, 0) },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value.toFixed(2)}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill={COLORS.video} />
                        <Cell fill={COLORS.voice} />
                        <Cell fill={COLORS.file} />
                        <Cell fill={COLORS.background} />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Active Flows Tab */}
          <TabsContent value="flows">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Active Network Flows</CardTitle>
                <CardDescription className="text-slate-400">Current connections and bandwidth allocation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-slate-300">
                    <thead className="border-b border-slate-700">
                      <tr>
                        <th className="text-left py-2 px-4">Source IP</th>
                        <th className="text-left py-2 px-4">Destination IP</th>
                        <th className="text-left py-2 px-4">Type</th>
                        <th className="text-right py-2 px-4">Current (Mbps)</th>
                        <th className="text-right py-2 px-4">Allocated (Mbps)</th>
                        <th className="text-center py-2 px-4">Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flows.map((flow) => (
                        <tr key={flow.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                          <td className="py-2 px-4 font-mono text-xs">{flow.sourceIp}</td>
                          <td className="py-2 px-4 font-mono text-xs">{flow.destinationIp}</td>
                          <td className="py-2 px-4">
                            <Badge
                              variant="outline"
                              className={`${
                                flow.trafficType === 'video'
                                  ? 'bg-red-500/20 text-red-300'
                                  : flow.trafficType === 'voice'
                                  ? 'bg-orange-500/20 text-orange-300'
                                  : flow.trafficType === 'file'
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : 'bg-gray-500/20 text-gray-300'
                              }`}
                            >
                              {flow.trafficType}
                            </Badge>
                          </td>
                          <td className="py-2 px-4 text-right">{flow.currentBandwidth.toFixed(2)}</td>
                          <td className="py-2 px-4 text-right">{flow.allocatedBandwidth?.toFixed(2) || 'N/A'}</td>
                          <td className="py-2 px-4 text-center">
                            <Badge variant="secondary">{flow.priority}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">System Alerts</CardTitle>
                <CardDescription className="text-slate-400">Recent alerts and notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {alerts.length > 0 ? (
                  alerts.map((alert) => (
                    <Alert key={alert.id} className="bg-slate-700 border-slate-600">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="font-semibold text-white">{alert.title}</div>
                        <div className="text-sm text-slate-300 mt-1">{alert.message}</div>
                        <div className="text-xs text-slate-500 mt-2">
                          {new Date(alert.createdAt).toLocaleString()}
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <p>No active alerts</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
