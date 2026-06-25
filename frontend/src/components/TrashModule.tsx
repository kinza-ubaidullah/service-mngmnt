import React, { useState, useEffect } from 'react';
import { RefreshCw, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import RefreshButton from './RefreshButton';
import { useLiveData } from '../hooks/useLiveData';

interface TrashModuleProps {
  modelFilter?: string;
  title?: string;
}

const TrashModule: React.FC<TrashModuleProps> = ({ modelFilter, title = 'Trash Bin' }) => {
  const [trashItems, setTrashItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchTrash = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const url = modelFilter ? `/system/trash?model_name=${encodeURIComponent(modelFilter)}` : '/system/trash';
      const res = await api.get(url);
      setTrashItems(res.data.trash || []);
    } catch (e) {
      console.error('Failed to fetch trash');
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  const { refresh, refreshing } = useLiveData(['system', 'all'], () => fetchTrash({ silent: true }));

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleRestore = async (id: number) => {
    setProcessingId(id);
    try {
      await api.post(`/system/trash/${id}/restore`);
      toast.success('Record Restored');
      fetchTrash();
    } catch (error) {
      toast.error('Failed to restore record');
    } finally {
      setProcessingId(null);
    }
  };

  const handlePermanentDelete = async (id: number) => {
    if (!window.confirm('Are you absolutely sure you want to permanently delete this? It cannot be recovered!')) return;
    setProcessingId(id);
    try {
      await api.delete(`/system/trash/${id}`);
      toast.success('Permanently Deleted');
      fetchTrash();
    } catch (error) {
      toast.error('Failed to delete');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading && trashItems.length === 0) return (
    <div className="flex flex-col justify-center items-center h-96 gap-4">
      <RefreshCw className="animate-spin text-red-500" size={32} />
      <span className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Loading Trash...</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center crm-card p-6 rounded-[2rem] border border-slate-200/60">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Trash2 className="text-red-400" /> {title}
          </h2>
          <p className="text-slate-400 text-sm mt-1">Deleted records are kept here. Restore or permanently delete.</p>
        </div>
        <RefreshButton onClick={refresh} loading={refreshing} />
      </div>

      <div className="crm-card border rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200/60 bg-slate-50/80">
                <th className="px-6 py-4">Deleted At</th>
                <th className="px-6 py-4">Module</th>
                <th className="px-6 py-4">Data Snapshot</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60">
              {trashItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors text-sm group">
                  <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                    {new Date(item.deleted_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-300">
                    {item.model_name}
                  </td>
                  <td className="px-6 py-4">
                    {item.model_name === 'Lead' ? (
                      <div className="bg-white p-3 rounded-xl border border-slate-200/60 text-sm space-y-1">
                        <p className="font-mono font-bold text-mint-600">{(item.data as any)?.lead_id}</p>
                        <p className="text-slate-300">{(item.data as any)?.customer_name}</p>
                        <p className="text-xs text-slate-500">{(item.data as any)?.product_type} • {(item.data as any)?.phone}</p>
                        <p className="text-[10px] text-amber-600">Was: {(item.data as any)?.old_status}</p>
                      </div>
                    ) : (
                      <div className="max-w-md max-h-24 overflow-y-auto custom-scrollbar bg-white p-3 rounded-xl border border-slate-200/60 text-[11px] text-slate-400 font-mono break-all">
                        {JSON.stringify(item.data)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleRestore(item.id)}
                        disabled={processingId === item.id}
                        className="p-2 bg-mint-100 hover:bg-emerald-500/20 text-emerald-500 rounded-xl transition-all border border-mint-300/40 disabled:opacity-50"
                        title="Restore Record"
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button 
                        onClick={() => handlePermanentDelete(item.id)}
                        disabled={processingId === item.id}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all border border-red-500/20 disabled:opacity-50"
                        title="Delete Permanently"
                      >
                        <AlertTriangle size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {trashItems.length === 0 && (
            <div className="text-center py-16 text-slate-600 italic text-sm">Trash is empty.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrashModule;
