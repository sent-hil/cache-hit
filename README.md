# CacheHit

A spaced repetition application for learning to code. Practice coding problems synced with Mochi Cards, with isolated code execution in Docker containers.

## Requirements

### Backend
- Python 3.10+
- Docker daemon running
- uv (Python package manager)
- Mochi API key (get from https://app.mochi.cards/settings/api)

### Frontend
- Node.js 18+
- npm

## Installation

### Backend Setup

```bash
cd backend
uv sync
docker ps  # Verify Docker is running
```

### Frontend Setup

```bash
cd frontend
npm install
```

## Running the Application

### Development Mode (Hot Reload)

Run two terminals:

**Terminal 1 - Backend:**
```bash
cd backend
MOCHI_API_KEY=your_key uv run python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

- Frontend: http://localhost:3000 (with hot reload)
- Backend API: http://localhost:8000

### Production Mode (Single Server)

Build the frontend and run only the backend:

```bash
cd frontend
npm run build

cd ../backend
MOCHI_API_KEY=your_key uv run python main.py
```

Application available at http://localhost:8000 - FastAPI serves both the API and the built frontend.

## Testing

### Backend Tests

```bash
cd backend
uv run pytest tests/
uv run pytest tests/ --cov=. --cov-report=term-missing  # With coverage
```

### Frontend Tests

```bash
cd frontend
npm test              # Run tests
npm run test:ui       # Interactive UI
npm run test:coverage # With coverage
```

## Tech Stack

### Frontend
- **Preact** - Lightweight React alternative (3KB vs 40KB)
- **Vite** - Fast build tool with HMR
- **Monaco Editor** - VS Code editor component
- **KaTeX** - LaTeX rendering
- **Tailwind CSS** - Utility-first styling
- **Vitest** - Testing framework

### Backend
- **FastAPI** - Async Python web framework
- **Docker** - Isolated code execution
- **Mochi API** - Spaced repetition sync

## Configuration

### Backend Configuration

Container settings in `backend/container_manager.py`:

```python
LANGUAGE_CONFIG = {
    "python": {
        "image": "python:3.10-slim",
        "extension": ".py",
        "command": ["python", "{filepath}"]
    },
    "ruby": {
        "image": "ruby:3.2-slim",
        "extension": ".rb",
        "command": ["ruby", "{filepath}"]
    }
}
```

Resource Limits:
- CPU: 0.5 cores per container
- Memory: 256MB per container
- Execution timeout: 10 seconds
- Output limit: 10KB

### Frontend Configuration

API URL is automatically configured:
- Development: `http://localhost:8000` (cross-origin)
- Production: Relative URLs (same-origin, served by FastAPI)

## Troubleshooting

### Docker Images Not Pulling

Pull images manually:
```bash
docker pull python:3.10-slim
docker pull ruby:3.2-slim
```

### Port Already in Use

```bash
# Find and kill process on port 8000
lsof -i :8000
kill -9 <PID>
```

### Tests Failing

```bash
# Backend
cd backend && uv run pytest tests/ -v

# Frontend - reinstall dependencies
cd frontend && rm -rf node_modules && npm install && npm test
```

## Development

### Adding New Languages

Add to `LANGUAGE_CONFIG` in `container_manager.py`:
```python
"javascript": {
    "image": "node:20-slim",
    "extension": ".js",
    "command": ["node", "{filepath}"]
}
```

Restart server - new endpoint available at `/execute/javascript`.

### Adding Tests

Frontend (Vitest + Preact Testing Library):
```javascript
import { render, screen } from "@testing-library/preact";

it('should render component', () => {
  render(<Component />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

## License

MIT
