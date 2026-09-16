import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ErrorState, LoadingState } from './PublicPageState';
import GuestPrompt from './GuestPrompt';

const PublicDetail = ({ request, itemKey, backTo, backLabel, render }) => {
  const { id } = useParams();
  const [item, setItem] = useState(null); const [isLoading, setIsLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    request(id).then(({ data }) => { if (active) setItem(data.data?.[itemKey] || null); })
      .catch((err) => { if (active) setError(err.response?.data?.message || 'This item is no longer available.'); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [id, itemKey, request]);
  return <div className="container py-10 sm:py-14"><Link to={backTo} className="text-sm font-medium text-primary-600 hover:underline">← {backLabel}</Link><div className="mt-6">{isLoading ? <LoadingState /> : error || !item ? <ErrorState message={error || 'This item is no longer available.'} /> : <>{render(item)}<GuestPrompt className="mt-10" /></>}</div></div>;
};
export default PublicDetail;
