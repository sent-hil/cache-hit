# Frontend Specification - Code Runner UI

## Overview
React + Vite application for executing Python code with Monaco editor. Integrates with FastAPI backend for code execution. Built for local development with future spaced repetition features.

## Technology Stack

### Core
- **Framework**: React 18+ with Vite
- **Language**: JavaScript (can migrate to TypeScript later)
- **Editor**: Monaco Editor (ESM build, not full 8MB bundle)
- **Styling**: Tailwind CSS (matching existing design system)
- **State**: React useState/useReducer (no external state library)
- **Routing**: None (single page application)

### Dependencies
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "monaco-editor": "^0.52.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^6.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "ansi-to-html": "^0.7.2"
  }
}
```

## Design System

### Colors (from existing HTML)
```javascript
const colors = {
  primary: "#137fec",
  backgroundLight: "#f6f7f8",
  backgroundDark: "#101922",
  surfaceDark: "#192633",
  surfaceDarker: "#111a22",
  terminalBg: "#0d1117",
  border: "#233648",
  borderLight: "#324d67",
  textMuted: "#92adc9"
}
```

### Typography
- **Display Font**: Space Grotesk (Google Fonts)
- **Mono Font**: JetBrains Mono (Google Fonts)

### Spacing & Layout
- Consistent with existing Tailwind defaults
- Custom scrollbar styling (8px width, dark theme)

## Application Architecture

### Component Structure
```
src/
├── App.jsx                 # Root component
├── components/
│   ├── Editor.jsx          # Monaco editor wrapper
│   ├── OutputPanel.jsx     # Output display with metrics
│   ├── SplitPane.jsx       # Resizable split view
│   └── RunButton.jsx       # Execution trigger button
├── hooks/
│   ├── useCodeExecution.js # Execution logic & state
│   └── useBackendHealth.js # Backend connectivity
├── utils/
│   ├── ansiParser.js       # Full ANSI code parsing
│   └── api.js              # Backend API calls
├── styles/
│   └── index.css           # Tailwind + custom styles
└── main.jsx                # Entry point
```

### State Management
Use component-level `useState` for:
- `code`: Editor content (string)
- `output`: Execution results (object)
- `isRunning`: Execution status (boolean)
- `backendAvailable`: Health check status (boolean)
- `executionTimer`: Elapsed time counter (number)
- `splitPosition`: Divider position (number, resets to 50)

No global state management library (Context, Zustand, etc.)

## Monaco Editor Configuration

### Setup
Use Monaco Editor ESM build following https://github.com/microsoft/monaco-editor/tree/main/samples/browser-esm-vite-react

### Editor Options
```javascript
{
  language: "python",
  theme: "vs-dark",
  minimap: { enabled: false },
  fontSize: 14,
  fontFamily: "JetBrains Mono, monospace",
  lineNumbers: "on",  // Always visible
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 4,
  insertSpaces: true,
  wordWrap: "on",

  // Python language features
  quickSuggestions: true,
  suggestOnTriggerCharacters: true,
  acceptSuggestionOnCommitCharacter: true,
  snippetSuggestions: "inline",

  // Full linting (Pyright/Pylance)
  "python.analysis.typeCheckingMode": "basic",
  validate: true
}
```

### Keyboard Shortcuts
- **Cmd/Ctrl+Enter**: Execute code (primary shortcut, like Jupyter)
- Standard Monaco shortcuts (Cmd+S disabled or mapped to run)

### Initial Code
```python
# Write your Python code here and press Cmd+Enter to run
```

## Layout & UI Components

### Overall Layout
```
+------------------------------------------------------------------+
|  Header (optional, minimal branding)                             |
+------------------------------------------------------------------+
|                                                                  |
|  Monaco Editor (50% height, resizable)                          |
|  - Dark theme (vs-dark)                                         |
|  - Line numbers visible                                         |
|  - Full Python linting                                          |
|                                                                  |
+----------------------- Resizable Divider -----------------------+
|                                                                  |
|  Output Panel (50% height, resizable)                           |
|  - stdout/stderr output (ANSI colored)                          |
|  - Execution metrics footer                                     |
|  - Run button (top-right)                                       |
|                                                                  |
+------------------------------------------------------------------+
```

### Resizable Splitter
- **Library**: Use `react-split` or custom implementation with mouse events
- **Behavior**: Free-form dragging (no snap points)
- **Reset**: Double-click divider resets to 50/50 split
- **Persistence**: NO - always resets to 50/50 on page load
- **Min sizes**: Editor min 20%, Output min 20%

### Run Button
**Location**: Top-right of output panel or floating over editor

**States**:
- **Ready**: "Run" with play icon
- **Running**: "Running..." with inline spinner
- **Disabled**: When backend unavailable (grayed out)

**Styling**:
```jsx
<button className="
  flex items-center gap-2 px-4 py-2
  bg-primary hover:bg-primary/90
  text-white font-medium rounded-lg
  transition-colors disabled:opacity-50 disabled:cursor-not-allowed
