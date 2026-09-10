import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Activity, FileText, AlertTriangle, CheckCircle, Clock, TrendingUp, AlertCircle } from 'lucide-react';

interface UploadStats {
  total_uploads: number;
  today_uploads: number;
  week_uploads: number;
  avg_processing_time: number;
}

interface CorrectionRate {
  date: string;
  total_processed: number;
  admin_corrections: number;
  correction_rate: number;
}

interface QueueBreakdown {
  tag: string;
  count: number;
}

interface TehsilProgress {
  tehsil_name: string;
  district_name: string;
  total_records: number;
  verified_records: number;
  pending_records: number;
  progress_percent: number;
}

interface FraudSummary {
  alert_type: string;
  severity: string;
  total_count: number;
  resolved_count: number;
  unresolved_count: number;
}

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [uploadStats, setUploadStats] = useState<UploadStats | null>(null);
  const [correctionRates, setCorrectionRates] = useState<CorrectionRate[]>([]);
  const [queueBreakdown, setQueueBreakdown] = useState<QueueBreakdown[]>([]);
  const [tehsilProgress, setTehsilProgress] = useState<TehsilProgress[]>([]);
  const [fraudSummary, setFraudSummary] = useState<FraudSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-amber-900 mb-2">
                Supabase Not Configured
              </h2>
              <p className="text-sm text-amber-800 mb-3">
                The Analytics Dashboard requires Supabase to be configured. Please set the following environment variables:
              </p>
              <ul className="text-sm text-amber-800 space-y-1 mb-3">
                <li><code className="bg-amber-100 px-2 py-0.5 rounded">VITE_SUPABASE_URL</code></li>
                <li><code className="bg-amber-100 px-2 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code></li>
              </ul>
              <p className="text-sm text-amber-800">
                See <code className="bg-amber-100 px-2 py-0.5 rounded">.env.example</code> for reference.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadAnalytics();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('analytics-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'uploads' }, () => {
        loadAnalytics();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'record_versions' }, () => {
        loadAnalytics();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fraud_alerts' }, () => {
        loadAnalytics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, tehsil_scope')
        .eq('id', user.id)
        .single();

      const profile = profileData as any;
      if (!profile) throw new Error('Profile not found');

      // Fetch all analytics data
      const [statsResult, correctionResult, queueResult, tehsilResult, fraudResult] = await Promise.all([
        (supabase as any).rpc('get_upload_stats', {
          p_viewer_id: user.id,
          p_viewer_role: profile.role,
          p_viewer_tehsil_scope: profile.tehsil_scope,
        }),
        (supabase as any).rpc('get_ocr_correction_rate', {
          p_viewer_id: user.id,
          p_viewer_role: profile.role,
          p_viewer_tehsil_scope: profile.tehsil_scope,
          p_days_back: 30,
        }),
        (supabase as any).rpc('get_queue_breakdown', {
          p_viewer_id: user.id,
          p_viewer_role: profile.role,
          p_viewer_tehsil_scope: profile.tehsil_scope,
        }),
        (supabase as any).rpc('get_tehsil_progress', {
          p_viewer_id: user.id,
          p_viewer_role: profile.role,
          p_viewer_tehsil_scope: profile.tehsil_scope,
        }),
        (supabase as any).rpc('get_fraud_summary', {
          p_viewer_id: user.id,
          p_viewer_role: profile.role,
          p_viewer_tehsil_scope: profile.tehsil_scope,
        }),
      ]);

      if (statsResult.error) throw statsResult.error;
      if (correctionResult.error) throw correctionResult.error;
      if (queueResult.error) throw queueResult.error;
      if (tehsilResult.error) throw tehsilResult.error;
      if (fraudResult.error) throw fraudResult.error;

      setUploadStats(statsResult.data as UploadStats);
      setCorrectionRates((correctionResult.data as CorrectionRate[]) || []);
      setQueueBreakdown((queueResult.data as QueueBreakdown[]) || []);
      setTehsilProgress((tehsilResult.data as TehsilProgress[]) || []);
      setFraudSummary((fraudResult.data as FraudSummary[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Activity className="w-12 h-12 text-blue-600 animate-pulse mx-auto mb-4" />
          <p className="text-slate-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800 font-medium">Error loading analytics</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h1>
        <p className="text-slate-600 mt-1">Real-time insights into document processing and system health</p>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Documents"
          value={uploadStats?.total_uploads || 0}
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Today's Uploads"
          value={uploadStats?.today_uploads || 0}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="This Week"
          value={uploadStats?.week_uploads || 0}
          icon={Clock}
          color="purple"
        />
        <StatCard
          title="Avg Processing Time"
          value={`${(uploadStats?.avg_processing_time || 0).toFixed(1)}s`}
          icon={Activity}
          color="orange"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OCR Correction Rate Trend */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">OCR Correction Rate</h3>
              <p className="text-xs text-slate-500 mt-1">
                Admin corrections as % of total (proxy for OCR accuracy)
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded px-2 py-1">
              <span className="text-xs text-amber-700 font-medium">Approximation</span>
            </div>
          </div>
          {correctionRates.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={correctionRates}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  formatter={(value: number) => [`${value.toFixed(2)}%`, 'Correction Rate']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="correction_rate"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', r: 4 }}
                  name="Correction Rate"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400">
              No correction data available
            </div>
          )}
        </div>

        {/* Queue Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Queue Breakdown</h3>
          {queueBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={queueBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="tag" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="Documents" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400">
              Queue is empty
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tehsil Progress */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Digitisation Progress by Tehsil</h3>
          {tehsilProgress.length > 0 ? (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {tehsilProgress.map((tehsil, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-slate-900">{tehsil.tehsil_name}</h4>
                      <p className="text-xs text-slate-500">{tehsil.district_name} District</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">{tehsil.progress_percent.toFixed(1)}%</p>
                      <p className="text-xs text-slate-500">Complete</p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${tehsil.progress_percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>{tehsil.verified_records} verified</span>
                    <span>{tehsil.pending_records} pending</span>
                    <span>{tehsil.total_records} total</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400">
              No tehsil data available
            </div>
          )}
        </div>

        {/* Fraud Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Fraud Alert Summary</h3>
          {fraudSummary.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={fraudSummary} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="alert_type"
                  tick={{ fontSize: 11 }}
                  width={120}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="resolved_count" stackId="a" fill="#10b981" name="Resolved" />
                <Bar dataKey="unresolved_count" stackId="a" fill="#ef4444" name="Unresolved" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400">
              No fraud alerts
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`${colorClasses[color]} p-3 rounded-lg`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
