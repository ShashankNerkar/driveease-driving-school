import { forwardRef, useState } from 'react';

/**
 * InputField — accessible form input with label, error, and optional
 * password-visibility toggle.
 *
 * Props:
 * @param {string}  id           - Input id (links label htmlFor)
 * @param {string}  label        - Label text
 * @param {string}  type         - Input type (text | email | password | tel | date)
 * @param {string}  error        - Field-level error message
 * @param {boolean} required     - Whether the field is required
 * @param {string}  className    - Additional class for the wrapper
 * All other props are forwarded to <input>.
 */
const InputField = forwardRef(
  ({ id, label, type = 'text', error, required = false, className = '', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType  = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className={`space-y-1 ${className}`}>
        {label && (
          <label htmlFor={id} className="form-label">
            {label}
            {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
          </label>
        )}

        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={inputType}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            className={`form-input ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''} ${isPassword ? 'pr-10' : ''}`}
            {...props}
          />

          {/* Password visibility toggle */}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              tabIndex={-1}
            >
              {showPassword ? (
                // Eye-off icon
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9.27-3.11-11-7.5a11.63 11.63 0 012.47-3.85M6.343 6.343A9.956 9.956 0 0112 5c5 0 9.27 3.11 11 7.5a11.636 11.636 0 01-4.344 5.157M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                </svg>
              ) : (
                // Eye icon
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-.274.857-.67 1.664-1.174 2.4M15.536 15.536A9.956 9.956 0 0112 19c-4.478 0-8.268-2.943-9.542-7" />
                </svg>
              )}
            </button>
          )}
        </div>

        {error && (
          <p id={`${id}-error`} role="alert" className="text-xs text-red-600 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

InputField.displayName = 'InputField';

export default InputField;
