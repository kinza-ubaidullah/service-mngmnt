import React, { useState, useEffect } from 'react';
import { ClipboardList, Search, Filter, Download, RotateCcw, Trash2, Clock, MapPin, Phone, User as UserIcon } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { generateInvoicePDF } from '../utils/invoiceGenerator';

const LeadsModule = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/leads'); // Assuming this endpoint exists or I will create it
      setLeads(res.data.leads || res.data);
    } catch (error) {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.lead_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.customer.phone.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (leadId: number, leadDisplayId: string) => {
    if (window.confirm(`Delete lead ${leadDisplayId}? This cannot be undone.`)) {
      try {
        await api.delete(`/leads/${leadId}`);
        toast.success('Lead deleted');
        fetchData();
      } catch { toast.error('Failed to delete'); }
    }
  };

  const handleReopen = async (lead: any) => {
    const reason = prompt('Reason for reopening?');
    if (reason) {
      try {
        await api.patch(`/leads/${lead.id}/reopen`, { reason });
        toast.success('Job Reopened!');
        fetchData();
      } catch (e) { toast.error('Failed to reopen'); }
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Service Leads</h2>
          <p className="text-slate-500 font-medium">Manage and track all customer service requests</p>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search ID, Customer, Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-sm text-white outline-none focus:border-indigo-500/50 transition-all"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-white/5 rounded-xl py-2 px-4 text-sm text-white outline-none focus:border-indigo-500/50 appearance-none"
          >
            <option value="all">All Status</option>
            <option value="New">New</option>
            <option value="Assigned">Assigned</option>
            <option value="InProgress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Reopened">Reopened</option>
          </select>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 bg-white/[0.02]">
                <th className="px-8 py-5">Lead Detail</th>
                <th className="px-8 py-5">Customer info</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">Assigned To</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="font-mono text-sm font-black text-indigo-400">{lead.lead_id}</span>
                      <span className="text-xs text-slate-400 mt-1 font-medium">{lead.product_type}</span>
                      <div className="flex items-center gap-2 mt-2">
                         <Clock size={12} className="text-slate-500" />
                         <span className="text-[10px] text-slate-500 font-bold">{new Date(lead.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                        <UserIcon size={14} className="text-slate-500" /> {lead.customer.name}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                        <Phone size={12} /> {lead.customer.phone}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <MapPin size={12} className="text-indigo-500/50" /> {lead.customer.area || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-2">
                       <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black tracking-wider border w-max
                        ${lead.status === 'New' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                          lead.status === 'Assigned' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                          lead.status === 'Completed' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                          lead.status === 'Reopened' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-slate-800 text-slate-300 border-slate-700'}
                      `}>
                        {lead.status.toUpperCase()}
                      </span>
                      {lead.is_warranty_claim && (
                        <span className="text-[9px] font-black text-amber-500 uppercase flex items-center gap-1">
                          ★ Warranty Claim
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    {lead.technician ? (
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-black">
                            {lead.technician.name.charAt(0)}
                         </div>
                         <span className="text-xs font-bold text-slate-300">{lead.technician.name}</span>
                      </div>
                    ) : (
                      <span className="text-xs italic text-slate-600 font-medium">Unassigned</span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {lead.status === 'Completed' && (
                        <>
                          <button 
                            onClick={() => generateInvoicePDF(lead)}
                            className="p-2 bg-white/5 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 rounded-xl transition-all border border-white/5 hover:border-indigo-500/20"
                            title="Download Invoice"
                          >
                            <Download size={16} />
                          </button>
                          <button 
                            onClick={() => handleReopen(lead)}
                            className="p-2 bg-white/5 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 rounded-xl transition-all border border-white/5 hover:border-amber-500/20"
                            title="Reopen Job"
                          >
                            <RotateCcw size={16} />
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => handleDelete(lead.id, lead.lead_id)}
                        className="p-2 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl transition-all border border-white/5 hover:border-red-500/20"
                        title="Delete Lead"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-500 font-medium italic">
                    No leads found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LeadsModule;
