import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { enrollInCourse } from '../../api/courseApi';

const CourseEnrollmentAction = ({ courseId }) => {
  const { user } = useAuth(); const navigate = useNavigate(); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  if (!user) return <Link to="/login" className="btn-primary">Log in to enroll</Link>;
  if (user.role !== 'student') return null;
  const enroll = async () => { setSaving(true); setError(''); try { await enrollInCourse(courseId); navigate('/student/courses'); } catch (err) { setError(err.response?.data?.message || 'We could not enroll you in this course.'); } finally { setSaving(false); } };
  return <div className="mt-7"><button type="button" className="btn-primary" onClick={enroll} disabled={saving}>{saving ? 'Enrolling…' : 'Enroll in course'}</button>{error && <p className="mt-2 text-sm text-red-600">{error}</p>}</div>;
};
export default CourseEnrollmentAction;
