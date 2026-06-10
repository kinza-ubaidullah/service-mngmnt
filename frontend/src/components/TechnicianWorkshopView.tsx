import React, { useState, useEffect } from 'react';
import { Search, Package, Phone, MapPin, MessageCircle, Eye, History, RefreshCw } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import ImageZoomModal from './ImageZoomModal';
import RefreshButton from './RefreshButton';
import { useLiveData } from '../hooks/useLiveData';

const getPictures = (lead: any): string[] => {
  if (!lead?.item_pictures) return [];
  if (Array.isArray(lead.item_pictures)) return lead.item_pictures;
  try { return JSON.parse(lead.item_pictures); } catch { return []; }
};

const TechnicianWorkshopView = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [zoomImg, setZoomImg] = useState<string | null>(null);

  const fetchJobs = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const res = await api.get('/workshop/jobs');
      setJobs(res.data.jobs || []);
    } catch { toast.error('Failed to load workshop jobs'); }
    finally { if (!opts?.silent) setLoading(false); }
  };

  const { refresh, refreshing } = useLiveData(['workshop', 'leads'], () => fetchJobs({ silent: true }));

  useEffect(() => { fetchJobs(); }, []);

  const openDetail = async (job: any) => {
    setSelected(job);
    try {
      const res = await api.get(`/leads/${job.lead.id}/history`);
      setHistory(res.data.history || []);
    } catch { setHistory([]); }
  };

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    const matchQ = j.lead.lead_id.toLowerCase().includes(q) || j.lead.customer.name.toLowerCase().includes(q);
    const matchF = filter === 'all' || j.status === filter;
    return matchQ && matchF;
  });

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <RefreshButton onClick={refresh} loading={refreshing} />
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
            className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white outline-none" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="bg-slate-900/50 border border-white/5 rounded-xl px-3 text-xs text-slate-300">
          <option value="all">All</option>
          <option value="WaitingForApproval">Pending Gate-In</option>
          <option value="Received">Received</option>
          <option value="WorkStarted">Repairing</option>
          <option value="WaitingForParts">Parts</option>
          <option value="Ready">Ready</option>
          <option value="Delivered">Delivered</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500 italic text-sm">No workshop jobs found.</div>
      ) : filtered.map(job => (
        <div key={job.id} className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="text-[10px] font-mono text-emerald-400">{job.lead.lead_id}</span>
              <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded border ${job.status === 'Delivered' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-slate-700 text-slate-300 border-slate-600'}`}>{job.status}</span>
            </div>
            <button onClick={() => openDetail(job)} className="text-xs text-emerald-400 flex items-center gap-1 hover:underline">
              <Eye size={14} /> View Lead
            </button>
          </div>
          <h3 className="font-bold text-white">{job.lead.product_type}</h3>
          <p className="text-xs text-slate-400 mt-1">{job.lead.problem_details}</p>
          {job.lead.collected_amount > 0 && (
            <p className="text-xs text-emerald-400 font-bold mt-2">Amount: PKR {Number(job.lead.collected_amount).toLocaleString()}</p>
          )}
          {job.status === 'Delivered' && job.delivered_by && (
            <p className="text-[10px] text-purple-400 mt-1">Delivered — check history for delivery technician</p>
          )}
        </div>
      ))}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg p-6 my-8">
            <div className="flex justify-between mb-4">
              <h3 className="font-black text-white">{selected.lead.lead_id} — View Only</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <p className="text-white font-bold">{selected.lead.customer.name}</p>
              <div className="flex gap-2">
                <a href={`tel:${selected.lead.customer.phone}`} className="flex items-center gap-1 text-emerald-400 text-xs"><Phone size={12} /> {selected.lead.customer.phone}</a>
                <a href={`https://wa.me/${selected.lead.customer.phone?.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-green-400 text-xs"><MessageCircle size={12} /> WhatsApp</a>
              </div>
              <p className="text-slate-400 text-xs flex items-start gap-1"><MapPin size={12} className="mt-0.5 shrink-0" /> {selected.lead.exact_address || selected.lead.customer.exact_address || selected.lead.customer.area}</p>
              {selected.lead.customer.google_map_link && (
                <a href={selected.lead.customer.google_map_link} target="_blank" rel="noreferrer" className="text-amber-400 text-xs underline">Open in Google Maps</a>
              )}
              {selected.lead.collected_amount > 0 && (
                <p className="text-emerald-400 text-xs font-bold">Final Amount: PKR {Number(selected.lead.collected_amount).toLocaleString()}</p>
              )}
              <p className="text-slate-300 bg-white/5 p-3 rounded-xl text-xs">{selected.lead.problem_details}</p>
              {selected.lead.agreed_amount && (
                <p className="text-amber-400 text-xs font-bold">Agreed Price: PKR {Number(selected.lead.agreed_amount).toLocaleString()}</p>
              )}
              <div className="flex gap-2 overflow-x-auto">
                {getPictures(selected.lead).map((pic, i) => (
                  <img key={i} src={pic} alt="" className="w-20 h-20 rounded-xl object-cover border border-white/10 cursor-pointer"
                    onClick={() => setZoomImg(pic)} />
                ))}
              </div>
              {history.length > 0 && (
                <div className="border-t border-white/5 pt-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><History size={12} /> History</p>
                  {history.slice(0, 5).map((h: any) => (
                    <p key={h.id} className="text-[10px] text-slate-400 mb-1">{new Date(h.timestamp).toLocaleString()} — {h.action}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <ImageZoomModal src={zoomImg} onClose={() => setZoomImg(null)} />
    </div>
  );
};

export default TechnicianWorkshopView;
