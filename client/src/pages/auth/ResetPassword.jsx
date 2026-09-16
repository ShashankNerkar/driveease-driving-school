import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import InputField from '../../components/common/InputField';
import Alert from '../../components/common/Alert';
import Spinner from '../../components/common/Spinner';
import { isStrongPassword, extractServerErrors } from '../../utils/validators';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [form, setForm]                 = useState({ password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors]   = useState({});
  const [serverError, setServerError]   = useState('');
  const [successMsg, setSuccessMsg]     = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setServerError('Invalid or missing reset token. Please request a new reset link.');
    }
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errors = {};
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
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }

    setIsSubmitting(true);
    try {
      const { data } = await api.post('/auth/reset-password', {
        token,
        password:        form.password,
        confirmPassword: form.confirmPassword,
      });
      setSuccessMsg(data.message);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      const status = err.response?.status;
      if (status === 400) {
        const serverErrs = extractServerErrors(err);
        if (Object.keys(serverErrs).length > 0) setFieldErrors(serverErrs);
        else setServerError(err.response.data.message);
      } else {
        setServerError(err.response?.data?.message || 'Something went wrong. Please request a new reset link.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold">D</span>
            </div>
            <span className="text-xl font-bold text-gray-900">DriveEase</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Set new password</h1>
          <p className="text-sm text-gray-500 mt-1">Choose a strong password for your account.</p>
        </div>

        <div className="card">
          {successMsg ? (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-700">{successMsg}</p>
              <p className="text-xs text-gray-400">Redirecting to login…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <Alert type="error" message={serverError} onClose={() => setServerError('')} />

              <InputField
                id="password"
                name="password"
                label="New Password"
                type="password"
                placeholder="Min. 8 chars, uppercase, number"
                value={form.password}
                onChange={handleChange}
                error={fieldErrors.password}
                required
                autoComplete="new-password"
                disabled={!token}
                autoFocus
              />

              <InputField
                id="confirmPassword"
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                placeholder="Re-enter new password"
                value={form.confirmPassword}
                onChange={handleChange}
                error={fieldErrors.confirmPassword}
                required
                autoComplete="new-password"
                disabled={!token}
              />

              <button
                type="submit"
                disabled={isSubmitting || !token}
                className="btn-primary w-full"
              >
                {isSubmitting ? (
                  <><Spinner size="sm" color="text-white" /> Saving…</>
                ) : (
                  'Reset Password'
                )}
              </button>

              <p className="text-center text-sm text-gray-500">
                <Link to="/login" className="text-primary-600 hover:underline">
                  ← Back to Login
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
