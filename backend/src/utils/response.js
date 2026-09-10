/**
 * Predictable Standard API Response Formatter (§14)
 */
function success(data, message = 'Success') {
  return {
    ok: true,
    data: data || null,
    errorCode: null,
    message: message
  };
}

function error(errorCode, message, data = null) {
  return {
    ok: false,
    data: data,
    errorCode: errorCode || 'EXECUTION_ERROR',
    message: message || 'An unexpected error occurred.'
  };
}

module.exports = { success, error };
