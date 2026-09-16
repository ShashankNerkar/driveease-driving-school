import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import InputField from '../../components/common/InputField';
import Alert from '../../components/common/Alert';
import Spinner from '../../components/common/Spinner';
import { isValidEmail, extractServerErrors } from '../../utils/validators';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Redirect to the page the user tried to visit, or to their dashboard
  const from = location.state?.from?.pathname;

  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors]   = useState({});
  const [serverError, setServerError]   = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errors = {};
    if (!isValidEmail(form.email))  errors.email    = 'Please enter a valid email address.';
    if (!form.password.trim())      errors.password = 'Password is required.';
    return errors;
  };

  const getDashboard = (role) => {
    const map = { student: '/student/dashboard', instructor: '/instructor/dashboard', admin: '/admin/dashboard' };
    return map[role] || '/';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const errors = validate();
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }

    setIsSubmitting(true);
    try {
      const { data } = await api.post('/auth/login', {
        email:    form.email.trim(),
        password: form.password,
      });

      login(data.data.user);
      navigate(from || getDashboard(data.data.user.role), { replace: true });
    } catch (err) {
      const status = err.response?.status;
      if (status === 400) {
        setFieldErrors(extractServerErrors(err));
      } else if (status === 401) {
        setServerError('Invalid email or password.');
      } else if (status === 403) {
        setServerError('Your account has been deactivated. Please contact support.');
      } else if (status === 429) {
        setServerError('Too many login attempts. Please wait a few minutes and try again.');
      } else {
        setServerError(err.response?.data?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold">D</span>
            </div>
            <span className="text-xl font-bold text-gray-900">DriveEase</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-sm text-gray-500 mt-1">Log in to your DriveEase account</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Alert type="error" message={serverError} onClose={() => setServerError('')} />

            <InputField
              id="email"
              name="email"
              label="Email Address"
              type="email"
              placeholder="john@example.com"
              value={form.email}
              onChange={handleChange}
              error={fieldErrors.email}
              required
              autoComplete="email"
              autoFocus
            />

            <InputField
              id="password"
              name="password"
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              error={fieldErrors.password}
              required
              autoComplete="current-password"
            />

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-xs text-primary-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full"
            >
              {isSubmitting ? (
                <><Spinner size="sm" color="text-white" /> Logging in…</>
              ) : (
                'Log In'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
