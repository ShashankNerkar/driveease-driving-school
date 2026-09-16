import { useEffect, useState } from 'react';
import {
  createSlot,
  deleteSlot,
  getMySlots,
  updateSlot,
} from '../../api/slotApi';
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from '../../components/public/PublicPageState';

const Availability = () => {
  const [slots, setSlots] = useState(null);
  const [form, setForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
  });
  const [error, setError] = useState('');

  const load = () =>
    getMySlots()
      .then((r) => setSlots(r.data.data.slots))
      .catch((e) =>
        setError(
          e.response?.data?.message || 'Could not load availability.'
        )
      );

  useEffect(() => {
    load();
  }, []);

  if (error && !slots) {
    return <ErrorState message={error} />;
  }

  if (!slots) {
    return <LoadingState />;
  }

  const submit = async (event) => {
    event.preventDefault();

    try {
      await createSlot(form);
      setForm({
        date: '',
        startTime: '',
        endTime: '',
      });
      setError('');
      load();
    } catch (e) {
      setError(
        e.response?.data?.message || 'Could not create slot.'
      );
    }
  };

  const remove = async (id) => {
    try {
      await deleteSlot(id);
      load();
    } catch (e) {
      setError(
        e.response?.data?.message || 'Could not delete slot.'
      );
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={submit}
        className="card grid gap-3 md:grid-cols-4"
      >
        <h1 className="md:col-span-4 text-2xl font-bold">
          Availability
        </h1>

        {['date', 'startTime', 'endTime'].map((key) => (
          <input
            key={key}
            required
            type={key === 'date' ? 'date' : 'time'}
            value={form[key]}
            onChange={(e) =>
              setForm({
                ...form,
                [key]: e.target.value,
              })
            }
            className="rounded border p-2"
          />
        ))}

        <button className="btn-primary">
          Create slot
        </button>

        {error && (
          <p className="md:col-span-4 text-sm text-red-600">
            {error}
          </p>
        )}
      </form>

      {slots.length ? (
        <div className="space-y-3">
          {slots.map((slot) => (
            <article
              key={slot._id}
              className="card flex justify-between"
            >
              <span>
                {new Date(slot.date).toLocaleDateString()} ·{' '}
                {slot.startTime}–{slot.endTime}
              </span>

              <button
                onClick={() => remove(slot._id)}
                className="text-sm font-semibold text-red-600"
              >
                Delete
              </button>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No availability scheduled"
          message="Create an available slot to start your schedule."
        />
      )}
    </div>
  );
};

export default Availability;
