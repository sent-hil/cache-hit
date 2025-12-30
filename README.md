# CacheHit

A spaced repetition code review application with FastAPI-based code execution sandbox. Execute Python and Ruby code in isolated Docker containers to practice and review coding concepts.

## Features

- Execute Python and Ruby code in isolated Docker containers
- One long-lived container per language for fast execution
- Automatic cleanup of idle containers (30-minute timeout)
- Rich diagnostic information (execution time, memory usage, CPU percentage)
- CORS enabled for frontend integration
- Concurrent execution support with UUID-based file isolation
- Comprehensive logging for debugging

## Requirements

- Python 3.10+
- Docker daemon running
- uv (Python package manager)

## Installation

1. Clone the repository
2. Install dependencies:
```bash
uv sync
```

3. Make sure Docker is running:
```bash
docker ps
```

## Usage

### Start the Server

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

Or using the Python script:
```bash
python main.py
```

The server will:
- Check Docker availability
- Pull required images (python:3.10-slim, ruby:3.2-slim) if needed
- Create and start containers for both languages
- Start a background cleanup task
- Listen on http://0.0.0.0:8000

### API Endpoints

#### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "ok",
  "containers": {
    "python": "running",
    "ruby": "running"
  },
  "uptime_seconds": 123.45
}
```

#### Execute Python Code

```bash
POST /execute/python
Content-Type: application/json

{
  "code": "print('Hello, World!')"
}
```

Response:
```json
{
  "stdout": "Hello, World!\n",
  "stderr": "",
  "exit_code": 0,
  "execution_time_ms": 45.23,
  "container_id": "abc123",
  "language": "python",
  "image_name": "python:3.10-slim",
  "memory_used_mb": 12.34,
  "cpu_percent": 5.67,
  "file_path": "/tmp/exec_<uuid>.py"
}
```

#### Execute Ruby Code

```bash
POST /execute/ruby
Content-Type: application/json

{
  "code": "puts 'Hello, World!'"
}
```

Response format is the same as Python execution.

### Testing

Run the test script:
```bash
python test_api.py
```

Or use curl:
```bash
# Health check
curl http://localhost:8000/health

# Execute Python
curl -X POST http://localhost:8000/execute/python \
  -H "Content-Type: application/json" \
  -d '{"code": "print(\"Hello!\")"}'

# Execute Ruby
curl -X POST http://localhost:8000/execute/ruby \
  -H "Content-Type: application/json" \
  -d '{"code": "puts \"Hello!\""}'
```

## Configuration

All configuration is in `main.py`:

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

# Resource Limits
- CPU: 0.5 cores per container
- Memory: 256MB per container
- Execution timeout: 10 seconds (Note: not yet enforced)
- Output limit: 10KB
- Request size: 100KB max

# Cleanup
- Container idle timeout: 30 minutes
- Cleanup check interval: 5 minutes
```

## Architecture

### Container Lifecycle

1. **Startup**: Both Python and Ruby containers are pre-started when the server launches
2. **Execution**: Code is written to `/tmp/exec_<uuid>.<ext>` and executed via `exec_run()`
3. **Tracking**: Each execution updates the container's `last_used` timestamp
4. **Cleanup**: Background task checks every 5 minutes for containers idle >30 minutes
5. **Shutdown**: All containers are killed and removed when the server stops

### Security

- **Network isolation**: Containers run with `network_mode="none"`
- **Resource limits**: CPU and memory caps prevent resource exhaustion
- **No validation**: Code runs as-is (designed for trusted local use)
- **Isolated execution**: UUID filenames prevent file collisions

### Concurrency

Multiple requests can execute simultaneously in the same container because each execution:
- Uses a unique UUID-based filename
- Runs in parallel (no locks)
- Has independent stdout/stderr capture

## Frontend Integration

Example TypeScript/React code:

```typescript
async function executeCode(code: string, language: 'python' | 'ruby') {
  const response = await fetch(`http://localhost:8000/execute/${language}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });

  const result = await response.json();

  if (response.ok) {
    console.log('Output:', result.stdout);
    console.log('Errors:', result.stderr);
    console.log('Time:', result.execution_time_ms, 'ms');
  }

  return result;
}
```

## Project Structure

```
cachehit/
├── backend/
│   ├── main.py           # FastAPI application and container manager
│   ├── test_api.py       # Test script for API endpoints
│   ├── pyproject.toml    # Project dependencies
│   └── SPEC.md          # Detailed specification
├── frontend/
│   ├── src/              # React application
│   ├── public/           # Static assets
│   └── package.json      # Frontend dependencies
└── README.md            # This file
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

Change the port in the uvicorn command:
```bash
uvicorn main:app --port 8001
```

Don't forget to update CORS settings in main.py if your frontend is on a different port.

## Development

### Adding New Languages

1. Add entry to `LANGUAGE_CONFIG`:
```python
"javascript": {
    "image": "node:20-slim",
    "extension": ".js",
    "command": ["node", "{filepath}"]
}
```

2. Restart server - containers auto-created
3. New endpoint automatically available at `/execute/javascript`

### Logging

All logging is at DEBUG level. Check server output for:
- Container lifecycle events
- Execution timing
- Docker API calls
- Cleanup operations

## Performance

- **Cold start**: ~5-10 seconds (pulling images + creating containers)
- **Warm execution**: ~50-200ms overhead + code execution time
- **Concurrent requests**: Supported, no blocking
- **Memory usage**: ~512MB for both containers + FastAPI process

## License

MIT

## Contributing

This is a personal learning project. Feel free to fork and adapt for your needs.
