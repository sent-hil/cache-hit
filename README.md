# CacheHit

A spaced repetition application for learning to code. Practice coding problems with FSRS algorithm, and isolated code execution in Docker containers.

## Requirements

### Backend
- Python 3.10+
- Docker daemon running
- uv (Python package manager)

### Frontend
- Node.js 18+
- npm or yarn

## Installation

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
uv sync
```

3. Make sure Docker is running:
```bash
docker ps
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

## Usage

### Start the Backend Server

From the `backend` directory:

```bash
cd backend
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

Or using Python directly:
```bash
cd backend
python main.py
```

The server will:
- Check Docker availability
- Pull required images (python:3.10-slim, ruby:3.2-slim) if needed
- Load flashcard decks from the `data/` directory
- Create and start containers for both languages
- Start a background cleanup task
- Listen on http://0.0.0.0:8000

### Start the Frontend

From the `frontend` directory:

```bash
cd frontend
npm run dev
```

The app will be available at http://localhost:3000

## Testing

### Backend Tests

From the `backend` directory:

Run all tests:
```bash
uv run pytest tests/
```

Run tests with coverage:
```bash
uv run pytest tests/ --cov=. --cov-report=term-missing
```

### Frontend Tests

From the `frontend` directory:

Run all tests:
```bash
npm run test
```

Run tests in watch mode:
```bash
npm run test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Configuration

### Backend Configuration

Container configuration is in `backend/container_manager.py`:

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
- Request size: 100KB max

Cleanup:
- Container idle timeout: 30 minutes
- Cleanup check interval: 5 minutes

### Frontend Configuration

API endpoint is in `frontend/src/utils/api.js`:

```javascript
const API_URL = 'http://localhost:8000';
```

## Troubleshooting

### Docker Images Not Pulling

If you see credential store errors, pull images manually:
```bash
docker pull python:3.10-slim
docker pull ruby:3.2-slim
```

The server will detect existing images and skip pulling.

### Containers Not Starting

Check Docker daemon is running:
```bash
docker ps
```

Check server logs for detailed error messages (DEBUG level enabled).

### Port Already in Use

Backend:
```bash
uvicorn main:app --port 8001
```

Frontend (edit `vite.config.js`):
```javascript
server: {
  port: 3001,
  open: true,
}
```

### Tests Failing

Backend - ensure virtual environment is activated:
```bash
cd backend
uv run pytest tests/ -v
```

Frontend - clear node_modules and reinstall:
```bash
cd frontend
rm -rf node_modules
npm install
npm run test
```

## Development

### Adding New Languages

1. Add entry to `LANGUAGE_CONFIG` in `container_manager.py`:
```python
"javascript": {
    "image": "node:20-slim",
    "extension": ".js",
    "command": ["node", "{filepath}"]
}
```

2. Restart server - containers auto-created
3. New endpoint automatically available at `/execute/javascript`

### Adding Tests

Backend (pytest):
```python
def test_new_feature(self, client):
    response = client.get("/api/endpoint")
    assert response.status_code == 200
```

Frontend (vitest + React Testing Library):
```javascript
it('should render component', () => {
  render(<Component />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

### Code Style

Backend:
- Follow PEP 8
- Use type hints where appropriate
- Add docstrings for public functions
- No inline comments in production code

Frontend:
- Use functional components with hooks
- Prefer const over let
- No JSX comments in production code
- Use Tailwind CSS for styling

## License

MIT
