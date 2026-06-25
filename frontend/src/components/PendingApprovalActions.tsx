import React, { useState } from 'react';
import { CheckCircle2, XCircle, Eye } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface PendingApprovalActionsProps {
  lead: any;
  onDone?: () => void;
  onView?: () => void;
  showView?: boolean;
  layout?: 'row' | 'stack';
}

const PendingApprovalActions: React.FC<PendingApprovalActionsProps> = ({
  lead,
  onDone,
  onView,
  showView = true,
  layout = 'row',
}) => {
  const [approving, setApproving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const handleApprove = async () => {
    if (!window.confirm('Approve this job and finalize the submitted outcome?')) return;
    setApproving(true);
    try {
      await api.post(`/leads/${lead.id}/approve`);
      toast.success('Job approved!');
      onDone?.();
    } catch {
      toast.error('Failed to approve');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectNote.trim()) {
      toast.error('Please enter a rejection note');
      return;
    }
    setRejecting(true);
    try {
      await api.post(`/leads/${lead.id}/reject`, { reason: rejectNote.trim() });
      toast.success('Job rejected — returned to technician');
      setRejectOpen(false);
      setRejectNote('');
      onDone?.();
    } catch {
      toast.error('Failed to reject');
    } finally {
      setRejecting(false);
    }
  };

  const btnRow = layout === 'row' ? 'flex flex-wrap gap-2' : 'flex flex-col gap-2';

  return (
    <>
      <div className={btnRow}>
        {showView && onView && (
          <button
            type="button"
            onClick={onView}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all"
          >
            <Eye size={14} /> View Full Details
          </button>
        )}
        <button
          type="button"
          onClick={handleApprove}
          disabled={approving || rejecting}
          className="flex items-center justify-center gap-2 px-5 py-2.5 crm-btn-primary font-black rounded-xl text-sm transition-all disabled:opacity-50"
        >
          <CheckCircle2 size={16} /> {approving ? 'Approving…' : 'Approve'}
        </button>
        <button
          type="button"
          onClick={() => setRejectOpen(true)}
          disabled={approving || rejecting}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/25 font-black rounded-xl text-sm transition-all disabled:opacity-50"
        >
          <XCircle size={16} /> Reject
        </button>
      </div>

      {rejectOpen && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="crm-modal border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h4 className="text-lg font-black text-slate-800">Reject Final Approval</h4>
            <p className="text-xs text-slate-500">
              The task will return to the technician with all submitted information preserved. They will see your rejection note.
            </p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={4}
              placeholder="Explain why this submission is rejected…"
              className="w-full crm-input text-slate-800 px-4 py-3 rounded-xl border border-slate-200/70 outline-none focus:border-rose-400 text-sm"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setRejectOpen(false); setRejectNote(''); }}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={rejecting}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black text-sm disabled:opacity-50"
              >
                {rejecting ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PendingApprovalActions;
