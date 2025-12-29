# Code Runner API Specification

## Overview
A FastAPI-based code execution sandbox for a spaced repetition learning app. Executes user code from Monaco editor in isolated Docker containers and returns results. Built for local personal use on developer's laptop.

## Architecture

### Container Strategy
- **One container per language**: Single long-lived container per supported language (Python, Ruby)
- **Stateless sharing**: All execution requests share the same language container
- **30-minute TTL**: Containers auto-cleanup after 30 minutes of inactivity
- **Pre-start on boot**: Containers created during FastAPI server startup
- **UUID-based execution files**: Each execution writes to `/tmp/exec_<uuid>.<ext>` to prevent collisions
- **Parallel execution safe**: UUID filenames allow concurrent requests to same container

### Execution Flow
1. Client sends code string to language-specific endpoint
2. Server generates UUID, writes code to `/tmp/exec_<uuid>.<ext>` in container using `put_archive()`
3. Execute using `exec_run()` with 10-second timeout
4. Capture stdout, stderr, exit code, and resource metrics
5. Return rich diagnostic response
6. File cleanup happens on container shutdown (not per-execution)
7. Background task checks every 5 minutes for containers idle >30min and kills them

## API Endpoints

### POST /execute/python
Execute Python code in python:3.10-slim container.

**Request Body:**
```json
{
  "code": "print('Hello, world!')"
}
```

**Success Response (200):**
```json
{
  "stdout": "Hello, world!\n",
  "stderr": "",
  "exit_code": 0,
  "execution_time_ms": 45.3,
  "container_id": "abc123def456",
  "language": "python",
  "image_name": "python:3.10-slim",
  "memory_used_mb": 23.5,
  "cpu_percent": 12.3,
  "file_path": "/tmp/exec_550e8400-e29b-41d4-a716-446655440000.py"
}
```

**Error Response (500):**
```json
{
  "detail": "Docker API error: container not responding",
  "stdout": "",
  "stderr": "",
  "exit_code": -1
}
```

### POST /execute/ruby
Execute Ruby code in ruby:3.2-slim container.

**Request Body:**
```json
{
  "code": "puts 'Hello from Ruby'"
}
```

**Response format:** Same as Python endpoint, with `language: "ruby"` and `.rb` file extension.

### GET /health
Check server and container status.

**Response (200):**
```json
{
  "status": "ok",
  "containers": {
    "python": "running",
    "ruby": "running"
  },
  "uptime_seconds": 3600
}
```

**Response when container stopped (200):**
```json
{
  "status": "degraded",
  "containers": {
    "python": "stopped",
    "ruby": "running"
  },
  "uptime_seconds": 3600
}
```

## Configuration

### Server Settings
- **Port**: 8000 (default FastAPI)
- **Host**: 0.0.0.0 (accessible from frontend)
- **CORS Origins**: `["http://localhost:3000"]`
- **Request Body Limit**: 100KB (prevents memory abuse)
- **Log Level**: DEBUG (verbose logging for development)

### Container Settings
- **CPU Limit**: 0.5 cores per container
- **Memory Limit**: 256MB per container
- **Network**: Disabled (isolated containers, no internet access)
- **Execution Timeout**: 10 seconds
- **Working Directory**: `/tmp`
- **Output Limit**: 10KB (truncate stdout/stderr if exceeded)

### Images
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

### Container Naming
Format: `code-runner-{language}-{random_suffix}`
- Example: `code-runner-python-a3f9`, `code-runner-ruby-7b2c`
- Random suffix: 4 random hex characters
- Prevents name collisions on restart

## Container Lifecycle

### Startup (Server Launch)
1. Check Docker daemon is running (fail fast if not)
2. Pull images if not present (blocking operation)
3. Create containers with resource limits and no network
4. Start background cleanup task (runs every 5 minutes)
5. Ready to accept requests

### Runtime
- Containers stay running continuously
- Track `last_used_timestamp` per container
- Update timestamp on each execution request
- Allow parallel execution (UUID files prevent collisions)

### Cleanup (After 30min Idle)
1. Background task detects container idle >30 minutes
2. Call `container.kill()` (immediate SIGKILL, no grace period)
3. Remove container with `container.remove(force=True)`
4. Container auto-recreates on next request for that language