">
  {isRunning ? (
    <>
      <Spinner />
      Running...
    </>
  ) : (
    <>
      <PlayIcon />
      Run
    </>
  )}
</button>
```

### Output Panel

#### Structure
```
+----------------------------------------------------------+
| [Run Button (top-right)]                                  |
+----------------------------------------------------------+
| Output Content (scrollable pre element)                   |
| - ANSI colored text                                       |
| - stdout + stderr merged                                  |
| - Neutral display (no red error highlighting)             |
|                                                           |
+----------------------------------------------------------+
| Metrics Footer (fixed at bottom)                          |
| ⏱️ 142ms | 💾 23.5MB | ⚡ 12.3% CPU | Exit: 0           |
+----------------------------------------------------------+
```

#### Output Display
- **Element**: `<pre>` with `font-mono` styling
- **ANSI Support**: Full ANSI escape code parsing (colors, bold, underline, etc.)
  - Use library: `ansi-to-html` or custom parser
- **Scrolling**: Auto-scroll to bottom on new output
- **Overflow**: Vertical scroll, horizontal scroll for long lines
- **Styling**: Terminal-like appearance with `bg-terminal-bg` color

#### Metrics Display
Always visible footer showing:
- ⏱️ **Execution Time**: In milliseconds (e.g., "142.5ms")
- 💾 **Memory Used**: In MB (e.g., "23.5MB")
- ⚡ **CPU Usage**: Percentage (e.g., "12.3%")
- 🚪 **Exit Code**: Integer (e.g., "Exit: 0")
- 📄 **File Path**: Container path (show on hover/tooltip)

**Timer During Execution**: Show live elapsed time counter while running
- Updates every 100ms
- Format: "Running... 2.3s"
- Final metrics replace timer when complete

## Backend Integration

### API Endpoints

#### Health Check
```javascript
GET http://localhost:8000/health

Response:
{
  status: "ok",
  containers: { python: "running", ruby: "running" },
  uptime_seconds: 123.45
}
```

#### Code Execution
```javascript
POST http://localhost:8000/execute/python
Content-Type: application/json

Request:
{
  code: "print('Hello, World!')"
}

