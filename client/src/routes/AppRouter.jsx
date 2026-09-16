import { Routes, Route, Navigate } from 'react-router-dom';
import PublicRoute from './PublicRoute';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';

import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
import Home from '../pages/Home';
import Unauthorized from '../pages/Unauthorized';
import NotFound from '../pages/NotFound';
import PublicLayout from '../components/layout/PublicLayout';
import Courses from '../pages/public/Courses';
import CourseDetail from '../pages/public/CourseDetail';
import Instructors from '../pages/public/Instructors';
import InstructorDetail from '../pages/public/InstructorDetail';
import Reviews from '../pages/public/Reviews';
import StudentLayout from '../components/layout/StudentLayout';
import StudentDashboard from '../pages/student/StudentDashboard';
import StudentProfile from '../pages/student/StudentProfile';
import StudentCourseDetail from '../pages/student/StudentCourseDetail';
import LessonView from '../pages/student/LessonView';
import StudentSlots from '../pages/student/StudentSlots';
import StudentBookings from '../pages/student/StudentBookings';
import StudentBookingDetail from '../pages/student/StudentBookingDetail';
import StudentReviews from '../pages/student/StudentReviews';
import InstructorLayout from '../components/layout/InstructorLayout';
import InstructorDashboard from '../pages/instructor/InstructorDashboard';
import InstructorProfile from '../pages/instructor/InstructorProfile';
import Availability from '../pages/instructor/Availability';
import InstructorBookings from '../pages/instructor/InstructorBookings';
import InstructorBookingDetail from '../pages/instructor/InstructorBookingDetail';
import InstructorNotifications from '../pages/instructor/InstructorNotifications';
import AdminLayout from '../components/layout/AdminLayout';
import AdminDashboard from '../pages/admin/AdminDashboard';

/**
 * AppRouter — central route registry.
 *
 * Public catalogue routes remain accessible to guests. Auth-only
 * screens use PublicRoute, while dashboards use ProtectedRoute + RoleRoute.
 */
const AppRouter = () => {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/courses/:id" element={<CourseDetail />} />
        <Route path="/instructors" element={<Instructors />} />
        <Route path="/instructors/:id" element={<InstructorDetail />} />
        <Route path="/reviews" element={<Reviews />} />
      </Route>

      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRoute allowedRoles={['student']} />}>
          <Route element={<StudentLayout />}>
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/profile" element={<StudentProfile />} />
            <Route path="/student/courses/:courseId" element={<StudentCourseDetail />} />
            <Route path="/student/lessons/:lessonId" element={<LessonView />} />
            <Route path="/student/slots" element={<StudentSlots />} />
            <Route path="/student/bookings" element={<StudentBookings />} />
            <Route path="/student/bookings/:id" element={<StudentBookingDetail />} />
            <Route path="/student/reviews" element={<StudentReviews />} />
          </Route>
        </Route>
        <Route element={<RoleRoute allowedRoles={['instructor']} />}>
          <Route element={<InstructorLayout />}>
            <Route path="/instructor/dashboard" element={<InstructorDashboard />} />
            <Route path="/instructor/profile" element={<InstructorProfile />} />
            <Route path="/instructor/availability" element={<Availability />} />
            <Route path="/instructor/bookings" element={<InstructorBookings />} />
            <Route path="/instructor/bookings/:id" element={<InstructorBookingDetail />} />
            <Route path="/instructor/notifications" element={<InstructorNotifications />} />
          </Route>
        </Route>
        <Route element={<RoleRoute allowedRoles={['admin']} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Route>
        </Route>
      </Route>

      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRouter;
