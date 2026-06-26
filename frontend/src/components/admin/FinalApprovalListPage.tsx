import { useEffect, useState } from 'react';
import { ClipboardList, Loader2 } from 'lucide-react';
import api from '../../services/api';
import PendingApprovalCard from '../PendingApprovalCard';
import AdminBackHeader from './AdminBackHeader';
import RefreshButton from '../RefreshButton';
import { useLiveData } from '../../hooks/useLiveData';

interface FinalApprovalListPageProps {
  onBack: () => void;
}

const FinalApprovalListPage: React.FC<FinalApprovalListPageProps> = ({ onBack }) => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const res = await api.get('/dashboard/admin/stats');
      setLeads(res.data.pendingApprovalLeads || []);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  const { refresh, refreshing } = useLiveData(['dashboard', 'leads'], () => fetchData({ silent: true }));

  useEffect(() => {
    fetchData();
  }, []);

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
        title="Final Approval"
        subtitle="Review and approve completed field work"
        count={leads.length}
        onBack={onBack}
        actions={<RefreshButton onClick={refresh} loading={refreshing} />}
      />

      {leads.length === 0 ? (
        <div className="crm-card border border-dashed border-slate-300 rounded-2xl py-16 text-center">
          <ClipboardList size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-500">No tasks awaiting approval</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {leads.map((lead) => (
            <PendingApprovalCard
              key={lead.id}
              lead={lead}
              canApprove
              onApproved={() => fetchData({ silent: true })}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FinalApprovalListPage;
