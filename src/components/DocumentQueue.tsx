import { useState } from 'react';
import { 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  AlertTriangle,
  Eye,
  ArrowUpDown
} from 'lucide-react';
import { QueueItem, DocumentStatus, Priority } from '../types';
import { mockQueue } from '../data/mockData';
import { format } from 'date-fns';

interface DocumentQueueProps {
  onSelectDocument: (id: string) => void;
}

export default function DocumentQueue({ onSelectDocument }: DocumentQueueProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [sortBy, setSortBy] = useState<'time' | 'priority' | 'tamper'>('time');

  const filteredQueue = mockQueue
    .filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;
      if (searchTerm && !item.fileName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      if (sortBy === 'tamper') return b.tamperScore - a.tamperScore;
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    });

  const getStatusBadge = (status: DocumentStatus) => {
    const styles: Record<DocumentStatus, string> = {
      pending: 'bg-slate-100 text-slate-600',
      processing: 'bg-blue-100 text-blue-700',
      analyzed: 'bg-green-100 text-green-700',
      flagged: 'bg-red-100 text-red-700',
      approved: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const getStatusIcon = (status: DocumentStatus) => {
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

  const getPriorityBadge = (priority: Priority) => {
    const styles: Record<Priority, string> = {
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

  const getStageProgress = (stage: string) => {
    const stages = ['upload', 'ocr', 'ner', 'forensic', 'fraud_rules', 'complete'];
    const idx = stages.indexOf(stage);
    return ((idx + 1) / stages.length) * 100;
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Queue</h1>
          <p className="text-sm text-slate-500 mt-1">
            {filteredQueue.length} documents • {mockQueue.filter(i => i.status === 'flagged').length} flagged for review
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as DocumentStatus | 'all')}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="analyzed">Analyzed</option>
              <option value="flagged">Flagged</option>
            </select>
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Priority</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'time' | 'priority' | 'tamper')}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="time">Sort by Time</option>
              <option value="priority">Sort by Priority</option>
              <option value="tamper">Sort by Tamper Score</option>
            </select>
          </div>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filteredQueue.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">No documents found</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Status</th>
                  <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Document</th>
                  <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Priority</th>
                  <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Progress</th>
                  <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Tamper</th>
                  <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Confidence</th>
                  <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Time</th>
                  <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQueue.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        {getStatusBadge(item.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900">{item.fileName}</p>
                      <p className="text-xs text-slate-500">{item.uploadedBy}</p>
                    </td>
                    <td className="px-6 py-4">{getPriorityBadge(item.priority)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
                              item.status === 'flagged' ? 'bg-red-500' : 
                              item.status === 'analyzed' ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${getStageProgress(item.currentStage)}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] text-slate-500 capitalize">{item.currentStage}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {item.tamperScore > 0 ? (
                        <span className={`text-sm font-bold ${item.tamperScore > 50 ? 'text-red-600' : 'text-green-600'}`}>
                          {item.tamperScore}%
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {item.confidenceScore > 0 ? (
                        <span className={`text-sm font-bold ${item.confidenceScore > 70 ? 'text-green-600' : item.confidenceScore > 40 ? 'text-amber-600' : 'text-red-600'}`}>
                          {item.confidenceScore}%
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-500">
                        {format(new Date(item.uploadedAt), 'MMM d, HH:mm')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => onSelectDocument(item.id)}
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
