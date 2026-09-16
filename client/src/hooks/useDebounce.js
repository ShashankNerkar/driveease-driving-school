import { useState, useEffect } from 'react';

/**
 * useDebounce — delays updating a value until the user stops typing.
 *
 * @param {*}      value - The value to debounce (typically a search string)
 * @param {number} delay - Debounce delay in milliseconds (default 400ms)
 * @returns {*} Debounced value
 *
 * Usage:
 *   const debouncedSearch = useDebounce(searchTerm, 400);
 */
const useDebounce = (value, delay = 400) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;