Response:
{
  stdout: "Hello, World!\n",
  stderr: "",
  exit_code: 0,
  execution_time_ms: 45.23,
  container_id: "abc123",
  language: "python",
  image_name: "python:3.10-slim",
  memory_used_mb: 12.34,
  cpu_percent: 5.67,
  file_path: "/tmp/exec_<uuid>.py"
}
```

### Connection Handling

#### Initial Health Check
- **On Mount**: Ping `/health` endpoint immediately when app loads
- **Success**: Enable run button, show "Backend Ready" indicator
- **Failure**: Disable run button, show "Backend Unavailable" message
- **Retry**: Manual retry button or auto-retry every 5 seconds

#### Execution Flow
1. User clicks Run or presses Cmd+Enter
2. Check if `isRunning === true`, if so: ignore request (don't queue)
3. Set `isRunning = true`, start timer
4. POST code to `/execute/python`
5. On response: Update output, metrics, set `isRunning = false`
6. On error: Show error message in output, set `isRunning = false`

#### Queue Strategy (Backend Unavailable)
- **Queue Latest Only**: If backend is down, queue the most recent run
- **Discard Old**: New run requests replace queued run
- **Auto-Execute on Reconnect**: When backend becomes available, execute queued run
- **UI Feedback**: Show "Waiting for backend..." status

#### Error Handling
```javascript
// Network error
if (error.message === "Failed to fetch") {
  setOutput({
    stdout: "",
    stderr: "Backend unavailable. Check if server is running on port 8000.",
    exit_code: -1
  });
  setBackendAvailable(false);
}

// HTTP 500 error
if (response.status === 500) {
  const data = await response.json();
  setOutput({
    stdout: data.stdout || "",
    stderr: data.stderr || "Docker API error occurred",
    exit_code: data.exit_code || -1
  });
}
```

## Custom Hooks

### useCodeExecution
```javascript
const useCodeExecution = () => {
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [executionTimer, setExecutionTimer] = useState(0);
  const [queuedRun, setQueuedRun] = useState(null);

  const executeCode = async (code) => {
    // Ignore if already running
    if (isRunning) return;

    setIsRunning(true);
    startTimer();

    try {
      const response = await fetch('http://localhost:8000/execute/python', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      const data = await response.json();
      setOutput(data);
    } catch (error) {
      // Handle error
    } finally {
      setIsRunning(false);
      stopTimer();
    }
  };

  return { output, isRunning, executionTimer, executeCode };
};
```

### useBackendHealth
```javascript
const useBackendHealth = () => {
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('http://localhost:8000/health');
        setAvailable(response.ok);
      } catch {
        setAvailable(false);
      } finally {
        setChecking(false);
      }
    };

    // Check on mount
    checkHealth();

    // Optional: Poll periodically if backend goes down
    // const interval = setInterval(checkHealth, 5000);
    // return () => clearInterval(interval);
  }, []);

  return { available, checking };
};
```

## Styling Implementation

### Tailwind Configuration
```javascript
// tailwind.config.js
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#137fec',
        'background-dark': '#101922',
        'surface-dark': '#192633',
        'surface-darker': '#111a22',
        'terminal-bg': '#0d1117',
        'border': '#233648',
        'border-light': '#324d67',
        'text-muted': '#92adc9',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
