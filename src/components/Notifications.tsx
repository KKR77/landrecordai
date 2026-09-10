import { MessageSquare, Send, Globe, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { mockNotifications } from '../data/mockData';
import { format } from 'date-fns';

export default function Notifications() {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'sms':
        return <Send className="w-4 h-4 text-blue-500" />;
      case 'webhook':
        return <Globe className="w-4 h-4 text-purple-500" />;
      default:
        return <Send className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      sent: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      pending: 'bg-amber-100 text-amber-700',
    };
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      whatsapp: 'bg-green-50 text-green-700 border-green-200',
      sms: 'bg-blue-50 text-blue-700 border-blue-200',
      webhook: 'bg-purple-50 text-purple-700 border-purple-200',
      email: 'bg-slate-50 text-slate-700 border-slate-200',
    };
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase border ${styles[type]}`}>
        {type}
      </span>
    );
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">
            SMS, WhatsApp, and webhook delivery status
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-slate-600">SMS Gateway: Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-slate-600">WhatsApp API: Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
            <span className="text-slate-600">DILRMP Webhook: 1 retry</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Total Sent</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">1,247</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Failed</p>
          <p className="text-2xl font-bold text-red-600 mt-1">12</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Pending</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">3</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Success Rate</p>
          <p className="text-2xl font-bold text-green-600 mt-1">99.0%</p>
        </div>
      </div>

      {/* Notification List */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Recent Notifications</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {mockNotifications.map((notif) => (
            <div key={notif.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
              <div className="mt-0.5">{getTypeIcon(notif.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getTypeBadge(notif.type)}
                  {getStatusBadge(notif.status)}
                </div>
                <p className="text-sm text-slate-900 mt-1.5">{notif.message}</p>
                <div className="flex items-center gap-4 mt-1.5">
                  <span className="text-xs text-slate-500">To: {notif.recipient}</span>
                  <span className="text-xs text-slate-400">
                    {format(new Date(notif.timestamp), 'MMM d, HH:mm:ss')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {notif.correlationId}
                  </span>
                </div>
              </div>
              {getStatusIcon(notif.status)}
            </div>
          ))}
        </div>
      </div>

      {/* Webhook Config */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">DILRMP Webhook Configuration</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Endpoint URL</label>
            <code className="text-xs bg-slate-100 px-3 py-2 rounded-lg block text-slate-700 font-mono">
              https://dilrmp.gov.in/api/verify
            </code>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Retry Policy</label>
            <div className="text-sm text-slate-700 bg-slate-100 px-3 py-2 rounded-lg">
              3 retries • Exponential backoff (2s, 4s, 8s)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
