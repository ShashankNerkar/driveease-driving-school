import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import InputField from '../../components/common/InputField';
import Alert from '../../components/common/Alert';
import Spinner from '../../components/common/Spinner';
import { isValidEmail } from '../../utils/validators';

const ForgotPassword = () => {
  const [email, setEmail]               = useState('');
  const [emailError, setEmailError]     = useState('');
  const [serverError, setServerError]   = useState('');
  const [successMsg, setSuccessMsg]     = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessMsg('');

    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError('');
    setIsSubmitting(true);

    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim() });
      setSuccessMsg(data.message);
    } catch (err) {
      if (err.response?.status === 429) {
        setServerError('Too many requests. Please wait and try again.');
      } else {
        // Show generic message even on server error — don't reveal details
        setSuccessMsg('If an account with that email exists, a password reset link has been sent.');
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
          <h1 className="text-2xl font-bold text-gray-900">Forgot your password?</h1>
          <p className="text-sm text-gray-500 mt-1">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <div className="card">
          {successMsg ? (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-700">{successMsg}</p>
              <Link to="/login" className="btn-primary inline-flex mt-2">
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <Alert type="error" message={serverError} onClose={() => setServerError('')} />

              <InputField
                id="email"
                name="email"
                label="Email Address"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                error={emailError}
                required
                autoComplete="email"
                autoFocus
              />

              <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                {isSubmitting ? (
                  <><Spinner size="sm" color="text-white" /> Sending…</>
                ) : (
                  'Send Reset Link'
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

export default ForgotPassword;
