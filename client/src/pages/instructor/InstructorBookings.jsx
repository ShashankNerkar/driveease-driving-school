import { useEffect, useState } from 'react';
import { getBookingRequests, acceptBooking, rejectBooking } from '../../api/bookingApi';
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from '../../components/public/PublicPageState';

const InstructorBookings = () => {
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);

  const load = async () => {
    try {
      setError('');
      const { data } = await getBookingRequests();
      setBookings(data.data.bookings);
    } catch (e) {
      setError(
        e.response?.data?.message || 'Could not load booking requests.'
      );
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAccept = async (id) => {
    try {
      setBusy(id);
      setError('');
      await acceptBooking(id);
      await load();
    } catch (e) {
      setError(
        e.response?.data?.message || 'Could not accept booking.'
      );
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Reject this booking request?')) return;

    try {
      setBusy(id);
      setError('');
      await rejectBooking(id);
      await load();
    } catch (e) {
      setError(
        e.response?.data?.message || 'Could not reject booking.'
      );
    } finally {
      setBusy(null);
    }
  };

  if (!bookings && !error) return <LoadingState />;

  if (error && !bookings) {
    return <ErrorState message={error} />;
  }

  if (!bookings.length) {
    return (
      <EmptyState
        title="No booking requests"
        message="New student requests will appear here."
      />
    );
  }

  return (
    <section>
      <h1 className="text-2xl font-bold text-gray-900">
        Booking requests
      </h1>

      {error && (
        <p className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-5 space-y-3">
        {bookings.map((booking) => (
          <article
            key={booking._id}
            className="card"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>
                {booking.studentId?.name || 'Student'}
              </strong>

              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold capitalize">
                {booking.status}
              </span>
            </div>

            <p className="mt-2 text-sm text-gray-600">
              {booking.slotId
                ? `${new Date(
                    booking.slotId.date
                  ).toLocaleDateString()} · ${
                    booking.slotId.startTime
                  }–${booking.slotId.endTime}`
                : 'Slot unavailable'}
            </p>

            {booking.status === 'pending' && (
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  disabled={busy === booking._id}
                  onClick={() => handleAccept(booking._id)}
                  className="btn-primary disabled:opacity-60"
                >
                  {busy === booking._id ? 'Processing...' : 'Accept'}
                </button>

                <button
                  type="button"
                  disabled={busy === booking._id}
                  onClick={() => handleReject(booking._id)}
                  className="rounded border px-4 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
};

export default InstructorBookings;