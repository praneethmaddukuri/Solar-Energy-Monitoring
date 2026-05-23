import React, { useEffect, useState } from 'react';
import { Sun, Zap, Activity, BatteryCharging, TrendingUp, Leaf, DollarSign, Trees, LogOut, BarChart3, Settings as SettingsIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { useAuthStore } from '../stores/authStore';
import { useEnergyStore } from '../stores/energyStore';
import { wsManager } from '../utils/websocket';
import api from '../utils/api';
import { toast } from 'sonner';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuthStore();
  const { readings, latestReading, summaryStats, setReadings, addReading, setSummaryStats } = useEnergyStore();
  const [isConnected, setIsConnected] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const checkConnection = async () => {
    try {
      const res = await api.get("/user/thingspeak-status");
      if (!res.data.connected) {
        navigate("/connect");
      }
    } catch (error) {
      console.error("Connection check failed");
    }
  };
  useEffect(() => {
    checkConnection();

    fetchData();
    wsManager.connect(token);

    const handleConnection = (connected) => setIsConnected(connected);
    const handleMessage = (data) => {
      if (data.type === 'new_reading') {
        addReading(data.reading);
      }
    };

    wsManager.on('connected', handleConnection);
    wsManager.on('message', handleMessage);

    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      wsManager.off('connected', handleConnection);
      wsManager.off('message', handleMessage);
      clearInterval(timeInterval);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [readingsRes, summaryRes] = await Promise.all([
        api.get('/readings/latest?limit=50'),
        api.get('/stats/summary'),
      ]);
      setReadings(readingsRes.data);
      setSummaryStats(summaryRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    }
  };

  const handleLogout = () => {
    wsManager.disconnect();
    logout();
    navigate('/auth');
  };

  const handleSync = async () => {
    try {
      await api.get('/readings/sync');
      await fetchData();
      toast.success('Data synced successfully');
    } catch (error) {
      toast.error('Sync failed');
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const chartData = readings.slice(0, 24).reverse().map(r => ({
    time: new Date(r.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    voltage: r.voltage,
    current: r.current,
    power: r.power,
  }));

  const hourlyPowerData = readings.slice(0, 12).reverse().map(r => ({
    time: new Date(r.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    power: r.power,
  }));

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
              <Sun className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>EcoPower Insights</h1>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span data-testid="system-status">{isConnected ? 'System Online' : 'System Offline'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900" data-testid="current-time">{formatTime(currentTime)}</p>
              <p className="text-xs text-slate-600">{formatDate(currentTime)}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleSync} data-testid="sync-btn">
              Sync Data
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/analytics')} data-testid="analytics-nav-btn">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/settings')} data-testid="settings-nav-btn">
              <SettingsIcon className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="logout-btn">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Live Monitoring Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-sm border-slate-100 hover:shadow-md transition-shadow" data-testid="voltage-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">Voltage</CardTitle>
                <Zap className="w-5 h-5 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {latestReading ? latestReading.voltage.toFixed(2) : '0.00'} <span className="text-lg text-slate-600">V</span>
              </div>
              {chartData.length > 0 && (
                <div className="mt-4" style={{ height: '60px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData.slice(-10)}>
                      <Line type="monotone" dataKey="voltage" stroke="#F59E0B" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-100 hover:shadow-md transition-shadow" data-testid="current-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">Current</CardTitle>
                <Activity className="w-5 h-5 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {latestReading ? latestReading.current.toFixed(2) : '0.00'} <span className="text-lg text-slate-600">A</span>
              </div>
              {chartData.length > 0 && (
                <div className="mt-4" style={{ height: '60px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData.slice(-10)}>
                      <Line type="monotone" dataKey="current" stroke="#10B981" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-100 hover:shadow-md transition-shadow" data-testid="power-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">Power</CardTitle>
                <BatteryCharging className="w-5 h-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {latestReading ? latestReading.power.toFixed(2) : '0.00'} <span className="text-lg text-slate-600">W</span>
              </div>
              {chartData.length > 0 && (
                <div className="mt-4" style={{ height: '60px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData.slice(-10)}>
                      <Line type="monotone" dataKey="power" stroke="#3B82F6" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Energy Analytics & Environmental Impact */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Energy Analytics Chart */}
          <Card className="lg:col-span-2 shadow-sm border-slate-100" data-testid="energy-chart">
            <CardHeader>
              <CardTitle className="text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Hourly Power Output</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyPowerData}>
                    <defs>
                      <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="time" stroke="#64748B" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#64748B" style={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="power" stroke="#10B981" strokeWidth={2} fill="url(#powerGradient)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Environmental Impact */}
          <Card className="shadow-sm border-slate-100" data-testid="environmental-impact">
            <CardHeader>
              <CardTitle className="text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Environmental Impact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">CO₂ Reduced Today</span>
                  <span className="text-lg font-bold text-emerald-600">{summaryStats?.today_co2 || 0} kg</span>
                </div>
                <Progress value={(summaryStats?.today_co2 / 10) * 100 || 0} className="h-2" style={{ backgroundColor: '#E2E8F0' }} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">Total CO₂ Reduced</span>
                  <span className="text-lg font-bold text-emerald-600">{summaryStats?.total_co2 || 0} kg</span>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center gap-3 mb-3">
                  <Trees className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-sm text-slate-600">Equivalent Trees Planted</p>
                    <p className="text-2xl font-bold text-slate-900">{summaryStats?.trees_equivalent || 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Leaf className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-sm text-slate-600">Fuel Saved</p>
                    <p className="text-2xl font-bold text-slate-900">{summaryStats?.fuel_saved || 0} L</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Energy Generated & Financial Savings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Energy Generated */}
          <Card className="shadow-sm border-slate-100" data-testid="energy-generated">
            <CardHeader>
              <CardTitle className="text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Energy Generated</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">Today</span>
                <span className="text-2xl font-bold text-emerald-600">{summaryStats?.today_energy || 0} kWh</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">This Month</span>
                <span className="text-2xl font-bold text-slate-900">{summaryStats?.month_energy || 0} kWh</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">Lifetime</span>
                <span className="text-2xl font-bold text-slate-900">{summaryStats?.lifetime_energy || 0} kWh</span>
              </div>
            </CardContent>
          </Card>

          {/* Financial Savings */}
          <Card className="shadow-sm border-slate-100" data-testid="financial-savings">
            <CardHeader>
              <CardTitle className="text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Financial Savings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-amber-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">Daily Savings</span>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="text-2xl font-bold text-amber-600">₹{summaryStats?.today_savings || 0}</span>
                </div>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">Monthly Savings</span>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="text-2xl font-bold text-slate-900">₹{summaryStats?.month_savings || 0}</span>
                </div>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">Lifetime Savings</span>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="text-2xl font-bold text-slate-900">₹{summaryStats?.lifetime_savings || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;