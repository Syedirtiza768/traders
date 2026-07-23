import { useNavigate } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { EmptyState } from '../components/ui';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <EmptyState
        icon={<FileQuestion className="h-5 w-5" aria-hidden="true" />}
        title="Page not found"
        description="The page you are looking for does not exist or may have been moved."
        action={
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
              Go Back
            </button>
            <button type="button" onClick={() => navigate('/')} className="btn-primary">
              Go to Dashboard
            </button>
          </div>
        }
      />
    </div>
  );
}
