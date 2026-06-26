import { Navigate, useParams } from 'react-router-dom';
import LeadsCategoryPage from './LeadsCategoryPage';
import type { LeadCategoryKey } from '../LeadsModule';

const VALID_CATEGORIES: LeadCategoryKey[] = ['total', 'new', 'in-progress', 'completed', 'cancelled'];

const LeadsCategoryRoute: React.FC = () => {
  const { category } = useParams();
  if (!category || !VALID_CATEGORIES.includes(category as LeadCategoryKey)) {
    return <Navigate to="/admin/leads" replace />;
  }
  return <LeadsCategoryPage category={category as LeadCategoryKey} />;
};

export default LeadsCategoryRoute;
