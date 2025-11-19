import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Activity, BarChart3, Zap } from "lucide-react";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-white">Network Monitor</CardTitle>
              <CardDescription className="text-slate-400">AI-Driven Bandwidth Allocator</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-300 text-center">
                Monitor real-time network traffic, predict bandwidth requirements, and optimize QoS policies.
              </p>
              <Button className="w-full" onClick={() => window.location.href = getLoginUrl()}>
                Sign In to Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Welcome to Network Monitor</h1>
              <p className="text-slate-400">Hello, {user?.name || 'User'}! Ready to monitor your network?</p>
            </div>
            <Button variant="outline" onClick={logout}>
              Sign Out
            </Button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors cursor-pointer" onClick={() => setLocation('/dashboard')}>
            <CardHeader>
              <Activity className="w-8 h-8 text-blue-500 mb-2" />
              <CardTitle className="text-white">Real-Time Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300">
                Monitor live network traffic, active flows, and bandwidth usage in real-time with interactive charts.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-purple-500 transition-colors cursor-pointer">
            <CardHeader>
              <BarChart3 className="w-8 h-8 text-purple-500 mb-2" />
              <CardTitle className="text-white">AI Predictions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300">
                Leverage machine learning to predict bandwidth requirements and optimize resource allocation.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-green-500 transition-colors cursor-pointer">
            <CardHeader>
              <Zap className="w-8 h-8 text-green-500 mb-2" />
              <CardTitle className="text-white">QoS Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300">
                Prioritize traffic, enforce bandwidth policies, and ensure optimal performance for critical applications.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Get Started</h2>
          <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
            Access the comprehensive network monitoring dashboard to view real-time traffic statistics, active connections, and system alerts.
          </p>
          <Button size="lg" onClick={() => setLocation('/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
