import { useNavigate } from 'react-router-dom';
import LeadsModule from '../LeadsModule';

interface LeadsOverviewPageProps {
  externalSearch?: string;
}

const LeadsOverviewPage: React.FC<LeadsOverviewPageProps> = ({ externalSearch }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 min-w-0 max-w-full">
      <LeadsModule externalSearch={externalSearch} onCategorySelect={(category) => navigate(`/admin/leads/${category}`)} />
    </div>
  );
};

export default LeadsOverviewPage;
