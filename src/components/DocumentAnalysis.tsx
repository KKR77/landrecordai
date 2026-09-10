import { useState } from 'react';
import { 
  ArrowLeft, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Scan,
  Brain,
  Shield,
  Scale,
  Copy,
  ExternalLink
} from 'lucide-react';
import { DocumentAnalysis as AnalysisType } from '../types';
import { mockAnalysis, processingTimeline } from '../data/mockData';
import { format } from 'date-fns';

interface DocumentAnalysisProps {
  documentId: string;
  onBack: () => void;
}

export default function DocumentAnalysis({ documentId, onBack }: DocumentAnalysisProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'ocr' | 'ner' | 'forensic' | 'rules'>('overview');
  const doc: AnalysisType = mockAnalysis; // In production, fetch by documentId

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'ocr', label: 'OCR Results', icon: Scan },
    { id: 'ner', label: 'NER Entities', icon: Brain },
    { id: 'forensic', label: 'Forensic Analysis', icon: Shield },
    { id: 'rules', label: 'Fraud Rules', icon: Scale },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-green-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-red-50 border-red-200';
    if (score >= 50) return 'bg-amber-50 border-amber-200';
    return 'bg-green-50 border-green-200';
  };

  const getForensicColor = (score: number) => {
    if (score >= 70) return 'text-red-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-green-600';
  };

  const getForensicBarColor = (score: number) => {
    if (score >= 70) return 'bg-red-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-green-500';
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">{doc.fileName}</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase bg-red-100 text-red-700">
              {doc.status}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Uploaded by {doc.uploadedBy} • {format(new Date(doc.uploadedAt), 'MMM d, yyyy HH:mm')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            Reject
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
            Approve
          </button>
        </div>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Confidence Score */}
        <div className={`rounded-xl border p-5 ${getScoreBg(doc.confidenceScore)}`}>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Confidence Score</p>
          <p className={`text-3xl font-bold mt-2 ${getScoreColor(doc.confidenceScore)}`}>
            {doc.confidenceScore}%
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {doc.confidenceScore < 50 ? 'Low confidence — likely fraudulent' : 'High confidence — likely genuine'}
          </p>
        </div>

        {/* Tamper Score */}
        <div className={`rounded-xl border p-5 ${doc.tamperScore >= 50 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tamper Score</p>
          <p className={`text-3xl font-bold mt-2 ${doc.tamperScore >= 50 ? 'text-red-600' : 'text-green-600'}`}>
            {doc.tamperScore}%
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {doc.tamperScore >= 50 ? 'High tamper likelihood detected' : 'No significant tampering detected'}
          </p>
        </div>

        {/* Processing Time */}
        <div className="rounded-xl border p-5 bg-slate-50 border-slate-200">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Processing Time</p>
          <p className="text-3xl font-bold mt-2 text-slate-900">
            {(doc.processingTime / 1000).toFixed(1)}s
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {doc.fraudRules.filter(r => !r.passed).length} of {doc.fraudRules.length} rules failed
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Processing Timeline */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Processing Pipeline</h3>
              <div className="flex items-center gap-1">
                {processingTimeline.map((stage, idx) => (
                  <div key={stage.stage} className="flex-1">
                    <div className={`h-2 rounded-full ${
                      idx < processingTimeline.length - 1 ? 'bg-blue-500' : 'bg-green-500'
                    }`}></div>
                    <p className="text-[10px] text-slate-500 mt-1.5">{stage.stage}</p>
                    <p className="text-[10px] text-slate-400">{(stage.duration / 1000).toFixed(1)}s</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Document Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">Document Info</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">File Type</span>
                    <span className="text-slate-900 font-medium">{doc.fileType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">File Size</span>
                    <span className="text-slate-900 font-medium">{(doc.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Priority</span>
                    <span className="text-amber-600 font-medium uppercase text-xs">{doc.priority}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">Trace IDs</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-xs">Correlation:</span>
                    <code className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-700 truncate flex-1">
                      {doc.correlationId}
                    </code>
                    <button className="text-slate-400 hover:text-slate-600">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-xs">Idempotency:</span>
                    <code className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-700 truncate flex-1">
                      {doc.idempotencyKey}
                    </code>
                    <button className="text-slate-400 hover:text-slate-600">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Forensic Summary */}
            {doc.forensic && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Forensic Summary</h3>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'ELA', value: doc.forensic.ela, desc: 'Error Level Analysis' },
                    { label: 'PRNU', value: doc.forensic.prnu, desc: 'Sensor Pattern' },
                    { label: 'FFT', value: doc.forensic.fft, desc: 'Frequency Analysis' },
                    { label: 'Metadata', value: doc.forensic.metadata, desc: 'EXIF Integrity' },
                  ].map((item) => (
                    <div key={item.label} className="text-center p-3 bg-slate-50 rounded-lg">
                      <p className={`text-lg font-bold ${getForensicColor(item.value)}`}>{item.value}%</p>
                      <p className="text-[10px] font-medium text-slate-700">{item.label}</p>
                      <p className="text-[9px] text-slate-400">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ocr' && doc.ocr && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Extracted Text</h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">Language: {doc.ocr.language}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  doc.ocr.confidence > 90 ? 'bg-green-100 text-green-700' : 
                  doc.ocr.confidence > 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                }`}>
                  {doc.ocr.confidence}% confidence
                </span>
              </div>
            </div>
            
            {/* OCR Text */}
            <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-green-400 whitespace-pre-wrap">
              {doc.ocr.text}
            </div>

            {/* Extracted Fields */}
            <div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">Extracted Fields</h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(doc.ocr.fields).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <span className="text-xs text-slate-500 capitalize w-28">{key.replace(/_/g, ' ')}:</span>
                    <span className="text-sm font-medium text-slate-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ner' && doc.ner && (
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-slate-900">Named Entity Recognition Results</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Names */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">
                  👤 Names ({doc.ner.names.length})
                </h4>
                <div className="space-y-2">
                  {doc.ner.names.map((name, i) => (
                    <span key={i} className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full mr-2 mb-1">
                      {name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                <h4 className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-3">
                  📅 Dates ({doc.ner.dates.length})
                </h4>
                <div className="space-y-2">
                  {doc.ner.dates.map((date, i) => (
                    <span key={i} className="inline-block bg-purple-100 text-purple-800 text-sm px-3 py-1 rounded-full mr-2 mb-1">
                      {date}
                    </span>
                  ))}
                </div>
              </div>

              {/* Document Numbers */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-3">
                  🔢 Document Numbers ({doc.ner.documentNumbers.length})
                </h4>
                <div className="space-y-2">
                  {doc.ner.documentNumbers.map((num, i) => (
                    <span key={i} className="inline-block bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full mr-2 mb-1 font-mono">
                      {num}
                    </span>
                  ))}
                </div>
              </div>

              {/* Organizations */}
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">
                  🏢 Organizations ({doc.ner.organizations.length})
                </h4>
                <div className="space-y-2">
                  {doc.ner.organizations.map((org, i) => (
                    <span key={i} className="inline-block bg-amber-100 text-amber-800 text-sm px-3 py-1 rounded-full mr-2 mb-1">
                      {org}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'forensic' && doc.forensic && (
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-slate-900">Forensic Analysis Results</h3>
            <p className="text-sm text-slate-500">
              Higher scores indicate higher likelihood of manipulation in each analysis method.
            </p>

            <div className="space-y-5">
              {[
                { 
                  label: 'Error Level Analysis (ELA)', 
                  value: doc.forensic.ela,
                  desc: 'Detects regions with different compression levels. Inconsistencies suggest image regions were added or modified after original capture.',
                  detail: 'Name region shows ELA level 3x higher than background'
                },
                { 
                  label: 'Photo Response Non-Uniformity (PRNU)', 
                  value: doc.forensic.prnu,
                  desc: 'Analyzes sensor noise patterns unique to each camera. Mismatches indicate regions from different source images.',
                  detail: 'Lower-right quadrant PRNU pattern does not match rest of image'
                },
                { 
                  label: 'Fast Fourier Transform (FFT)', 
                  value: doc.forensic.fft,
                  desc: 'Frequency domain analysis reveals periodic patterns invisible in spatial domain. Clone-stamp and copy-paste artifacts.',
                  detail: 'Periodic pattern at 45° suggests systematic manipulation'
                },
                { 
                  label: 'Metadata Integrity', 
                  value: doc.forensic.metadata,
                  desc: 'Checks EXIF data completeness and consistency. Stripped or modified metadata is a red flag.',
                  detail: 'All EXIF data stripped — no camera model, timestamp, or GPS data'
                },
              ].map((item) => (
                <div key={item.label} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-slate-900">{item.label}</h4>
                    <span className={`text-lg font-bold ${getForensicColor(item.value)}`}>{item.value}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getForensicBarColor(item.value)}`}
                      style={{ width: `${item.value}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                  <p className="text-xs text-slate-700 mt-1.5 font-medium">⚠️ {item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Fraud Detection Rules</h3>
              <span className="text-xs text-slate-500">
                {doc.fraudRules.filter(r => r.passed).length}/{doc.fraudRules.length} passed
              </span>
            </div>

            <div className="space-y-3">
              {doc.fraudRules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-4 rounded-lg border ${
                    rule.passed
                      ? 'bg-green-50 border-green-100'
                      : rule.severity === 'critical'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {rule.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : rule.severity === 'critical' ? (
                      <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-slate-900">{rule.name}</h4>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase ${
                          rule.severity === 'critical' ? 'bg-red-100 text-red-700' :
                          rule.severity === 'warning' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {rule.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{rule.message}</p>
                    </div>
                    <span className={`text-xs font-medium ${rule.passed ? 'text-green-600' : 'text-red-600'}`}>
                      {rule.passed ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Processed in {(doc.processingTime / 1000).toFixed(1)}s
          </span>
          <span className="flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            Correlation: {doc.correlationId.slice(0, 20)}...
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
            Re-run Analysis
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
            <span className="flex items-center gap-1.5">
              <XCircle className="w-4 h-4" />
              Reject Document
            </span>
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Approve Document
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
