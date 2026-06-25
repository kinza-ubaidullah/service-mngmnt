/** Shared CRM theme class strings — soft mint professional palette */

export const shell = 'crm-shell flex font-sans overflow-hidden relative';
export const shellCol = 'crm-shell flex flex-col font-sans relative';

export const nav = 'crm-nav px-6 py-4 flex justify-between items-center sticky top-0 z-20';
export const sidebar = 'crm-sidebar';

export const card = 'crm-card';
export const cardSoft = 'crm-card-soft';
export const headerBanner = 'crm-header-banner p-6';

export const tabs = 'crm-tabs flex gap-1 p-1';
export const tabActive = 'crm-tab-active rounded-xl font-bold text-sm transition-all';
export const tabIdle = 'crm-tab-idle rounded-xl font-bold text-sm transition-all';

export const btnPrimary = 'crm-btn-primary px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2';
export const btnGhost = 'crm-btn-ghost px-4 py-2 rounded-xl font-bold text-sm transition-all';

export const input = 'crm-input w-full px-4 py-3 text-sm';
export const inputSm = 'crm-input w-full px-3 py-2 text-xs';

export const modalOverlay = 'crm-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4';
export const modal = 'crm-modal rounded-3xl w-full overflow-hidden';

export const tableHead = 'crm-table-head';
export const tableRow = 'crm-table-row';

export const textPrimary = 'text-slate-800';
export const textMuted = 'text-slate-500';
export const textSubtle = 'text-slate-400';

export const statusDot = (variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral') =>
  `crm-status-dot crm-status-dot--${variant}`;

export const badge = (variant: 'mint' | 'sky' | 'amber' | 'rose' | 'violet') =>
  `crm-badge crm-badge-${variant}`;

export const iconBox = 'crm-icon-box p-2';
