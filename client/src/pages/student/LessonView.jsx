import { Link, useLocation, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { completeLesson, getLesson } from '../../api/courseApi';
import { LoadingState, ErrorState } from '../../components/public/PublicPageState';

const LessonView = () => {
  const { lessonId } = useParams(); const location = useLocation(); const courseId = new URLSearchParams(location.search).get('courseId');
  const [data, setData] = useState(null); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  useEffect(() => { getLesson(lessonId, courseId).then(({ data: response }) => setData(response.data)).catch((err) => setError(err.response?.data?.message || 'We could not load this lesson.')); }, [lessonId, courseId]);
  const markComplete = async () => { setSaving(true); try { const { data: response } = await completeLesson(lessonId, courseId); setData((current) => ({ ...current, progress: response.data.progress })); } catch (err) { setError(err.response?.data?.message || 'We could not update your progress.'); } finally { setSaving(false); } };
  if (error) return <ErrorState message={error} />; if (!data) return <LoadingState />;
  const { lesson, progress, accessCourseId } = data;
  return <article className="card"><Link to={`/student/courses/${accessCourseId}`} className="text-sm font-semibold text-primary-600 hover:underline">← Course lessons</Link><h1 className="mt-3 text-2xl font-bold text-gray-900">{lesson.title}</h1><p className="mt-2 text-sm text-gray-500">Duration: {lesson.duration}</p>{lesson.description && <p className="mt-5 whitespace-pre-line text-gray-700">{lesson.description}</p>}{lesson.videoUrl && <a className="mt-5 inline-flex text-sm font-semibold text-primary-600 hover:underline" href={lesson.videoUrl} target="_blank" rel="noreferrer">Open lesson video</a>}{lesson.content && <div className="mt-5 whitespace-pre-line text-gray-700">{lesson.content}</div>}<div className="mt-7">{progress?.completed ? <p className="font-medium text-green-700">Lesson completed.</p> : <button type="button" className="btn-primary" onClick={markComplete} disabled={saving}>{saving ? 'Saving…' : 'Mark complete'}</button>}</div></article>;
};
export default LessonView;
