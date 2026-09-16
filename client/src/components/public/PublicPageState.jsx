import Spinner from '../common/Spinner';

export const LoadingState = () => <div className="flex min-h-48 items-center justify-center"><Spinner size="lg" /></div>;

export const ErrorState = ({ message = 'We could not load this page. Please try again.' }) => (
  <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{message}</div>
);

export const EmptyState = ({ title = 'Nothing to show yet', message = 'Please check back soon.' }) => (
  <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center"><h2 className="font-semibold text-gray-900">{title}</h2><p className="mt-1 text-sm text-gray-500">{message}</p></div>
);
