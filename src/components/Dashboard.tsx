import { 
  FileText, 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { SystemMetrics, QueueItem } from '../types';
import { mockMetrics, mockQueue } from '../data/mockData';
import { format } from 'date-fns';

interface DashboardProps {
  onNavigate: (view: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const metrics: SystemMetrics = mockMetrics;
  const recentItems: QueueItem[] = mockQueue.slice(0, 5);

  const metricCards = [
    {
      label: 'Total Documents',
      value: metrics.totalDocuments.toLocaleString(),
      change: '+12.3%',
      positive: true,
      icon: FileText,
      color: 'blue',
    },
    {
      label: 'Pending Review',
      value: metrics.pendingReview.toString(),
      change: '-5.2%',
      positive: true,
      icon: Clock,
      color: 'amber',
    },
    {
      label: 'Flagged Today',
      value: metrics.flaggedToday.toString(),
      change: '+2',
      positive: false,
      icon: AlertTriangle,
      color: 'red',
    },
    {
      label: 'Fraud Detection Rate',
      value: `${metrics.fraudDetectionRate}%`,
      change: '+1.8%',
      positive: true,
      icon: TrendingUp,
      color: 'green',
    },
  ];

  const colorMap: Record<string, { bg: string; icon: string; text: string }> = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', text: 'text-blue-600' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', text: 'text-amber-600' },
    red: { bg: 'bg-red-50', icon: 'text-red-600', text: 'text-red-600' },
    green: { bg: 'bg-green-50', icon: 'text-green-600', text: 'text-green-600' },
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'analyzed':
      case 'approved':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'flagged':
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      low: 'bg-slate-100 text-slate-600',
      medium: 'bg-blue-100 text-blue-700',
      high: 'bg-amber-100 text-amber-700',
      critical: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase ${styles[priority]}`}>
        {priority}
      </span>
    );
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Document verification system overview</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          System operational • Last sync: {format(new Date(), 'HH:mm:ss')}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          const colors = colorMap[card.color];
          return (
            <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${colors.icon}`} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${card.positive ? 'text-green-600' : 'text-red-600'}`}>
                  {card.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {card.change}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                <p className="text-xs text-slate-500 mt-1">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pipeline Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Processing Pipeline */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-slate-900">Processing Pipeline</h2>
            <span className="text-xs text-slate-400">Avg: {metrics.avgProcessingTime}s</span>
          </div>
          <div className="space-y-4">
            {[
              { stage: 'OCR (Tesseract)', accuracy: 94.7, active: 3 },
              { stage: 'NER (HuggingFace)', accuracy: 91.2, active: 2 },
              { stage: 'Forensic (ELA/PRNU/FFT)', accuracy: 89.8, active: 1 },
              { stage: 'Fraud Rules Engine', accuracy: 96.1, active: 4 },
            ].map((item) => (
              <div key={item.stage} className="flex items-center gap-4">
                <div className="w-48 text-sm text-slate-700 font-medium">{item.stage}</div>
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all"
                    style={{ width: `${item.accuracy}%` }}
                  ></div>
                </div>
                <span className="text-xs text-slate-500 w-12 text-right">{item.accuracy}%</span>
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                  {item.active} active
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-6">System Health</h2>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">OCR Accuracy</span>
              <span className="text-sm font-bold text-slate-900">{metrics.ocrAccuracy}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">API Latency (p95)</span>
              <span className="text-sm font-bold text-slate-900">234ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Supabase Status</span>
              <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                Healthy
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">AI Service</span>
              <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                Running
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Queue Depth</span>
              <span className="text-sm font-bold text-amber-600">{metrics.pendingReview}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Webhook Status</span>
              <span className="flex items-center gap-1.5 text-sm font-medium text-amber-600">
                <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                1 retry
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Recent Documents</h2>
          <button
            onClick={() => onNavigate('queue')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all →
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {recentItems.map((item) => (
            <div key={item.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
              {getStatusIcon(item.status)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{item.fileName}</p>
                <p className="text-xs text-slate-500">{item.uploadedBy}</p>
              </div>
              {getPriorityBadge(item.priority)}
              {item.tamperScore > 0 && (
                <div className="text-right">
                  <p className={`text-sm font-bold ${item.tamperScore > 50 ? 'text-red-600' : 'text-green-600'}`}>
                    {item.tamperScore}%
                  </p>
                  <p className="text-[10px] text-slate-400">tamper</p>
                </div>
              )}
              <span className="text-xs text-slate-400">
                {format(new Date(item.uploadedAt), 'HH:mm')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
