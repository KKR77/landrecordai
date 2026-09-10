import { useState } from 'react';
import { supabase } from '../lib/supabase/client';
import { Search, Send, AlertCircle, Loader2 } from 'lucide-react';

interface SearchResult {
  id: string;
  khasra_no: string;
  khata_no: string;
  owner_name: string;
  village: string;
  tehsil: string;
  district: string;
  area_declared: number;
  land_class: string;
  status: string;
  match_reason: string;
}

export default function AIRecordAssistant() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setHasSearched(true);

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

      // Call the structured query parser
      const { data, error: rpcError } = await (supabase as any).rpc('parse_and_search_records', {
        p_query: query,
        p_viewer_id: user.id,
        p_viewer_role: profile.role,
        p_viewer_tehsil_scope: profile.tehsil_scope,
        p_limit: 50,
      });

      if (rpcError) throw rpcError;

      setResults(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      verified: 'bg-green-100 text-green-800',
      disputed: 'bg-red-100 text-red-800',
      draft: 'bg-slate-100 text-slate-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || colors.draft}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">AI Record Assistant</h1>
        <p className="text-slate-600 mt-1">
          Search records using natural language queries
        </p>
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Structured Query Parser (Fallback Mode)</p>
              <p className="text-xs">
                This is a pattern-based query parser, not semantic search. It extracts filters like village name, 
                status, and area from your query. For best results, be specific: "disputed records in Rampur village" 
                or "agricultural land in Sadar tehsil with area {'>'} 5 acres".
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder='Try: "disputed records in Rampur village" or "agricultural land in Sadar tehsil"'
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Search
              </>
            )}
          </button>
        </div>

        {/* Example Queries */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-xs text-slate-500">Examples:</span>
          {[
            'disputed records in Rampur',
            'agricultural land in Sadar tehsil',
            'owner Ramesh Kumar',
            'area between 2 and 5 acres',
            'verified records in District A',
          ].map((example) => (
            <button
              key={example}
              onClick={() => setQuery(example)}
              className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Search Error</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Results */}
      {hasSearched && !loading && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">
              Search Results ({results.length})
            </h3>
          </div>

          {results.length === 0 ? (
            <div className="p-12 text-center">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No records found</p>
              <p className="text-sm text-slate-400 mt-1">
                Try adjusting your query or check the examples above
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Khasra
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Khata
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Village
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Tehsil
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Area
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Match Reason
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {results.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {record.khasra_no}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {record.khata_no}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {record.owner_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {record.village}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {record.tehsil}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {record.area_declared ? `${record.area_declared} acres` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(record.status)}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {record.match_reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {!hasSearched && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
          <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            Start Searching
          </h3>
          <p className="text-slate-600 max-w-md mx-auto">
            Enter a natural language query to search land records. The assistant will extract 
            filters and find matching records within your tehsil scope.
          </p>
        </div>
      )}
    </div>
  );
}
