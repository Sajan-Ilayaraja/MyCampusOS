/**
 * Centralized API Error Utility
 * Parses Axios and fetch exceptions to return readable messages and prevent crashes.
 */
export const parseApiError = (error) => {
  if (!error) return 'An unexpected error occurred.';
  
  if (error.response) {
    // Server responded with a status code out of the 2xx range
    const data = error.response.data;
    if (data && typeof data === 'object') {
      if (data.message) return data.message;
      if (data.error && typeof data.error === 'string') return data.error;
      if (data.error && data.error.message) return data.error.message;
    }
  } else if (error.request) {
    // The request was made but no response was received
    return 'No response from server. Please check if backend is running.';
  }
  
  if (error.message) {
    if (error.message === 'canceled') return 'Request was canceled.';
    return error.message;
  }
  
  return 'Connection failed. Please check your internet connection.';
};
