import { useEffect, useState } from 'react';
import { ErrorState, EmptyState, LoadingState } from './PublicPageState';
import GuestPrompt from './GuestPrompt';

const PublicResourceList = ({ title, description, request, collectionKey, emptyTitle, emptyMessage, renderItem, filter }) => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [params, setParams] = useState({ limit: 50 });

  useEffect(() => {
    let active = true;
    setIsLoading(true); setError('');
    request(params).then(({ data }) => {
      if (!active) return;
      const payload = data.data || {};
      setItems(payload[collectionKey] || []);
      setTotal(Number(payload.total) || 0);
    }).catch((err) => {
      if (active) setError(err.response?.data?.message || 'We could not load this information. Please try again.');
    }).finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [request, collectionKey, params]);

  return (
    <div className="container py-10 sm:py-14">
      <div className="max-w-2xl"><p className="text-sm font-semibold uppercase tracking-wide text-primary-600">DriveEase</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{title}</h1><p className="mt-3 text-gray-600">{description}</p></div>
      {filter && <div className="mt-7">{filter({ params, setParams, items, total })}</div>}
      <div className="mt-8" aria-live="polite">
        {isLoading ? <LoadingState /> : error ? <ErrorState message={error} /> : total === 0 ? <EmptyState title={emptyTitle} message={emptyMessage} /> : <>
          <p className="mb-4 text-sm text-gray-500">{total} {total === 1 ? 'result' : 'results'}</p>
          {renderItem(items)}
        </>}
      </div>
      <GuestPrompt className="mt-10" />
    </div>
  );
};

export default PublicResourceList;