```

### Custom CSS
```css
/* Custom scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #111a22;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #324d67;
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #4b6a88;
}

/* Output pre styling */
.output-panel pre {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
  padding: 1rem;
  margin: 0;
  background-color: #0d1117;
  color: #e6edf3;
  overflow: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* Resizable divider */
.split-divider {
  width: 100%;
  height: 4px;
  background: #233648;
  cursor: ns-resize;
  transition: background 0.2s;
}

.split-divider:hover {
  background: #324d67;
}

.split-divider:active {
  background: #137fec;
}
```

## ANSI Color Support

### Full ANSI Code Parsing
Parse and render all ANSI escape codes:
- **Colors**: 30-37 (foreground), 40-47 (background), 90-97 (bright)
- **Styles**: Bold, italic, underline, strikethrough
- **256-color mode**: Extended color palette
- **True color**: RGB colors

### Implementation Options
1. **Library**: Use `ansi-to-html` package
2. **Custom**: Parse escape codes and generate HTML spans

```javascript
// Example with ansi-to-html
import Convert from 'ansi-to-html';

const convert = new Convert({
  fg: '#e6edf3',
  bg: '#0d1117',
  newline: true,
  escapeXML: true,
});

const html = convert.toHtml(output.stdout + output.stderr);
```

## Development Setup

### Configuration

#### Vite Config
```javascript
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    // No proxy - use absolute URLs to backend
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
```

#### Package.json Scripts
```json
{
  "scripts": {
    "dev": "vite --port 3000",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext js,jsx"
  }
}
```

### Backend URLs
Use absolute URLs (no proxy):
- Health: `http://localhost:8000/health`
- Execute: `http://localhost:8000/execute/python`

CORS already configured on backend for `http://localhost:3000`

### Running the App
```bash
# Terminal 1: Backend
cd backend
uvicorn main:app --reload

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

Access at: http://localhost:3000

## Build & Deployment

### Build Configuration
- **Setup**: Configured with `vite build` command
- **Output**: `dist/` directory with optimized bundles
- **Deployment**: Not deployed yet, just build setup
- **Environment**: Production build with minification and tree-shaking

### Environment Variables
```javascript
// .env.development
VITE_API_URL=http://localhost:8000

// .env.production (future)
VITE_API_URL=https://api.example.com
```

Use in code:
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

## Features & Behavior

### Execution Behavior
1. **Single Execution**: Only one execution at a time
2. **Ignore During Run**: If already running, new run requests are ignored
3. **No Queue UI**: User doesn't see "queued" state, button is just disabled
4. **Timer**: Show live elapsed time counter during execution
5. **Neutral Output**: stdout and stderr displayed equally, no red error highlighting

### Editor Features
- **Auto-complete**: Enabled for Python
- **Type Hints**: Enabled via Pyright/Pylance
- **Syntax Validation**: Full Python linting in editor
- **Line Numbers**: Always visible
- **Word Wrap**: Enabled
- **Minimap**: Disabled

### Output Features
- **Merged Output**: stdout and stderr in single panel
- **ANSI Colors**: Full support for all escape codes
- **Metrics**: Always visible at bottom of output
- **Scroll**: Auto-scroll to bottom on new output
- **Copy**: User can select and copy output text

### Split View Features
- **Initial**: 50/50 split on every page load
- **Resizable**: Free-form dragging anywhere between 20/80 and 80/20
- **Reset**: Double-click divider to return to 50/50
- **Min Sizes**: 20% minimum for both editor and output
- **No Persistence**: Does not save position to localStorage

## Error Handling

### Backend Unavailable
```jsx
{!backendAvailable && (
  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-4">
    <WarningIcon className="text-red-500" />
    <div>
      <p className="text-white font-medium">Backend Unavailable</p>
      <p className="text-text-muted text-sm">
        Make sure the backend server is running on port 8000
      </p>
    </div>
    <button onClick={checkHealth} className="ml-auto px-3 py-1 bg-red-500 rounded">
      Retry
    </button>
  </div>
)}
```

### Execution Errors
Display in output panel with same styling as success:
```
Traceback (most recent call last):
  File "/tmp/exec_abc123.py", line 2, in <module>
    raise ValueError("Test error")
ValueError: Test error

⏱️ 142ms | 💾 23.5MB | ⚡ 12.3% CPU | Exit: 1
```

### Network Errors
```
Error: Failed to connect to backend
Check that the server is running: cd backend && uvicorn main:app

⏱️ -- | 💾 -- | ⚡ -- | Exit: -1
```

## Performance Considerations

### Monaco Loading
- Use ESM build (not full bundle)
- Lazy load Monaco worker files
- Pre-load Python language support

### Output Rendering
- Use `dangerouslySetInnerHTML` for ANSI-converted HTML
- Limit output to 10KB (backend already enforces this)
- Virtual scrolling for very long outputs (optional enhancement)

### State Updates
- Debounce timer updates (every 100ms, not 1ms)
- Batch metrics updates
- Use React.memo for output panel if performance issues

## Future Enhancements (Not MVP)

### Features to Add Later
- [ ] Language selector dropdown (Ruby, JavaScript)
- [ ] Multiple tabs for different code snippets
- [ ] Output history with expandable past runs
- [ ] Code persistence per card (localStorage)
- [ ] WebSocket streaming for real-time output
- [ ] Syntax error line highlighting in editor
- [ ] Integration with SRS card review flow
- [ ] Settings panel (theme, font size, etc.)
- [ ] Vim/Emacs keybindings toggle
- [ ] Export output to file
- [ ] Share code snippet feature

## Testing Strategy

### Manual Testing
1. Load app, verify backend health check
2. Type code, verify Monaco features work
3. Press Cmd+Enter, verify execution
4. Verify output with colors, metrics
5. Resize split view, double-click reset
6. Try errors, verify display
7. Kill backend, verify unavailable state
8. Restart backend, verify reconnection

### Edge Cases
- Empty code execution
- Very long output (>10KB, should truncate)
- Code with infinite loop (should timeout at 10s)
- Rapid clicks on Run (should ignore)
- Backend crashes mid-execution
- Network loss during execution

## File Structure (Complete)

```
frontend/
├── public/
│   └── vite.svg
├── src/
│   ├── components/
│   │   ├── Editor.jsx              # Monaco wrapper
│   │   ├── OutputPanel.jsx         # Output display
│   │   ├── SplitPane.jsx           # Resizable layout
│   │   ├── RunButton.jsx           # Execute button
│   │   └── BackendStatus.jsx       # Health indicator
│   ├── hooks/
│   │   ├── useCodeExecution.js     # Execution logic
│   │   ├── useBackendHealth.js     # Health check
│   │   └── useTimer.js             # Elapsed time
│   ├── utils/
│   │   ├── ansiParser.js           # ANSI to HTML
│   │   └── api.js                  # Backend client
│   ├── styles/
│   │   └── index.css               # Tailwind + custom
│   ├── App.jsx                     # Root component
│   └── main.jsx                    # Entry point
├── index.html                      # HTML shell
├── package.json                    # Dependencies
├── vite.config.js                  # Vite config
├── tailwind.config.js              # Tailwind config
├── postcss.config.js               # PostCSS config
└── .env.development                # Environment vars
```

## Implementation Checklist

### Setup Phase
- [ ] Create Vite React app
- [ ] Install dependencies (Monaco, Tailwind, ansi-to-html)
- [ ] Configure Tailwind with design system colors
- [ ] Setup fonts (Space Grotesk, JetBrains Mono)
- [ ] Configure Vite for port 3000

### Core Components
- [ ] Editor component with Monaco ESM setup
- [ ] OutputPanel with ANSI support
- [ ] SplitPane with resize and double-click reset
- [ ] RunButton with states (ready/running)
- [ ] BackendStatus indicator

### Integration
- [ ] useCodeExecution hook with execution logic
- [ ] useBackendHealth hook with polling
- [ ] useTimer hook for elapsed time
- [ ] API utility for backend calls
- [ ] Error handling throughout

### Styling
- [ ] Port design system from existing HTML
- [ ] Custom scrollbar styles
- [ ] Output panel terminal styling
- [ ] Responsive layout (not priority for local use)

### Features
- [ ] Cmd+Enter keyboard shortcut
- [ ] Live timer during execution
- [ ] Metrics display in footer
- [ ] ANSI color rendering
- [ ] Split view reset on double-click
- [ ] Backend reconnection handling

### Polish
- [ ] Loading states
- [ ] Error messages
- [ ] Initial code comment
- [ ] Line numbers in editor
- [ ] Auto-scroll output
- [ ] Hover tooltips for metrics

## Success Criteria

### MVP Complete When:
1. ✅ App loads on port 3000
2. ✅ Monaco editor loads with Python syntax
3. ✅ Cmd+Enter executes code
4. ✅ Output displays with ANSI colors
5. ✅ Metrics show below output
6. ✅ Split view is resizable and resets
7. ✅ Backend health check works
8. ✅ Error states handled gracefully
9. ✅ Matches existing design system

### Definition of Done:
- User can write Python code in Monaco
- User can execute with keyboard shortcut
- Output renders with colors and metrics
- UI matches dark theme aesthetic
- Backend reconnection works
- No console errors
- Smooth, responsive interactions
