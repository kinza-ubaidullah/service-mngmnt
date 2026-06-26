import { useNavigate } from 'react-router-dom';
import LeadsModule, { LEAD_CATEGORY_CONFIG, type LeadCategoryKey } from '../LeadsModule';
import AdminBackHeader from './AdminBackHeader';

interface LeadsCategoryPageProps {
  category: LeadCategoryKey;
}

const LeadsCategoryPage: React.FC<LeadsCategoryPageProps> = ({ category }) => {
  const navigate = useNavigate();
  const config = LEAD_CATEGORY_CONFIG[category];

  return (
    <div className="space-y-4 min-w-0 max-w-full">
      <AdminBackHeader
        title={config.title}
        subtitle={config.subtitle}
        backLabel="Back to Service Leads"
        onBack={() => navigate('/admin/leads')}
      />
      <LeadsModule categoryFilter={category} hideSummary />
    </div>
  );
};

export default LeadsCategoryPage;
