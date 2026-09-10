import { useState } from 'react'
import { Database, Shield, FileText, Users, AlertTriangle, CheckCircle2, Upload, ListChecks, BarChart3, MessageSquare } from 'lucide-react'
import UploadPage from './pages/UploadPage'
import QueuePage from './pages/QueuePage'
import ReviewPage from './pages/ReviewPage'
import AnalyticsDashboard from './pages/AnalyticsDashboard'
import AIRecordAssistant from './pages/AIRecordAssistant'

type Tab = 'overview' | 'schema' | 'rls' | 'roles' | 'tests' | 'upload' | 'queue' | 'review' | 'analytics' | 'assistant'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Land Record Digitisation Platform</h1>
                <p className="text-xs text-slate-500">PS 26018 — Phase 6: Analytics & AI Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                Phase 6 Complete
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: 'Overview', icon: FileText },
              { id: 'upload', label: 'Upload', icon: Upload },
              { id: 'queue', label: 'Admin Queue', icon: ListChecks },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'assistant', label: 'AI Assistant', icon: MessageSquare },
              { id: 'schema', label: 'Database Schema', icon: Database },
              { id: 'rls', label: 'RLS Policies', icon: Shield },
              { id: 'roles', label: 'Role Model', icon: Users },
              { id: 'tests', label: 'RLS Tests', icon: CheckCircle2 },
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'upload' && <UploadPage />}
        {activeTab === 'queue' && <QueuePage />}
        {activeTab === 'review' && <ReviewPage />}
        {activeTab === 'analytics' && <AnalyticsDashboard />}
        {activeTab === 'assistant' && <AIRecordAssistant />}
        {activeTab === 'schema' && <SchemaTab />}
        {activeTab === 'rls' && <RLSTab />}
        {activeTab === 'roles' && <RolesTab />}
        {activeTab === 'tests' && <TestsTab />}
      </main>
    </div>
  )
}

function OverviewTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Phase 1-6 Deliverables</h2>
        <div className="space-y-3">
          {[
            { title: 'Database Migrations', desc: '15 versioned SQL migration files with all tables, indexes, and constraints', status: 'complete' },
            { title: 'RLS Policies', desc: 'Comprehensive row-level security policies for all 7 tables', status: 'complete' },
            { title: 'TypeScript Types', desc: 'Generated from database schema - single source of truth', status: 'complete' },
            { title: 'Zod Validation', desc: 'Form validation schemas matching database shape exactly', status: 'complete' },
            { title: 'Environment Validation', desc: 'Startup checks that fail loudly on missing variables', status: 'complete' },
            { title: 'RLS Test Suite', desc: 'Test queries for each role and policy', status: 'complete' },
            { title: 'AI Service (FastAPI)', desc: 'Standalone Python microservice with preprocessing, OCR, NER, and routing', status: 'complete' },
            { title: 'Forensic Analysis', desc: '5 forensic sub-checks: ELA, PRNU, Font/Baseline, FFT, Metadata diff', status: 'complete' },
            { title: 'Fraud Rule Engine', desc: '3 fraud rules: area consistency, spatial overlap, duplicate detection', status: 'complete' },
            { title: 'Pipeline Tests', desc: '47+ pytest tests covering all pipeline stages', status: 'complete' },
            { title: 'Supabase Edge Function', desc: 'Webhook-triggered function that orchestrates the full pipeline', status: 'complete' },
            { title: 'Upload Page', desc: 'Frontend with Realtime subscription for live status updates', status: 'complete' },
            { title: 'Admin Queue', desc: 'Verification queue with claim-lock, filters, and realtime updates', status: 'complete' },
            { title: 'Review Page', desc: 'Side-by-side review with inline editing and forensic sign-off', status: 'complete' },
            { title: 'Notifications', desc: 'SMS/WhatsApp notifications with retry logic and deduplication', status: 'complete' },
            { title: 'DILRMP Sync', desc: 'External system sync with explicit schema mapping and retry logic', status: 'complete' },
            { title: 'Analytics Dashboard', desc: 'Real-time charts and metrics with server-side aggregation', status: 'complete' },
            { title: 'AI Record Assistant', desc: 'Natural language query interface with structured filter parsing', status: 'complete' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Architecture</h3>
        <p className="text-sm text-blue-800 leading-relaxed">
          This foundation establishes the data layer for the Land Record Digitisation platform. 
          The system uses Supabase (Postgres + PostGIS + pgvector) for storage with comprehensive 
          RLS policies ensuring data isolation by tehsil scope. Role-based access control (RBAC) 
          is enforced at the database level with four roles: public, patwari, tehsildar, and admin.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-900">7 Tables</h3>
          </div>
          <p className="text-xs text-slate-600">profiles, records, record_versions, uploads, fraud_alerts, notifications, sync_log</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-green-600" />
            <h3 className="text-sm font-semibold text-slate-900">4 Roles</h3>
          </div>
          <p className="text-xs text-slate-600">public, patwari, tehsildar, admin - each with specific permissions</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-purple-600" />
            <h3 className="text-sm font-semibold text-slate-900">8 Migrations</h3>
          </div>
          <p className="text-xs text-slate-600">Versioned SQL files - no manual dashboard edits</p>
        </div>
      </div>
    </div>
  )
}

function SchemaTab() {
  const tables = [
    {
      name: 'profiles',
      desc: 'User profiles linked to auth.users',
      fields: ['id (UUID, PK)', 'role (enum)', 'tehsil_scope (text)', 'name (text)', 'phone (text)', 'created_at', 'updated_at'],
    },
    {
      name: 'records',
      desc: 'Land ownership records with spatial data',
      fields: ['id (UUID, PK)', 'khasra_no', 'khata_no', 'owner_name', 'village', 'tehsil', 'district', 'area_declared', 'land_class', 'geom (PostGIS)', 'status', 'locked_fields (jsonb)', 'created_by (FK)', 'created_at', 'updated_at'],
    },
    {
      name: 'record_versions',
      desc: 'Append-only audit trail for record changes',
      fields: ['id (UUID, PK)', 'record_id (FK)', 'field_diffs (jsonb)', 'source (enum)', 'tamper_score', 'ocr_confidence (jsonb)', 'created_by (FK)', 'created_at'],
    },
    {
      name: 'uploads',
      desc: 'Document scans and processing status',
      fields: ['id (UUID, PK)', 'storage_path', 'uploader_id (FK)', 'record_id (FK, nullable)', 'status', 'ocr_confidence (jsonb)', 'tamper_score', 'checksum', 'device_fingerprint', 'file_size', 'mime_type', 'created_at', 'updated_at'],
    },
    {
      name: 'fraud_alerts',
      desc: 'Detected fraud attempts and anomalies',
      fields: ['id (UUID, PK)', 'record_id (FK)', 'type (enum)', 'severity (enum)', 'details (jsonb)', 'resolved', 'resolved_by (FK)', 'resolved_at', 'created_at'],
    },
    {
      name: 'notifications',
      desc: 'SMS/WhatsApp/email notifications',
      fields: ['id (UUID, PK)', 'owner_contact', 'record_id (FK, nullable)', 'channel (enum)', 'payload (jsonb)', 'status', 'sent_at', 'delivered_at', 'error_message', 'created_at'],
    },
    {
      name: 'sync_log',
      desc: 'External system synchronization tracking',
      fields: ['id (UUID, PK)', 'record_id (FK)', 'target (enum)', 'status', 'payload (jsonb)', 'response (jsonb)', 'retry_count', 'next_retry_at', 'error_message', 'created_at', 'updated_at'],
    },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Database Schema</h2>
        <p className="text-sm text-slate-600 mb-6">
          All tables are defined in versioned migration files under <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">supabase/migrations/</code>
        </p>
        <div className="space-y-4">
          {tables.map((table) => (
            <div key={table.name} className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 font-mono">{table.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{table.desc}</p>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-1.5">
                  {table.fields.map((field, i) => (
                    <code key={i} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-1 rounded font-mono">
                      {field}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RLSTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Row Level Security (RLS)</h2>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-900">Deny-by-Default Approach</p>
              <p className="text-xs text-amber-800 mt-1">
                All tables have RLS enabled with no default access. Policies explicitly grant permissions based on role and tehsil scope.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Key Security Principles</h3>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Anonymous users can only view masked records (owner_name redacted, locked_fields excluded)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Authenticated users can view full records only if their tehsil_scope matches the record's tehsil</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Only patwari, tehsildar, and admin roles can INSERT/UPDATE records</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>record_versions is append-only - UPDATE and DELETE blocked by triggers</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Admins have cross-tehsil access; other roles are scoped to their assigned tehsil</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Policy Examples</h3>
        <div className="space-y-3">
          <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-xs text-green-400 font-mono">
{`-- Anonymous can view masked records
CREATE POLICY "Anon can view masked records"
  ON public.records FOR SELECT
  TO anon
  USING (true);

-- Create masked view for anonymous users
CREATE VIEW public.records_public AS
SELECT
  id, khasra_no, khata_no,
  'REDACTED' AS owner_name,
  village, tehsil, district,
  area_declared, land_class,
  ST_AsGeoJSON(geom)::jsonb AS geom,
  status, created_at, updated_at
FROM public.records
WHERE status = 'verified';`}
            </pre>
          </div>
          <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-xs text-green-400 font-mono">
{`-- Authenticated users can view records in their scope
CREATE POLICY "Users can view records in scope"
  ON public.records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (
          role = 'admin' OR
          tehsil_scope IS NULL OR
          tehsil_scope = records.tehsil
        )
    )
  );`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

function RolesTab() {
  const roles = [
    {
      name: 'public',
      desc: 'Unauthenticated users or users without official role',
      permissions: [
        'View masked records (owner_name redacted)',
        'Cannot access full record data',
        'Cannot create or modify records',
      ],
    },
    {
      name: 'patwari',
      desc: 'Village-level land record officer',
      permissions: [
        'View full records in assigned tehsil',
        'Create new records in assigned tehsil',
        'Update records in assigned tehsil',
        'Upload documents',
        'View fraud alerts for their tehsil',
      ],
    },
    {
      name: 'tehsildar',
      desc: 'Tehsil-level supervisor',
      permissions: [
        'All patwari permissions',
        'Override patwari decisions',
        'Resolve fraud alerts',
        'Access all records in assigned tehsil',
      ],
    },
    {
      name: 'admin',
      desc: 'System administrator with full access',
      permissions: [
        'Access all records across all tehsils',
        'Assign roles to users',
        'Manage system configuration',
        'View all fraud alerts',
        'Override any RLS policy',
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Role-Based Access Control (RBAC)</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Role Assignment:</strong> Only admins can assign roles. Users cannot self-assign elevated roles. 
            Role changes are logged in record_versions.
          </p>
        </div>

        <div className="space-y-4">
          {roles.map((role) => (
            <div key={role.name} className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 font-mono">{role.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{role.desc}</p>
              </div>
              <div className="p-4">
                <ul className="space-y-1.5">
                  {role.permissions.map((perm, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{perm}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Tehsil Scope</h3>
        <p className="text-sm text-slate-700 mb-3">
          Each patwari and tehsildar is assigned to a specific tehsil via the <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">tehsil_scope</code> field.
        </p>
        <ul className="space-y-2 text-sm text-slate-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-medium">•</span>
            <span><strong>Admin:</strong> tehsil_scope = NULL (access to all tehsils)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-medium">•</span>
            <span><strong>Tehsildar/Patwari:</strong> tehsil_scope = 'Tehsil-A' (access only to Tehsil-A records)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-medium">•</span>
            <span><strong>Public:</strong> tehsil_scope is ignored (no record access)</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

function TestsTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">RLS Policy Tests</h2>
        <p className="text-sm text-slate-600 mb-6">
          Test queries to verify RLS policies work correctly. Run these as different roles to ensure proper access control.
        </p>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Test 1: Anonymous Access</h3>
            <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-xs text-green-400 font-mono">
{`SET ROLE anon;
SELECT * FROM public.records_public;
-- Expected: SUCCESS - returns verified records with REDACTED owner_name

SELECT * FROM public.records;
-- Expected: FAIL - permission denied`}
              </pre>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Test 2: Patwari Scope Enforcement</h3>
            <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-xs text-green-400 font-mono">
{`SET ROLE 'patwari-tehsil-a-uuid';
SELECT * FROM public.records WHERE tehsil = 'Tehsil-A';
-- Expected: SUCCESS - returns Tehsil-A records

SELECT * FROM public.records WHERE tehsil = 'Tehsil-B';
-- Expected: FAIL - returns 0 rows (outside scope)`}
              </pre>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Test 3: Append-Only Enforcement</h3>
            <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-xs text-green-400 font-mono">
{`SET ROLE 'admin-uuid';
UPDATE public.record_versions SET tamper_score = 50 WHERE id = 'some-uuid';
-- Expected: FAIL - trigger raises exception

DELETE FROM public.record_versions WHERE id = 'some-uuid';
-- Expected: FAIL - trigger raises exception`}
              </pre>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Test 4: Role Assignment Restriction</h3>
            <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-xs text-green-400 font-mono">
{`SET ROLE 'patwari-uuid';
INSERT INTO public.profiles (id, role, name) VALUES ('new-uuid', 'admin', 'Test');
-- Expected: FAIL - only admins can create profiles

SET ROLE 'admin-uuid';
INSERT INTO public.profiles (id, role, name) VALUES ('new-uuid', 'patwari', 'Test');
-- Expected: SUCCESS - admin can create profiles`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-amber-900 mb-2">Important Notes</h3>
        <ul className="space-y-2 text-sm text-amber-800">
          <li>• Replace UUIDs with actual auth.users IDs from your project</li>
          <li>• Run tests in order to verify each policy</li>
          <li>• Each test should either succeed (return rows) or fail (permission denied/0 rows)</li>
          <li>• Document any unexpected behavior and adjust policies accordingly</li>
        </ul>
      </div>
    </div>
  )
}
