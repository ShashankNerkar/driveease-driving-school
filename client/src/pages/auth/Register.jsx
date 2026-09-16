import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import InputField from '../../components/common/InputField';
import Alert from '../../components/common/Alert';
import Spinner from '../../components/common/Spinner';
import { isValidEmail, isValidPhone, isStrongPassword, extractServerErrors } from '../../utils/validators';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors]   = useState({});
  const [serverError, setServerError]   = useState('');
  const [successMsg, setSuccessMsg]     = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errors = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      errors.name = 'Name must be at least 2 characters.';
    if (!isValidEmail(form.email))
      errors.email = 'Please enter a valid email address.';
    if (form.phone && !isValidPhone(form.phone))
      errors.phone = 'Enter a valid 10-digit Indian mobile number.';
    if (!isStrongPassword(form.password))
      errors.password = 'Password must be 8+ chars with uppercase, lowercase and a number.';
    if (form.password !== form.confirmPassword)
      errors.confirmPassword = 'Passwords do not match.';
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessMsg('');

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await api.post('/auth/register', {
        name:            form.name.trim(),
        email:           form.email.trim(),
        phone:           form.phone.trim() || undefined,
        password:        form.password,
        confirmPassword: form.confirmPassword,
      });

      login(data.data.user);
      setSuccessMsg(data.message);
      // Navigate to student dashboard — Phase 4 will build the real page
      navigate('/student/dashboard');
    } catch (err) {
      const status = err.response?.status;
      if (status === 400) {
        // Map server validation errors to fields
        setFieldErrors(extractServerErrors(err));
        setServerError(err.response.data.message);
      } else if (status === 409) {
        setFieldErrors({ email: 'An account with this email already exists.' });
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
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-sm text-gray-500 mt-1">Start your driving journey today</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Alert type="error" message={serverError} onClose={() => setServerError('')} />
            <Alert type="success" message={successMsg} />

            <InputField
              id="name"
              name="name"
              label="Full Name"
              type="text"
              placeholder="John Doe"
              value={form.name}
              onChange={handleChange}
              error={fieldErrors.name}
              required
              autoComplete="name"
              autoFocus
            />

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
            />

            <InputField
              id="phone"
              name="phone"
              label="Mobile Number"
              type="tel"
              placeholder="9876543210"
              value={form.phone}
              onChange={handleChange}
              error={fieldErrors.phone}
              autoComplete="tel"
            />

            <InputField
              id="password"
              name="password"
              label="Password"
              type="password"
              placeholder="Min. 8 chars, uppercase, number"
              value={form.password}
              onChange={handleChange}
              error={fieldErrors.password}
              required
              autoComplete="new-password"
            />

            <InputField
              id="confirmPassword"
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              placeholder="Re-enter password"
              value={form.confirmPassword}
              onChange={handleChange}
              error={fieldErrors.confirmPassword}
              required
              autoComplete="new-password"
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full mt-2"
            >
              {isSubmitting ? (
                <><Spinner size="sm" color="text-white" /> Creating account…</>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
