import React, { useEffect, useState } from 'react';
import { Sun, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useEnergyStore } from '../stores/energyStore';
import api from '../utils/api';
import { toast } from 'sonner';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Analytics = () => {
  const navigate = useNavigate();
  const { dailyStats, setDailyStats } = useEnergyStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/stats/daily?days=30');
      setDailyStats(response.data);
    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const last7Days = dailyStats.slice(-7);
  const last30Days = dailyStats;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} data-testid="back-to-dashboard-btn">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                <Sun className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Analytics</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-20">
            <p className="text-slate-600">Loading analytics...</p>
          </div>
        ) : (
          <Tabs defaultValue="weekly" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="weekly" data-testid="weekly-tab">Last 7 Days</TabsTrigger>
              <TabsTrigger value="monthly" data-testid="monthly-tab">Last 30 Days</TabsTrigger>
            </TabsList>

            <TabsContent value="weekly" className="space-y-6">
              {/* Energy Chart */}
              <Card className="shadow-sm border-slate-100" data-testid="weekly-energy-chart">
                <CardHeader>
                  <CardTitle className="text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Daily Energy Generation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ height: '350px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={last7Days}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="date" stroke="#64748B" style={{ fontSize: '12px' }} />
                        <YAxis stroke="#64748B" style={{ fontSize: '12px' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px' }} />
                        <Legend />
                        <Bar dataKey="energy_kwh" fill="#10B981" name="Energy (kWh)" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Carbon Reduction Chart */}
              <Card className="shadow-sm border-slate-100" data-testid="weekly-carbon-chart">
                <CardHeader>
                  <CardTitle className="text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>CO₂ Reduction</CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ height: '350px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={last7Days}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="date" stroke="#64748B" style={{ fontSize: '12px' }} />
                        <YAxis stroke="#64748B" style={{ fontSize: '12px' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px' }} />
                        <Legend />
                        <Line type="monotone" dataKey="co2_reduced" stroke="#10B981" strokeWidth={3} name="CO₂ Reduced (kg)" dot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Cost Savings Chart */}
              <Card className="shadow-sm border-slate-100" data-testid="weekly-savings-chart">
                <CardHeader>
                  <CardTitle className="text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Financial Savings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ height: '350px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={last7Days}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="date" stroke="#64748B" style={{ fontSize: '12px' }} />
                        <YAxis stroke="#64748B" style={{ fontSize: '12px' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px' }} />
                        <Legend />
                        <Bar dataKey="savings" fill="#F59E0B" name="Savings (₹)" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="monthly" className="space-y-6">
              {/* Energy Chart */}
              <Card className="shadow-sm border-slate-100" data-testid="monthly-energy-chart">
                <CardHeader>
                  <CardTitle className="text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Monthly Energy Generation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ height: '350px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={last30Days}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="date" stroke="#64748B" style={{ fontSize: '10px' }} angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#64748B" style={{ fontSize: '12px' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px' }} />
                        <Legend />
                        <Bar dataKey="energy_kwh" fill="#10B981" name="Energy (kWh)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Carbon Reduction Chart */}
              <Card className="shadow-sm border-slate-100" data-testid="monthly-carbon-chart">
                <CardHeader>
                  <CardTitle className="text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>CO₂ Reduction Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ height: '350px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={last30Days}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="date" stroke="#64748B" style={{ fontSize: '10px' }} angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#64748B" style={{ fontSize: '12px' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px' }} />
                        <Legend />
                        <Line type="monotone" dataKey="co2_reduced" stroke="#10B981" strokeWidth={2} name="CO₂ Reduced (kg)" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Cost Savings Chart */}
              <Card className="shadow-sm border-slate-100" data-testid="monthly-savings-chart">
                <CardHeader>
                  <CardTitle className="text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Monthly Financial Savings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ height: '350px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={last30Days}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="date" stroke="#64748B" style={{ fontSize: '10px' }} angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#64748B" style={{ fontSize: '12px' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px' }} />
                        <Legend />
                        <Bar dataKey="savings" fill="#F59E0B" name="Savings (₹)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default Analytics;