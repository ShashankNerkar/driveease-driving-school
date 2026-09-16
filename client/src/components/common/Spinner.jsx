/**
 * Spinner — accessible loading indicator.
 *
 * @param {string} size   - 'sm' | 'md' | 'lg'  (default 'md')
 * @param {string} color  - Tailwind color class  (default 'text-primary-600')
 */
const Spinner = ({ size = 'md', color = 'text-primary-600' }) => {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-4',
  };

  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block rounded-full border-current border-t-transparent animate-spin ${sizeMap[size]} ${color}`}
    />
  );
};

export default Spinner;
