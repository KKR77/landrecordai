import { Activity, Server, Database, Cpu, HardDrive, Wifi, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function SystemHealth() {
  const services = [
    {
      name: 'Next.js Frontend',
      status: 'healthy',
      uptime: '99.98%',
      latency: '45ms',
      icon: Server,
      details: 'Vercel Edge • 3 regions',
    },
    {
      name: 'Supabase (Postgres + PostGIS)',
      status: 'healthy',
      uptime: '99.99%',
      latency: '12ms',
      icon: Database,
      details: 'pgvector enabled • RLS active • 23 policies',
    },
    {
      name: 'Supabase Storage',
      status: 'healthy',
      uptime: '99.97%',
      latency: '89ms',
      icon: HardDrive,
      details: 'Document scans bucket • 14.2GB used',
    },
    {
      name: 'AI/CV Microservice (FastAPI)',
      status: 'healthy',
      uptime: '99.91%',
      latency: '2.3s',
      icon: Cpu,
      details: 'OpenCV + Tesseract + HuggingFace NER • GPU: NVIDIA A100',
    },
    {
      name: 'Supabase Edge Functions',
      status: 'healthy',
      uptime: '99.95%',
      latency: '156ms',
      icon: Wifi,
      details: 'SMS/WhatsApp dispatch • DILRMP webhook relay',
    },
    {
      name: 'Realtime Subscriptions',
      status: 'warning',
      uptime: '99.82%',
      latency: '34ms',
      icon: Activity,
      details: 'Admin queue updates • 2 disconnected clients',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-amber-600';
      case 'error': return 'text-red-600';
      default: return 'text-slate-400';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-50 border-green-200';
      case 'warning': return 'bg-amber-50 border-amber-200';
      case 'error': return 'bg-red-50 border-red-200';
      default: return 'bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Health</h1>
          <p className="text-sm text-slate-500 mt-1">Infrastructure and service monitoring</p>
        </div>
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-700">All systems operational</span>
        </div>
      </div>

      {/* Service Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => {
          const Icon = service.icon;
          return (
            <div
              key={service.name}
              className={`rounded-xl border p-5 ${getStatusBg(service.status)}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${getStatusColor(service.status)}`} />
                  <h3 className="text-sm font-semibold text-slate-900">{service.name}</h3>
                </div>
                {service.status === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Uptime</span>
                  <span className="font-medium text-slate-900">{service.uptime}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Latency</span>
                  <span className="font-medium text-slate-900">{service.latency}</span>
                </div>
                <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200/50">
                  {service.details}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Architecture Diagram */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">System Architecture</h3>
        <div className="bg-slate-900 rounded-lg p-6 text-xs font-mono text-slate-300 overflow-x-auto">
          <pre>{`┌─────────────────┐     ┌──────────────────────────────────┐
│  Next.js App    │────▶│  Supabase Edge Functions          │
│  (Frontend)     │     │  ┌─────────────────────────────┐  │
└─────────────────┘     │  │ SMS/WhatsApp + DILRMP       │  │
                        │  └─────────────────────────────┘  │
                        └──────────┬───────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
    ┌─────────▼─────────┐ ┌───────▼───────┐ ┌─────────▼──────────┐
    │ Postgres+PostGIS  │ │   Storage     │ │  AI/CV Microservice │
    │ +pgvector +RLS    │ │  (Scans)      │ │  (FastAPI, Python)  │
    └───────────────────┘ └───────────────┘ └─────────┬──────────┘
                                                      │
                              ┌────────────────────────┼──────────┐
                              │            │           │          │
                         ┌────▼───┐  ┌─────▼────┐ ┌───▼───┐ ┌───▼────┐
                         │ OpenCV │  │ Tesseract│ │HF NER │  │Forensic│
                         │Pre-proc│  │   OCR    │ │       │  │ELA/FFT │
                         └────────┘  └──────────┘ └───────┘  └────────┘`}</pre>
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Recent Incidents</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-900">DILRMP Webhook Timeout</p>
              <p className="text-xs text-slate-600 mt-0.5">External API timeout after 30s. Auto-retry scheduled with exponential backoff. 1 retry remaining.</p>
              <p className="text-[10px] text-slate-400 mt-1">2026-01-15 10:31 UTC • Auto-resolving</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-900">AI Service GPU Memory Spike</p>
              <p className="text-xs text-slate-600 mt-0.5">GPU memory usage hit 92% during batch processing. Auto-scaled to handle load. Resolved in 4 minutes.</p>
              <p className="text-[10px] text-slate-400 mt-1">2026-01-14 22:15 UTC • Resolved</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
