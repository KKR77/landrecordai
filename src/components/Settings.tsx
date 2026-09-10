import { useState } from 'react';
import { Save, RefreshCw, Shield, Bell, Database, Key } from 'lucide-react';

export default function Settings() {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">System configuration and environment variables</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {saved ? (
            <>
              <Shield className="w-4 h-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Environment Check */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-900">Environment Validation</h3>
            <p className="text-xs text-amber-700 mt-1">
              Startup checks verify all required env vars. Missing vars cause loud failure — no silent defaults.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'AI_SERVICE_URL', 'SMS_API_KEY', 'WHATSAPP_TOKEN', 'DILRMP_WEBHOOK_URL'].map((envVar) => (
                <div key={envVar} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <code className="text-[10px] font-mono text-amber-800">{envVar}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supabase Config */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-900">Supabase Configuration</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Project URL</label>
              <input
                type="text"
                defaultValue="https://xxxxx.supabase.co"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                readOnly
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">RLS Policies Active</label>
              <div className="text-sm bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2">
                23 policies • All tables protected
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Realtime Enabled</label>
              <div className="flex items-center gap-2">
                <div className="w-10 h-5 bg-blue-500 rounded-full relative cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                </div>
                <span className="text-xs text-slate-600">Active for admin_queue table</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Service Config */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-semibold text-slate-900">AI/CV Microservice</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Service URL</label>
              <input
                type="text"
                defaultValue="https://ai-service.internal:8000"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Timeout (seconds)</label>
              <input
                type="number"
                defaultValue={60}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Retry Count</label>
              <input
                type="number"
                defaultValue={3}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>

        {/* Notification Config */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-green-600" />
            <h3 className="text-sm font-semibold text-slate-900">Notification Channels</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-900">SMS Gateway</p>
                <p className="text-[10px] text-slate-500">Twilio / MSG91</p>
              </div>
              <div className="w-10 h-5 bg-green-500 rounded-full relative cursor-pointer">
                <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5"></div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-900">WhatsApp Business API</p>
                <p className="text-[10px] text-slate-500">Meta Cloud API</p>
              </div>
              <div className="w-10 h-5 bg-green-500 rounded-full relative cursor-pointer">
                <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5"></div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-900">DILRMP Webhook</p>
                <p className="text-[10px] text-slate-500">Gov verification endpoint</p>
              </div>
              <div className="w-10 h-5 bg-green-500 rounded-full relative cursor-pointer">
                <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Config */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-semibold text-slate-900">Security</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
              <div>
                <p className="text-sm font-medium text-slate-900">RLS Enforcement</p>
                <p className="text-[10px] text-slate-500">Non-negotiable — cannot be disabled</p>
              </div>
              <div className="w-10 h-5 bg-green-500 rounded-full relative">
                <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5"></div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-900">Idempotency Keys</p>
                <p className="text-[10px] text-slate-500">Prevent duplicate processing</p>
              </div>
              <div className="w-10 h-5 bg-green-500 rounded-full relative">
                <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5"></div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-900">Auth Checks</p>
                <p className="text-[10px] text-slate-500">All API routes protected</p>
              </div>
              <div className="w-10 h-5 bg-green-500 rounded-full relative">
                <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl border border-red-200 p-5">
        <h3 className="text-sm font-semibold text-red-900 mb-4 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Danger Zone
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-900">Reset all processing queues</p>
            <p className="text-xs text-slate-500">This will re-queue all documents for re-processing</p>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
            Reset Queues
          </button>
        </div>
      </div>
    </div>
  );
}
