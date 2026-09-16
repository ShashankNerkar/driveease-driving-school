import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getCourseLessons, getMyEnrollments } from '../../api/courseApi';
import { LoadingState, ErrorState, EmptyState } from '../../components/public/PublicPageState';

const StudentCourseDetail = () => {
  const { courseId } = useParams(); const [data, setData] = useState(null); const [course, setCourse] = useState(null); const [error, setError] = useState('');
  useEffect(() => { Promise.all([getCourseLessons(courseId), getMyEnrollments()]).then(([lessons, enrollments]) => { setData(lessons.data.data.lessons); setCourse(enrollments.data.data.enrollments.find((item) => item.course?._id === courseId)?.course || null); }).catch((err) => setError(err.response?.data?.message || 'We could not load this course.')); }, [courseId]);
  if (error) return <ErrorState message={error} />; if (!data) return <LoadingState />;
  return <section><Link to="/student/courses" className="text-sm font-semibold text-primary-600 hover:underline">← Courses</Link><h1 className="mt-3 text-2xl font-bold text-gray-900">{course?.title || 'Course lessons'}</h1>{!data.length ? <div className="mt-5"><EmptyState title="No lessons available yet." message="Lessons will appear once they are added to this course." /></div> : <ol className="mt-5 space-y-3">{data.map((lesson) => <li key={lesson._id} className="card flex items-center justify-between gap-4"><div><p className="font-semibold text-gray-900">{lesson.order}. {lesson.title}</p><p className="mt-1 text-sm text-gray-500">{lesson.duration}{lesson.completed ? ' · Completed' : ''}</p></div><Link to={`/student/lessons/${lesson._id}?courseId=${courseId}`} className="btn-secondary">View lesson</Link></li>)}</ol>}</section>;
};
export default StudentCourseDetail;
