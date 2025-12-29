export const BackendStatus = ({ available, checking, onRetry }) => {
  if (checking) {
    return (
      <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-3 mb-4">
        <svg className="animate-spin h-4 w-4 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-white text-sm font-medium">Checking backend...</span>
      </div>
    );
  }

  if (!available) {
    return (
      <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-4">
        <svg className="h-5 w-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
          <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
        </svg>
        <div className="flex-1">
          <p className="text-white font-medium text-sm">Backend Unavailable</p>
          <p className="text-text-muted text-xs mt-0.5">
            Make sure the backend server is running on port 8000
          </p>
        </div>
        <button
          onClick={onRetry}
          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return null;
};
