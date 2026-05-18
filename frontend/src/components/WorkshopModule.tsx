import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wrench, Clock, CheckCircle2, Truck, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const WorkshopModule = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkshopJobs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/workshop/jobs');
      setJobs(res.data.jobs);
    } catch (error) {
      toast.error('Failed to load workshop jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkshopJobs();
  }, []);

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      await api.patch(`/workshop/jobs/${id}/status`, { status: newStatus });
      toast.success(`Job marked as ${newStatus}`);
      fetchWorkshopJobs();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const statusColors: any = {
    'Received': 'bg-slate-500/20 text-slate-400 border-slate-500/20',
    'WorkStarted': 'bg-blue-500/20 text-blue-400 border-blue-500/20',
    'WaitingForParts': 'bg-amber-500/20 text-amber-400 border-amber-500/20',
    'Ready': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
    'Delivered': 'bg-purple-500/20 text-purple-400 border-purple-500/20',
  };

  const getDayCount = (receivedDate: string) => {
    const diff = new Date().getTime() - new Date(receivedDate).getTime();
    return Math.floor(diff / (1000 * 3600 * 24)) + 1;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><RefreshCw className="animate-spin text-indigo-500" size={32} /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Received', value: jobs.length, icon: Wrench, color: 'text-slate-400' },
          { label: 'Work Started', value: jobs.filter(j => j.status === 'WorkStarted').length, icon: Clock, color: 'text-blue-400' },
          { label: 'Ready for Delivery', value: jobs.filter(j => j.status === 'Ready').length, icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Delivered', value: jobs.filter(j => j.status === 'Delivered').length, icon: Truck, color: 'text-purple-400' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-slate-900/60 border border-white/5 p-6 rounded-[2rem]">
            <div className="flex justify-between items-start">
              <div className={`p-3 bg-white/5 rounded-2xl ${stat.color}`}>
                <stat.icon size={24} />
              </div>
            </div>
            <h3 className="text-3xl font-black text-white mt-4">{stat.value}</h3>
            <p className="text-slate-400 text-sm font-bold mt-1 uppercase tracking-wider">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Workshop Board */}
      <div className="bg-slate-900/60 border border-white/5 rounded-[2.5rem] p-8 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Wrench className="text-indigo-400" /> Active Workshop Jobs
          </h2>
          <button onClick={fetchWorkshopJobs} className="text-indigo-400 hover:text-indigo-300">
            <RefreshCw size={20} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-slate-500">
                <th className="pb-4 font-bold">Job ID</th>
                <th className="pb-4 font-bold">Details</th>
                <th className="pb-4 font-bold text-center hidden sm:table-cell">Days</th>
                <th className="pb-4 font-bold">Status</th>
                <th className="pb-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {jobs.filter(j => j.status !== 'Delivered').map((job) => {
                const days = getDayCount(job.received_date);
                return (
                  <tr key={job.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="py-4">
                      <span className="text-xs font-bold text-slate-300 bg-white/5 px-2 py-1 rounded">{job.lead.lead_id}</span>
                    </td>
                    <td className="py-4">
                      <p className="font-bold text-white text-sm">{job.lead.product_type}</p>
                      <p className="text-xs text-slate-500">{job.lead.customer.name}</p>
                    </td>
                    <td className="py-4 text-center hidden sm:table-cell">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${days > 3 ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        Day {days} {days > 3 && <AlertCircle size={12} className="inline ml-1 mb-0.5"/>}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${statusColors[job.status] || statusColors['Received']}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {job.status === 'Received' && (
                          <button 
                            onClick={() => updateStatus(job.id, 'WorkStarted')}
                            className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/20 transition-all"
                            title="Start Repair"
                          >
                            <Clock size={16} />
                          </button>
                        )}
                        {job.status === 'WorkStarted' && (
                          <button 
                            onClick={() => updateStatus(job.id, 'Ready')}
                            className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/20 transition-all"
                            title="Mark Ready"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        {job.status === 'Ready' && (
                          <button 
                            onClick={() => updateStatus(job.id, 'Delivered')}
                            className="p-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/20 transition-all"
                            title="Mark Delivered"
                          >
                            <Truck size={16} />
                          </button>
                        )}
                        <button 
                          onClick={async () => {
                            if (window.confirm('Are you sure you want to remove this machine from workshop records?')) {
                              try {
                                await api.delete(`/workshop/jobs/${job.id}`);
                                toast.success('Workshop record removed');
                                fetchWorkshopJobs();
                              } catch { toast.error('Failed to remove record'); }
                            }
                          }}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition-all"
                          title="Remove from Workshop"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {jobs.filter(j => j.status !== 'Delivered').length === 0 && (
            <div className="text-center py-12 text-slate-500 italic">No active machines in workshop.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkshopModule;
