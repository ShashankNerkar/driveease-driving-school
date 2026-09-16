import { useEffect, useState } from 'react';
import { getAvailableSlots } from '../../api/slotApi';
import { createBooking } from '../../api/bookingApi';
import { LoadingState, ErrorState, EmptyState } from '../../components/public/PublicPageState';

const StudentSlots = () => {
  const [slots, setSlots] = useState(null); const [date, setDate] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState('');
  const load = () => { setSlots(null); getAvailableSlots(date ? { date } : undefined).then(({ data }) => setSlots(data.data.slots)).catch((e) => { setError(e.response?.data?.message || 'Could not load available slots.'); setSlots([]); }); };
  useEffect(() => { load(); }, [date]);
  const requestBooking = async (slotId) => { if (!window.confirm('Send a booking request for this slot?')) return; setBusy(slotId); try { await createBooking({ slotId }); setSlots((current) => current.filter((slot) => slot._id !== slotId)); } catch (e) { setError(e.response?.data?.message || 'Could not send booking request.'); } finally { setBusy(''); } };
  if (!slots && !error) return <LoadingState />;
  if (error && !slots) return <ErrorState message={error} />;
  return <section className="space-y-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold text-gray-900">Book a driving slot</h1><p className="mt-1 text-sm text-gray-600">Choose an available instructor time and send a request.</p></div><label className="text-sm font-medium text-gray-700">Date<input type="date" value={date} onChange={(e) => { setError(''); setDate(e.target.value); }} className="ml-2 rounded border p-2" /></label></div>{error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}{slots?.length ? <div className="grid gap-4 md:grid-cols-2">{slots.map((slot) => <article key={slot._id} className="card"><h2 className="font-semibold text-gray-900">{slot.instructorId?.name || 'Instructor'}</h2><p className="mt-2 text-sm text-gray-600">{new Date(slot.date).toLocaleDateString()} · {slot.startTime}–{slot.endTime}</p>{slot.vehicleId && <p className="mt-1 text-sm text-gray-500">Vehicle: {slot.vehicleId.brand} {slot.vehicleId.model}</p>}<button type="button" disabled={busy === slot._id} onClick={() => requestBooking(slot._id)} className="btn-primary mt-4 disabled:opacity-60">{busy === slot._id ? 'Sending…' : 'Request booking'}</button></article>)}</div> : <EmptyState title="No available slots" message="There are no instructor slots matching this date right now." />}</section>;
};
export default StudentSlots;
