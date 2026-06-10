import React, { useState, useEffect } from 'react';
import { RefreshCw, Activity, Search } from 'lucide-react';
import api from '../services/api';
import RefreshButton from './RefreshButton';
import { useLiveData } from '../hooks/useLiveData';

interface LogsModuleProps {
  moduleFilter?: string;
  title?: string;
}

const LogsModule: React.FC<LogsModuleProps> = ({ moduleFilter, title = 'System Activity Logs' }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const url = moduleFilter ? `/system/logs?module=${encodeURIComponent(moduleFilter)}` : '/system/logs';
      const res = await api.get(url);
      setLogs(res.data.logs || []);
    } catch (e) {
      console.error('Failed to fetch logs');
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  const { refresh, refreshing } = useLiveData(['system', 'all'], () => fetchLogs({ silent: true }));

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    (log.user_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (log.action_type || '').toLowerCase().includes(search.toLowerCase()) ||
    (log.module || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading && logs.length === 0) return (
    <div className="flex flex-col justify-center items-center h-96 gap-4">
      <RefreshCw className="animate-spin text-indigo-500" size={32} />
      <span className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Loading Logs...</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900/60 p-6 rounded-[2rem] border border-white/5">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Activity className="text-indigo-400" /> {title}
          </h2>
          <p className="text-slate-400 text-sm mt-1">Track every change — create, update, delete, restore</p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton onClick={refresh} loading={refreshing} />
          <div className="relative w-64 group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Search logs..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm outline-none focus:border-indigo-500/50 transition-all text-white"
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Module</th>
                <th className="px-6 py-4">Panel</th>
                <th className="px-6 py-4">Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors text-sm">
                  <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td className="px-6 py-4 font-bold text-white">
                    {log.user_name || 'System'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold tracking-widest border
                      ${log.action_type === 'CREATE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                        log.action_type === 'DELETE' || log.action_type === 'DELETE_TO_TRASH' || log.action_type === 'PERMANENT_DELETE' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                        log.action_type === 'RESTORE' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-blue-500/10 text-blue-400 border-blue-500/20'}
                    `}>
                      {log.action_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{log.module}</td>
                  <td className="px-6 py-4 text-slate-400">{log.panel}</td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs max-h-24 overflow-y-auto custom-scrollbar bg-slate-950 p-2 rounded-lg border border-white/5">
                      {log.old_value && (
                        <div className="text-[10px] text-red-400 mb-1 font-mono break-all">
                          Old: {JSON.stringify(log.old_value)}
                        </div>
                      )}
                      {log.new_value && (
                        <div className="text-[10px] text-emerald-400 font-mono break-all">
                          New: {JSON.stringify(log.new_value)}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLogs.length === 0 && (
            <div className="text-center py-16 text-slate-600 italic text-sm">No logs found.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogsModule;
