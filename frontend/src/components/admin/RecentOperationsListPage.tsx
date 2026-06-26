import { useEffect, useState } from 'react';
import { Clock, Eye, Loader2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import AdminBackHeader from './AdminBackHeader';
import RefreshButton from '../RefreshButton';
import LeadImageThumb from '../LeadImageThumb';
import CopyText from '../CopyText';
import ImageZoomModal from '../ImageZoomModal';
import LeadHistoryModal from '../LeadHistoryModal';
import { useLiveData } from '../../hooks/useLiveData';
import { matchesLeadSearch, isRejectedLead } from '../../utils/leadHelpers';

const getLeadPictures = (lead: any): string[] => {
  if (!lead?.item_pictures) return [];
  if (Array.isArray(lead.item_pictures)) return lead.item_pictures;
  try { return JSON.parse(lead.item_pictures); } catch { return []; }
};

interface RecentOperationsListPageProps {
  onBack: () => void;
}

const RecentOperationsListPage: React.FC<RecentOperationsListPageProps> = ({ onBack }) => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [zoomImg, setZoomImg] = useState<string | null>(null);

  const RECENT_STATUSES = ['InspectionCompleted', 'PickedForWorkshop', 'Completed', 'Assigned', 'InProgress', 'Reopened', 'Complaint'];

  const fetchData = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);

      try {
        const res = await api.get('/dashboard/admin/recent-operations');
        const items = res.data.recentLeads || [];
        if (items.length > 0) {
          setLeads(items);
          return;
        }
      } catch (err) {
        console.warn('Recent operations endpoint unavailable, using fallback:', err);
      }

      try {
        const statsRes = await api.get('/dashboard/admin/stats');
        const fromStats = statsRes.data.recentLeads || [];
        if (fromStats.length > 0) {
          setLeads(fromStats);
          return;
        }
      } catch {
        /* try leads list next */
      }

      const leadsRes = await api.get('/leads', { timeout: 45000 });
      const all = leadsRes.data.leads || leadsRes.data || [];
      setLeads(
        all
          .filter((l: any) => RECENT_STATUSES.includes(l.status))
          .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      );
    } catch (err) {
      console.error('Recent operations load failed:', err);
      if (!opts?.silent) toast.error('Could not load recent operations');
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  const { refresh, refreshing } = useLiveData(['leads', 'dashboard'], () => fetchData({ silent: true }), { pollIntervalMs: 45000 });

  useEffect(() => {
    fetchData();
  }, []);

  const visibleLeads = leads.filter((lead) => matchesLeadSearch(lead, search));

  if (loading && leads.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-mint-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4 min-w-0 max-w-full">
      <AdminBackHeader
        title="Recent Operations"
        subtitle="All active and recently updated service jobs"
        count={visibleLeads.length}
        countClassName="bg-mint-100 text-mint-600 border-mint-300/40"
        onBack={onBack}
        actions={
          <>
            <div className="relative w-44">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200/60 rounded-xl py-2 pl-9 pr-3 text-xs outline-none focus:border-mint-400/50 text-slate-800"
              />
            </div>
            <RefreshButton onClick={refresh} loading={refreshing} />
          </>
        }
      />

      <div className="crm-card border rounded-2xl shadow-lg min-w-0 max-w-full overflow-visible">
        <div className="lg:hidden divide-y divide-slate-100">
          {visibleLeads.map((lead) => (
            <button
              key={lead.id}
              type="button"
              onClick={() => setSelectedLead(lead)}
              className="w-full text-left p-4 hover:bg-slate-50/80 flex gap-4 items-start min-w-0"
            >
              <LeadImageThumb src={getLeadPictures(lead)[0]} className="w-24 h-24 shrink-0 rounded-xl" onZoom={setZoomImg} />
              <div className="min-w-0 flex-1">
                <CopyText value={lead.lead_id} label="Lead ID" className="text-[10px] font-mono font-bold text-mint-600" />
                <p className="text-sm font-bold text-slate-800 truncate">{lead.customer?.name}</p>
                <p className="text-xs text-slate-500 truncate">{lead.product_type} · {lead.technician?.name || 'Unassigned'}</p>
              </div>
            </button>
          ))}
          {visibleLeads.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-12">No operations found</p>
          )}
        </div>

        <div className="hidden lg:block overflow-x-auto max-w-full">
          <table className="w-full text-left table-auto">
            <thead>
              <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/60 bg-slate-50/80">
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Tech</th>
                <th className="px-4 py-3 text-right w-20">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleLeads.map((lead) => (
                <tr key={lead.id} onClick={() => setSelectedLead(lead)} className="group hover:bg-slate-50/80 transition-colors cursor-pointer text-sm">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <LeadImageThumb src={getLeadPictures(lead)[0]} className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-xl" onZoom={setZoomImg} />
                      <CopyText value={lead.lead_id} label="Lead ID" className="font-mono text-xs font-bold text-mint-600 truncate max-w-[7rem]" />
                    </div>
                  </td>
                  <td className="px-4 py-4 max-w-[10rem]">
                    <div className="text-sm font-bold text-slate-700 truncate">{lead.customer?.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">{lead.customer?.area}</div>
                  </td>
                  <td className="px-4 py-4 max-w-[8rem]">
                    <span className="text-xs font-semibold text-slate-600 truncate block">{lead.product_type}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border whitespace-nowrap
                        ${lead.status === 'New' ? 'bg-mint-100 text-mint-600 border-mint-300/40' :
                          lead.status === 'Assigned' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                          lead.status === 'Completed' ? 'bg-mint-100 text-mint-600 border-mint-300/40' :
                          'bg-slate-100 text-slate-600 border-slate-200'}
                      `}>
                      {lead.status === 'InspectionCompleted' ? 'INSPECTION' :
                       lead.status === 'PickedForWorkshop' ? 'PICKUP' :
                       isRejectedLead(lead) ? 'REJECTED' : lead.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right text-xs font-semibold text-slate-500 truncate max-w-[6rem]">
                    {lead.technician?.name || '—'}
                  </td>
                  <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => setSelectedLead(lead)} className="p-1.5 bg-slate-50 hover:bg-mint-100 text-slate-600 rounded-lg border border-slate-200/60">
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleLeads.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-12 flex items-center justify-center gap-2">
              <Clock size={16} /> No operations found
            </p>
          )}
        </div>
      </div>

      {selectedLead && (
        <LeadHistoryModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
      <ImageZoomModal src={zoomImg} onClose={() => setZoomImg(null)} />
    </div>
  );
};

export default RecentOperationsListPage;