### Shutdown (Server Stop)
1. Kill all managed containers immediately
2. Remove containers to clean up resources
3. Exit server

## Error Handling

### Classification
- **User Code Errors**: Syntax errors, runtime exceptions, timeouts
  - Return in stdout/stderr as normal (exit_code non-zero)
  - HTTP 200 status (execution completed, just with errors)

- **Docker API Errors**: Container failures, exec_run failures, connection issues
  - HTTP 500 Internal Server Error
  - Include error details in response body

### Timeout Behavior
- 10-second execution limit enforced by Docker exec_run timeout
- On timeout: kill execution, return partial output + timeout message
- Exit code: 124 (standard timeout exit code)

### Output Truncation
- If stdout or stderr exceeds 10KB, truncate with message:
  ```
  [Output truncated at 10KB limit]
  ```

## Security Considerations

### Local-Only Use
- No authentication required (personal laptop)
- No user isolation (single user)
- Trusted code source (user's own spaced repetition cards)

### Container Isolation
- **No network**: Prevents outbound connections, package installation
- **Resource limits**: CPU/memory caps prevent resource exhaustion
- **Minimal images**: Official slim images reduce attack surface
- **Read-only root**: (Optional enhancement) Mount root filesystem read-only

### Input Validation
- **No syntax validation**: Trust container to handle all code
- **Size limit**: 100KB request body limit in FastAPI
- **No content filtering**: Allow any code (local trusted use)

## Performance Characteristics

### First Request (Cold Start)
- Server startup: ~5-10 seconds (pull images, create containers)
- After startup: <100ms per request (warm containers)

### Subsequent Requests
- Container already running: ~50-200ms execution overhead
- Actual execution time depends on user code
- Parallel requests supported via UUID isolation

### Resource Usage
- Idle server: ~50MB RAM (FastAPI process)
- Per container: ~256MB RAM limit (actual usage lower when idle)
- Two containers: ~512MB total container memory allocated
- Disk: ~200MB per image, plus temp files in /tmp

## Development Notes

### Dependencies
```toml
[project]
dependencies = [
    "fastapi",
    "uvicorn[standard]",
    "docker",
    "python-multipart"
]
```

### Running Locally
```bash
# Install dependencies
uv sync

# Start server
uvicorn main:app --reload --port 8000

# Access from frontend at http://localhost:3000
```

### Docker Requirements
- Docker daemon must be running
- User must have permissions to create/manage containers
- Images will auto-pull on first startup (requires internet)

### Future Extensibility

#### LSP Integration (Planned)
- Architecture supports future Language Server Protocol integration
- Would enable autocomplete, hover docs, go-to-definition
- Separate endpoint `/lsp/<language>` for language server features
- Not implemented in MVP

#### Additional Languages
To add new language:
1. Add entry to `LANGUAGE_CONFIG` dict
2. Specify Docker image, file extension, run command
3. Container auto-created on server startup
4. Endpoint auto-registered at `/execute/<language>`

Example for JavaScript:
```python
"javascript": {
    "image": "node:20-slim",
    "extension": ".js",
    "command": ["node", "{filepath}"]
}
```

## Implementation Checklist

### Core Features
- [ ] FastAPI app with CORS middleware (localhost:3000)
- [ ] Docker SDK integration
- [ ] Container manager class (create, execute, cleanup)
- [ ] Background cleanup task (asyncio, every 5min)
- [ ] Language-specific execution endpoints
- [ ] Health check endpoint
- [ ] Request body size limit (100KB)
- [ ] Output size limit (10KB truncation)

### Container Management
- [ ] Pre-start containers on server boot
- [ ] Fail fast if Docker unavailable
- [ ] UUID-based file naming
- [ ] put_archive() for file creation
- [ ] exec_run() with 10s timeout
- [ ] Track last_used_timestamp per container
- [ ] 30-minute idle cleanup logic
- [ ] Immediate kill (SIGKILL) on cleanup

### Response Metrics
- [ ] Capture stdout/stderr/exit_code
- [ ] Measure execution time (milliseconds)
- [ ] Extract container_id, image_name
- [ ] Calculate memory_used_mb (from Docker stats)
- [ ] Calculate cpu_percent (from Docker stats)
- [ ] Return file_path used for execution

### Logging
- [ ] DEBUG level logging throughout
- [ ] Log container lifecycle events
- [ ] Log execution requests with timing
- [ ] Log cleanup task runs
- [ ] Log Docker API errors with full context

### Error Handling
- [ ] 200 for successful execution (even with code errors)
- [ ] 500 for Docker API failures
- [ ] Graceful timeout handling
- [ ] Output truncation with clear message
- [ ] Container restart on failure

## Testing Strategy

### Manual Testing
1. Start server, verify containers created
2. Execute simple Python/Ruby code, verify output
3. Execute code with stderr output (errors)
4. Execute long-running code (timeout test)
5. Execute code generating huge output (truncation test)
6. Wait 30+ minutes, verify container cleanup
7. Send concurrent requests, verify parallel execution
8. Check /health endpoint before/after cleanup

### Edge Cases
- Empty code string (should execute successfully, no output)
- Code with infinite loop (should timeout at 10s)
- Code trying network access (should fail, no network)
- Code allocating >256MB RAM (should OOM kill)
- Rapid concurrent requests (UUID files prevent collision)
- Container killed manually via docker CLI (should auto-recreate)

## Example Usage

### Frontend Integration (TypeScript/React)
```typescript
async function executeCode(code: string, language: 'python' | 'ruby') {
  const response = await fetch(`http://localhost:8000/execute/${language}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });

  const result = await response.json();

  // Display stdout/stderr in Monaco output panel
  console.log('Output:', result.stdout);
  console.log('Errors:', result.stderr);
  console.log('Executed in:', result.execution_time_ms, 'ms');

  return result;
}
```

### Example Python Code Execution
```python
# User types this in Monaco editor:
numbers = [1, 2, 3, 4, 5]
total = sum(numbers)
print(f"Sum: {total}")

