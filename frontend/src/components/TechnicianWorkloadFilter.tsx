import React, { useMemo } from 'react';
import { Users, Wrench, X, ChevronDown, Activity } from 'lucide-react';
import {
  countActiveJobsForTechnician,
  countAssignedTasksForTechnician,
  getTechnicianWorkloadBreakdown,
  isActiveJobStatus,
  isAssignedTaskStatus,
} from '../utils/leadHelpers';

interface Team {
  id: number;
  name: string;
}

interface Technician {
  id: number;
  name: string;
  specialization?: string;
  team_id?: number | null;
  team?: { name: string };
  assigned_jobs?: any[];
}

interface TechnicianWorkloadFilterProps {
  technicians: Technician[];
  leads: any[];
  teams: Team[];
  technicianFilter: number | 'all';
  teamFilter: number | 'all';
  onTechnicianFilter: (id: number | 'all') => void;
  onTeamFilter: (id: number | 'all') => void;
  showTeamFilter?: boolean;
  statusFilter?: string;
}

const TechnicianWorkloadFilter: React.FC<TechnicianWorkloadFilterProps> = ({
  technicians,
  leads,
  teams,
  technicianFilter,
  teamFilter,
  onTechnicianFilter,
  onTeamFilter,
  showTeamFilter = true,
  statusFilter = 'all',
}) => {
  const isAssignedTab = statusFilter === 'assigned';

  const getActiveCount = (techId: number) => countActiveJobsForTechnician(techId, leads);
  const getTaskCount = (techId: number) => countAssignedTasksForTechnician(techId, leads);

  const totalActive = leads.filter((l) => isActiveJobStatus(l.status)).length;
  const totalAssignedTasks = leads.filter((l) => isAssignedTaskStatus(l.status)).length;

  const selectedTech = technicianFilter !== 'all'
    ? technicians.find((t) => t.id === technicianFilter)
    : null;

  const selectedBreakdown = useMemo(
    () => (technicianFilter !== 'all' ? getTechnicianWorkloadBreakdown(technicianFilter, leads) : null),
    [technicianFilter, leads]
  );

  const filteredTechs = useMemo(() => {
    if (teamFilter === 'all') return technicians;
    return technicians.filter((t) => t.team_id === teamFilter);
  }, [technicians, teamFilter]);

  return (
    <div className="px-6 py-4 border-b border-slate-200/60 bg-gradient-to-r from-blue-500/[0.04] to-indigo-500/[0.04] space-y-4">
      {/* Header + quick selects */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-mint-600" />
          <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
            {isAssignedTab ? 'Assigned Tasks — Filter by Technician / Team' : 'Filter by Technician'}
          </span>
          {(technicianFilter !== 'all' || teamFilter !== 'all') && (
            <button
              type="button"
              onClick={() => { onTechnicianFilter('all'); onTeamFilter('all'); }}
              className="text-[9px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200/60"
            >
              <X size={10} /> Clear all
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-500">
          <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-mint-100 text-mint-600 border border-mint-300/40">
            <Activity size={10} /> {totalActive} active
          </span>
          <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {totalAssignedTasks} assigned tasks
          </span>
        </div>
      </div>

      {/* Dropdown filters — easy pick on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="relative">
          <select
            value={technicianFilter === 'all' ? '' : String(technicianFilter)}
            onChange={(e) => onTechnicianFilter(e.target.value ? Number(e.target.value) : 'all')}
            className="w-full appearance-none bg-white/95 border border-slate-200/70 rounded-xl py-2.5 pl-3 pr-8 text-xs font-bold text-slate-800 outline-none focus:border-blue-500/40"
          >
            <option value="">All Technicians ({totalAssignedTasks} tasks)</option>
            {technicians.map((tech) => {
              const active = getActiveCount(tech.id);
              const tasks = getTaskCount(tech.id);
              return (
                <option key={tech.id} value={tech.id}>
                  {tech.name} — {active} active, {tasks} tasks{tech.team?.name ? ` (${tech.team.name})` : ''}
                </option>
              );
            })}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        </div>
        {showTeamFilter && teams.length > 0 && (
          <div className="relative">
            <select
              value={teamFilter === 'all' ? '' : String(teamFilter)}
              onChange={(e) => onTeamFilter(e.target.value ? Number(e.target.value) : 'all')}
              className="w-full appearance-none bg-white/95 border border-slate-200/70 rounded-xl py-2.5 pl-3 pr-8 text-xs font-bold text-slate-800 outline-none focus:border-purple-500/40"
            >
              <option value="">All Teams</option>
              {teams.map((team) => {
                const count = leads.filter(
                  (l) => l.team_id === team.id && isAssignedTaskStatus(l.status)
                ).length;
                return (
                  <option key={team.id} value={team.id}>
                    {team.name} ({count} tasks)
                  </option>
                );
              })}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Technician chips with active + task counts */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onTechnicianFilter('all')}
          className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-2 ${
            technicianFilter === 'all'
              ? 'crm-tab-active border-indigo-400 shadow-lg shadow-mint-300/25'
              : 'bg-white text-slate-400 border-slate-200/70 hover:border-mint-300/60 hover:text-slate-800'
          }`}
        >
          <Users size={12} />
          All
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${technicianFilter === 'all' ? 'bg-white/20' : 'bg-slate-50'}`}>
            {isAssignedTab ? totalAssignedTasks : totalActive}
          </span>
        </button>

        {filteredTechs.map((tech) => {
          const activeCount = getActiveCount(tech.id);
          const taskCount = getTaskCount(tech.id);
          const isSelected = technicianFilter === tech.id;

          return (
            <button
              key={tech.id}
              type="button"
              onClick={() => onTechnicianFilter(isSelected ? 'all' : tech.id)}
              className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/20'
                  : activeCount > 0 || taskCount > 0
                  ? 'bg-white text-slate-300 border-slate-200/70 hover:border-blue-500/30 hover:text-slate-800'
                  : 'bg-white/30 text-slate-500 border-slate-200/60 hover:border-slate-200/70'
              }`}
            >
              <Wrench size={12} className={isSelected ? 'text-white' : activeCount > 0 ? 'text-blue-400' : 'text-slate-600'} />
              <span className="max-w-[100px] truncate">{tech.name}</span>
              <span className={`px-1 py-0.5 rounded text-[8px] font-black ${
                isSelected ? 'bg-emerald-400/30 text-white' : 'bg-emerald-500/15 text-mint-600'
              }`}>
                {activeCount}↑
              </span>
              <span className={`px-1 py-0.5 rounded text-[8px] font-black ${
                isSelected ? 'bg-white/20' : taskCount > 0 ? 'bg-blue-500/15 text-blue-300' : 'bg-slate-50 text-slate-500'
              }`}>
                {taskCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Team chips */}
      {showTeamFilter && teams.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Team:</span>
          <button
            type="button"
            onClick={() => onTeamFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all ${
              teamFilter === 'all'
                ? 'bg-indigo-500/20 text-mint-600 border-indigo-500/30'
                : 'bg-slate-50 text-slate-500 border-slate-200/60 hover:text-slate-300'
            }`}
          >
            All Teams
          </button>
          {teams.map((team) => {
            const teamTasks = leads.filter(
              (l) => l.team_id === team.id && isAssignedTaskStatus(l.status)
            ).length;
            const teamActive = leads.filter(
              (l) => l.team_id === team.id && isActiveJobStatus(l.status)
            ).length;
            return (
              <button
                key={team.id}
                type="button"
                onClick={() => onTeamFilter(teamFilter === team.id ? 'all' : team.id)}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all flex items-center gap-1.5 ${
                  teamFilter === team.id
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                    : 'bg-slate-50 text-slate-500 border-slate-200/60 hover:text-slate-300'
                }`}
              >
                {team.name}
                <span className="text-emerald-500/80">{teamActive}↑</span>
                <span className="opacity-70">({teamTasks})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected technician summary */}
      {selectedTech && selectedBreakdown && (
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2">
          <p className="text-xs font-bold text-blue-900">
            {selectedTech.name}
            {selectedTech.team?.name && <span className="text-blue-700 font-normal"> · {selectedTech.team.name}</span>}
            {' '}— showing all assigned jobs
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedBreakdown.active > 0 && (
              <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300/60">
                Active: {selectedBreakdown.active}
              </span>
            )}
            {selectedBreakdown.assigned > 0 && (
              <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-blue-100 text-blue-800 border border-blue-200">
                Assigned: {selectedBreakdown.assigned}
              </span>
            )}
            {selectedBreakdown.inProgress > 0 && (
              <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-indigo-500/15 text-mint-600 border border-mint-300/40">
                In Progress: {selectedBreakdown.inProgress}
              </span>
            )}
            {selectedBreakdown.reopened > 0 && (
              <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/20">
                Reopened: {selectedBreakdown.reopened}
              </span>
            )}
            {selectedBreakdown.workshop > 0 && (
              <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/20">
                Workshop: {selectedBreakdown.workshop}
              </span>
            )}
            <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
              Total tasks: {selectedBreakdown.totalTasks}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianWorkloadFilter;
