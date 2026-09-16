import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getCourses, getInstructors, getVehicles, getApprovedReviews } from '../api/publicApi';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/common/Spinner';
import GuestPrompt from '../components/public/GuestPrompt';

const dashboardFor = (role) => ({ student: '/student/dashboard', instructor: '/instructor/dashboard', admin: '/admin/dashboard' }[role] || '/');
const Home = () => {
  const { isAuthenticated, user } = useAuth();
  const [summary, setSummary] = useState(null);
  useEffect(() => {
    let active = true;
    Promise.allSettled([getCourses({ limit: 1 }), getInstructors({ limit: 1 }), getVehicles({ limit: 1 }), getApprovedReviews({ limit: 1 })]).then((results) => {
      if (active) setSummary(results.map((result) => result.status === 'fulfilled' ? Number(result.value.data.data?.total) || 0 : null));
    });
    return () => { active = false; };
  }, []);
  const links = [['Explore courses', '/courses', 'Find a course designed for where you are today.'], ['Meet instructors', '/instructors', 'Get to know the people who guide every lesson.'], ['Study road rules', '/rules', 'Build safer habits before you get behind the wheel.']];
  return <><section className="bg-gradient-to-br from-primary-800 via-primary-700 to-primary-600 py-16 text-white sm:py-24"><div className="container max-w-5xl"><p className="text-sm font-semibold uppercase tracking-widest text-primary-200">Drive with confidence</p><h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">Learn the skills that make every journey safer.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-primary-100">Explore driving courses, meet instructors, and prepare for the road at your own pace.</p><div className="mt-8 flex flex-wrap gap-3">{isAuthenticated ? <Link to={dashboardFor(user?.role)} className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-primary-700 hover:bg-primary-50">Go to dashboard</Link> : <><Link to="/register" className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-primary-700 hover:bg-primary-50">Start learning</Link><Link to="/courses" className="rounded-lg border border-primary-300 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-800">Browse courses</Link></>}</div></div></section><section className="container py-12 sm:py-16"><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{[['Courses', '/courses'], ['Instructors', '/instructors'], ['Training vehicles', '/vehicles'], ['Student reviews', '/reviews']].map(([label, to], index) => <Link key={to} to={to} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-primary-300 hover:shadow"><p className="text-3xl font-bold text-primary-700">{summary ? summary[index] : <Spinner size="sm" />}</p><p className="mt-2 text-sm font-medium text-gray-600">{label}</p></Link>)}</div></section><section className="container pb-12 sm:pb-16"><div className="grid gap-5 md:grid-cols-3">{links.map(([title, to, text]) => <Link key={to} to={to} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"><h2 className="font-semibold text-gray-900">{title}</h2><p className="mt-2 text-sm leading-6 text-gray-600">{text}</p><span className="mt-5 inline-block text-sm font-semibold text-primary-600">Learn more →</span></Link>)}</div><GuestPrompt className="mt-10" /></section></>;
};
export default Home;
