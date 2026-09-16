import { useCallback, useEffect, useState } from 'react';
import {
  deleteReview,
  deleteTestimonial,
  getMyReviews,
  getMyTestimonials,
  getReviewEligibleTargets,
  submitReview,
  submitTestimonial,
} from '../../api/reviewApi';
import { LoadingState, ErrorState } from '../../components/public/PublicPageState';

const StudentReviews = () => {
  const [targets, setTargets] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [testimonials, setTestimonials] = useState(null);

  const [review, setReview] = useState({
    target: '',
    rating: '',
    comment: '',
  });

  const [caption, setCaption] = useState('');
  const [video, setVideo] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');

      const [a, b, c] = await Promise.all([
        getReviewEligibleTargets(),
        getMyReviews(),
        getMyTestimonials(),
      ]);

      setTargets(a.data.data.targets || []);
      setReviews(b.data.data.reviews || []);
      setTestimonials(c.data.data.testimonials || []);
    } catch (e) {
      setError(
        e.response?.data?.message ||
          'Could not load your sharing tools.'
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (event) => {
    event.preventDefault();

    if (!review.target || !review.rating || !review.comment.trim()) {
      setError('Please complete all review fields.');
      return;
    }

    const target = targets.find(
      (item) => item.targetId === review.target
    );

    if (!target) {
      setError('Please select a valid review target.');
      return;
    }

    try {
      setBusy(true);
      setError('');

      await submitReview({
        targetType: target.targetType,
        targetId: target.targetId,
        rating: Number(review.rating),
        comment: review.comment.trim(),
      });

      setReview({
        target: '',
        rating: '',
        comment: '',
      });

      await load();
    } catch (e) {
      setError(
        e.response?.data?.message ||
          'Could not submit review.'
      );
    } finally {
      setBusy(false);
    }
  };

  const upload = async (event) => {
    event.preventDefault();

    if (!video) {
      setError(
        'Choose an MP4, MOV, or WebM video first.'
      );
      return;
    }

    try {
      setBusy(true);
      setError('');

      const form = new FormData();
      form.append('video', video);
      form.append('caption', caption.trim());

      await submitTestimonial(form);

      setCaption('');
      setVideo(null);
      event.target.reset();

      await load();
    } catch (e) {
      setError(
        e.response?.data?.message ||
          'Could not submit testimonial.'
      );
    } finally {
      setBusy(false);
    }
  };

  const removeReview = async (id) => {
    try {
      setError('');
      await deleteReview(id);
      await load();
    } catch (e) {
      setError(
        e.response?.data?.message ||
          'Could not delete review.'
      );
    }
  };

  const removeTestimonial = async (id) => {
    try {
      setError('');
      await deleteTestimonial(id);
      await load();
    } catch (e) {
      setError(
        e.response?.data?.message ||
          'Could not delete testimonial.'
      );
    }
  };

  if (!targets || !reviews || !testimonials) {
    return error ? (
      <ErrorState message={error} />
    ) : (
      <LoadingState />
    );
  }

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Reviews & stories
        </h1>

        <p className="mt-1 text-sm text-gray-600">
          Reviews and videos are private until approved
          by DriveEase.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Review */}
      <form
        onSubmit={submit}
        className="card space-y-3"
      >
        <h2 className="text-lg font-semibold">
          Write a review
        </h2>

        <select
          required
          value={review.target}
          onChange={(e) =>
            setReview({
              ...review,
              target: e.target.value,
            })
          }
          className="w-full rounded border p-2"
        >
          <option value="">
            Choose a completed course or attended instructor
          </option>

          {targets.map((item) => (
            <option
              key={`${item.targetType}-${item.targetId}`}
              value={item.targetId}
            >
              {item.targetType === 'course'
                ? 'Course'
                : 'Instructor'}{' '}
              — {item.label}
            </option>
          ))}
        </select>

        <select
          required
          value={review.rating}
          onChange={(e) =>
            setReview({
              ...review,
              rating: e.target.value,
            })
          }
          className="rounded border p-2"
        >
          <option value="">Rating</option>

          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value}/5
            </option>
          ))}
        </select>

        <textarea
          required
          minLength="3"
          maxLength="1000"
          value={review.comment}
          onChange={(e) =>
            setReview({
              ...review,
              comment: e.target.value,
            })
          }
          className="w-full rounded border p-2"
          placeholder="Share your experience"
        />

        <button
          type="submit"
          disabled={busy || !targets.length}
          className="btn-primary disabled:opacity-60"
        >
          {busy ? 'Submitting...' : 'Submit review'}
        </button>

        {!targets.length && (
          <p className="text-sm text-gray-500">
            No review-eligible courses or instructors remain.
          </p>
        )}
      </form>

      {/* Testimonial */}
      <form
        onSubmit={upload}
        className="card space-y-3"
      >
        <h2 className="text-lg font-semibold">
          Submit a video testimonial
        </h2>

        <input
          type="file"
          accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
          onChange={(e) =>
            setVideo(e.target.files?.[0] || null)
          }
        />

        <p className="text-xs text-gray-500">
          MP4, MOV, or WebM; up to 50 MB.
        </p>

        <input
          value={caption}
          maxLength="300"
          onChange={(e) =>
            setCaption(e.target.value)
          }
          className="w-full rounded border p-2"
          placeholder="Optional caption"
        />

        <button
          type="submit"
          disabled={busy}
          className="btn-primary disabled:opacity-60"
        >
          {busy
            ? 'Uploading...'
            : 'Upload testimonial'}
        </button>
      </form>

      {/* My Reviews */}
      <div>
        <h2 className="text-xl font-bold">
          My reviews
        </h2>

        <div className="mt-3 space-y-3">
          {reviews.length ? (
            reviews.map((item) => (
              <article
                key={item._id}
                className="card"
              >
                <p className="font-semibold">
                  {item.rating}/5 · {item.targetType}
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  {item.comment}
                </p>

                <p className="mt-2 text-xs text-gray-500">
                  Status: {item.status}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    removeReview(item._id)
                  }
                  className="mt-3 text-sm font-semibold text-red-600"
                >
                  Delete review
                </button>
              </article>
            ))
          ) : (
            <p className="text-sm text-gray-500">
              No reviews submitted.
            </p>
          )}
        </div>
      </div>

      {/* My Testimonials */}
      <div>
        <h2 className="text-xl font-bold">
          My testimonials
        </h2>

        <div className="mt-3 space-y-3">
          {testimonials.length ? (
            testimonials.map((item) => (
              <article
                key={item._id}
                className="card"
              >
                <p className="text-sm text-gray-700">
                  {item.caption || 'Video testimonial'}
                </p>

                <p className="mt-2 text-xs text-gray-500">
                  Status: {item.status}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    removeTestimonial(item._id)
                  }
                  className="mt-3 text-sm font-semibold text-red-600"
                >
                  Delete testimonial
                </button>
              </article>
            ))
          ) : (
            <p className="text-sm text-gray-500">
              No testimonials submitted.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default StudentReviews;
