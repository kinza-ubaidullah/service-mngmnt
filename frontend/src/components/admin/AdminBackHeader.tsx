import { ArrowLeft } from 'lucide-react';

interface AdminBackHeaderProps {
  title: string;
  subtitle?: string;
  backLabel?: string;
  onBack: () => void;
  count?: number;
  countClassName?: string;
  actions?: React.ReactNode;
}

const AdminBackHeader: React.FC<AdminBackHeaderProps> = ({
  title,
  subtitle,
  backLabel = 'Back to Overview',
  onBack,
  count,
  countClassName = 'bg-pink-100 text-pink-600 border-pink-200',
  actions,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div className="flex items-start gap-3 min-w-0">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200/60 bg-white text-slate-600 hover:text-mint-600 hover:border-mint-300/40 hover:bg-mint-50/80 text-xs font-bold shrink-0 transition-all"
      >
        <ArrowLeft size={16} />
        {backLabel}
      </button>
      <div className="min-w-0">
        <h2 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2 flex-wrap">
          {title}
          {count !== undefined && (
            <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${countClassName}`}>
              {count}
            </span>
          )}
        </h2>
        {subtitle && <p className="text-sm text-slate-500 font-medium mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

export default AdminBackHeader;
