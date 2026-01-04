/**
 * Get the appropriate locale string based on the current app language
 * @returns {string} The locale string (e.g., 'en-US', 'zh-CN', 'sv-SE')
 */
export const getCurrentLocale = () => {
  const currentLanguage = localStorage.getItem('language') || 'en';
  switch (currentLanguage) {
    case 'zh':
      return 'zh-CN';
    case 'sv':
      return 'sv-SE';
    default:
      return 'en-US';
  }
};

/**
 * Format a date using the current app locale
 * @param {Date|string} date - The date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDateWithLocale = (date, options = {}) => {
  if (!date) return '';
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return date.toString();
  
  const locale = getCurrentLocale();
  return dateObj.toLocaleDateString(locale, options);
};

/**
 * Format a time using the current app locale
 * @param {Date|string} date - The date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted time string
 */
export const formatTimeWithLocale = (date, options = { hour: '2-digit', minute: '2-digit' }) => {
  if (!date) return '';
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return date.toString();
  
  const locale = getCurrentLocale();
  return dateObj.toLocaleTimeString(locale, options);
};

/**
 * Format a date and time using the current app locale
 * @param {Date|string} date - The date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date and time string
 */
export const formatDateTimeWithLocale = (date, options = {}) => {
  if (!date) return '';
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return date.toString();
  
  const locale = getCurrentLocale();
  return dateObj.toLocaleString(locale, options);
};