# Backend response:
{
  "stdout": "Sum: 15\n",
  "stderr": "",
  "exit_code": 0,
  "execution_time_ms": 42.1,
  "container_id": "d4f2a1b8c3e7",
  "language": "python",
  "image_name": "python:3.10-slim",
  "memory_used_mb": 18.3,
  "cpu_percent": 8.2,
  "file_path": "/tmp/exec_550e8400-e29b-41d4-a716-446655440000.py"
}
```

### Example Ruby Code with Error
```ruby
# User types this in Monaco editor:
puts "Hello"
raise "Something went wrong"
puts "This won't print"

# Backend response:
{
  "stdout": "Hello\n",
  "stderr": "Traceback (most recent call last):\n...\nRuntimeError: Something went wrong",
  "exit_code": 1,
  "execution_time_ms": 38.7,
  "container_id": "e5a3b2c9d4f1",
  "language": "ruby",
  "image_name": "ruby:3.2-slim",
  "memory_used_mb": 21.2,
  "cpu_percent": 7.1,
  "file_path": "/tmp/exec_7c3e9b1a-f5d4-4e2a-8a1b-9c8e7d6f5a4b.rb"
}
```

## Architecture Decisions Record

### Why one container per language (not per-user/per-session)?
- **Local single-user**: Only developer uses this, no need for user isolation
- **Simplicity**: Fewer containers to manage, simpler lifecycle
- **Performance**: Containers stay warm, fast execution (<100ms overhead)
- **Cost**: Minimal resource usage on laptop (2 containers total)

### Why UUID files instead of locking?
- **Parallel execution**: Multiple requests can run simultaneously
- **No blocking**: Frontend doesn't wait for other executions
- **Simple cleanup**: Files removed on container shutdown, not per-execution
- **Collision-free**: UUIDv4 provides sufficient uniqueness

### Why no validation?
- **Container isolation**: Let runtime handle all errors safely
- **Educational value**: Students see real error messages
- **Simplicity**: No language-specific parsing/validation logic
- **Trust model**: Local use, trusted code source

### Why immediate kill vs graceful stop?
- **Deterministic**: SIGKILL always works immediately
- **No state**: Containers have no important state to save
- **Fast cleanup**: Don't wait for graceful shutdown
- **Simple**: Single API call, no timeout handling

### Why pre-start containers?
- **Fast first request**: No cold start delay
- **Fail fast**: Know about Docker issues at startup
- **Simple**: No concurrent creation handling needed
- **Predictable**: Health check always shows container status
