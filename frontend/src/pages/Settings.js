import React, { useState, useEffect } from 'react';
import { Sun, ArrowLeft, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { useAuthStore } from '../stores/authStore';
import api from '../utils/api';
import { toast } from 'sonner';

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const response = await api.get('/sites');
      setSites(response.data);
    } catch (error) {
      toast.error('Failed to load sites');
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (format) => {
    try {
      const response = await api.get('/readings/latest?limit=1000');
      const data = response.data;

      if (format === 'csv') {
        const csv = [
          ['Timestamp', 'Voltage (V)', 'Current (A)', 'Power (W)'],
          ...data.map(r => [r.timestamp, r.voltage, r.current, r.power])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `solar-data-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        toast.success('Data exported as CSV');
      } else if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `solar-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        toast.success('Data exported as JSON');
      }
    } catch (error) {
      toast.error('Export failed');
    }
  };

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
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Settings</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* User Profile */}
        <Card className="shadow-sm border-slate-100" data-testid="user-profile-card">
          <CardHeader>
            <CardTitle className="text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>User Profile</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input value={user?.full_name || ''} disabled />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={user?.email || ''} disabled />
            </div>
          </CardContent>
        </Card>

        {/* Sites Management */}
        <Card className="shadow-sm border-slate-100" data-testid="sites-management-card">
          <CardHeader>
            <CardTitle className="text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Solar Sites</CardTitle>
            <CardDescription>Manage your solar energy installations</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-slate-600">Loading sites...</p>
            ) : sites.length === 0 ? (
              <p className="text-slate-600">No sites configured</p>
            ) : (
              <div className="space-y-4">
                {sites.map((site) => (
                  <div key={site.id} className="p-4 border border-slate-200 rounded-lg" data-testid="site-item">
                    <h3 className="font-semibold text-slate-900">{site.name}</h3>
                    <p className="text-sm text-slate-600">{site.location}</p>
                    <p className="text-sm text-slate-600">Capacity: {site.capacity_kw} kW</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Export */}
        <Card className="shadow-sm border-slate-100" data-testid="data-export-card">
          <CardHeader>
            <CardTitle className="text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Export Data</CardTitle>
            <CardDescription>Download your energy monitoring data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button
                onClick={() => exportData('csv')}
                data-testid="export-csv-btn"
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Export as CSV
              </Button>
              <Button
                onClick={() => exportData('json')}
                data-testid="export-json-btn"
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Export as JSON
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card className="shadow-sm border-slate-100" data-testid="system-info-card">
          <CardHeader>
            <CardTitle className="text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600">Version</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Data Source</span>
              <span className="font-medium">ThingSpeak IoT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Real-time Updates</span>
              <span className="font-medium text-emerald-600">Enabled</span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Settings;