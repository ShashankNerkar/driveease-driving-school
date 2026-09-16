import { getApprovedReviews } from '../../api/publicApi';
import { formatDate } from '../../utils/formatDate';
import PublicResourceList from '../../components/public/PublicResourceList';

const Stars = ({ rating }) => <span aria-label={`${rating} out of 5 stars`} className="text-accent-500">{'★'.repeat(rating)}<span className="text-gray-200">{'★'.repeat(5 - rating)}</span></span>;
const Reviews = () => <PublicResourceList title="Student reviews" description="Hear from learners who have shared their DriveEase experience." request={getApprovedReviews} collectionKey="reviews" emptyTitle="No reviews have been published yet" emptyMessage="Approved student reviews will appear here." renderItem={(items) => <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{items.map((review) => <article key={review._id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><Stars rating={review.rating} /><blockquote className="mt-4 text-sm leading-6 text-gray-600">“{review.comment}”</blockquote><footer className="mt-5 border-t border-gray-100 pt-4"><p className="text-sm font-semibold text-gray-900">{review.studentName || 'DriveEase student'}</p><p className="mt-1 text-xs text-gray-500">{formatDate(review.approvedAt || review.createdAt)}</p></footer></article>)}</div>} />;
export default Reviews;
