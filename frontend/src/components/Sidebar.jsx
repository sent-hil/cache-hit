export const Sidebar = () => {
  return (
    <aside className="w-20 bg-surface-darker border-r border-border flex flex-col items-center py-6 shrink-0">
      {/* Logo */}
      <div className="mb-8">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 16 16">
            <path d="M5.854 4.854a.5.5 0 1 0-.708-.708l-3.5 3.5a.5.5 0 0 0 0 .708l3.5 3.5a.5.5 0 0 0 .708-.708L2.707 8l3.147-3.146zm4.292 0a.5.5 0 0 1 .708-.708l3.5 3.5a.5.5 0 0 1 0 .708l-3.5 3.5a.5.5 0 0 1-.708-.708L13.293 8l-3.147-3.146z"/>
          </svg>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-2">
        {/* Decks - Active */}
        <button className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors">
          <span className="material-symbols-outlined text-2xl">style</span>
        </button>

        {/* Stats */}
        <button className="w-12 h-12 rounded-xl text-text-muted hover:bg-surface-dark hover:text-white transition-colors flex items-center justify-center">
          <span className="material-symbols-outlined text-2xl">bar_chart</span>
        </button>

        {/* Settings */}
        <button className="w-12 h-12 rounded-xl text-text-muted hover:bg-surface-dark hover:text-white transition-colors flex items-center justify-center">
          <span className="material-symbols-outlined text-2xl">settings</span>
        </button>
      </nav>

      {/* User Avatar */}
      <div className="mt-auto">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
          U
        </div>
      </div>
    </aside>
  );
};
