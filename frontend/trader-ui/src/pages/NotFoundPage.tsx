import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1 className="text-6xl font-bold text-gray-200 mb-2">404</h1>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Page Not Found</h2>
      <p className="text-gray-500 mb-6 max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="flex gap-3">
        <button onClick={() => navigate(-1)} className="btn-secondary">
          Go Back
        </button>
        <button onClick={() => navigate('/')} className="btn-primary">
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
