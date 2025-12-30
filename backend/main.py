import io
import logging
import secrets
import tarfile
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Dict, Optional

import docker
from docker.models.containers import Container
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Language configuration
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

# Constants
MAX_OUTPUT_SIZE = 10 * 1024  # 10KB
EXECUTION_TIMEOUT = 10  # seconds


class ExecuteRequest(BaseModel):
    code: str = Field(..., max_length=100 * 1024)  # 100KB limit


class ExecuteResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    execution_time_ms: float
    container_id: str
    language: str
    image_name: str
    memory_used_mb: float
    cpu_percent: float
    file_path: str


class HealthResponse(BaseModel):
    status: str
    containers: Dict[str, str]
    uptime_seconds: float


class ContainerManager:
    def __init__(self):
        self.client: docker.DockerClient = docker.from_env()
        self.containers: Dict[str, Container] = {}
        self.last_used: Dict[str, datetime] = {}
        self.start_time = time.time()
        logger.info("ContainerManager initialized")

    def _generate_container_name(self, language: str) -> str:
        """Generate unique container name with random suffix."""
        suffix = secrets.token_hex(2)
        return f"code-runner-{language}-{suffix}"

    def _create_tarfile(self, filename: str, content: str) -> bytes:
        """Create a tar archive containing the code file."""
        tar_stream = io.BytesIO()
        tar = tarfile.TarFile(fileobj=tar_stream, mode='w')

        # Create file content
        file_data = content.encode('utf-8')
        tarinfo = tarfile.TarInfo(name=filename)
        tarinfo.size = len(file_data)
        tarinfo.mtime = time.time()

        tar.addfile(tarinfo, io.BytesIO(file_data))
        tar.close()

        tar_stream.seek(0)
        return tar_stream.read()

    def _truncate_output(self, output: str) -> str:
        """Truncate output if it exceeds size limit."""
        if len(output) > MAX_OUTPUT_SIZE:
            return output[:MAX_OUTPUT_SIZE] + "\n[Output truncated at 10KB limit]"
        return output

    def check_docker_available(self) -> bool:
        """Check if Docker daemon is available."""
        try:
            self.client.ping()
            logger.info("Docker daemon is available")
            return True
        except Exception as e:
            logger.error(f"Docker daemon not available: {e}")
            return False

    def pull_images(self):
        """Pull all required Docker images."""
        for language, config in LANGUAGE_CONFIG.items():
            image = config["image"]
            logger.info(f"Checking image {image} for {language}")
            try:
                # Check if image already exists
                self.client.images.get(image)
                logger.info(f"Image {image} already exists")
            except docker.errors.ImageNotFound:
                # Image doesn't exist, try to pull it
                logger.info(f"Pulling image {image}")
                try:
                    self.client.images.pull(image)
                    logger.info(f"Successfully pulled {image}")
                except Exception as e:
                    # If pull fails due to credentials issue, check if image exists now
                    # (might have been pulled by another process)
                    try:
                        self.client.images.get(image)
                        logger.warning(f"Pull failed but image {image} exists, continuing")
                    except docker.errors.ImageNotFound:
                        logger.error(f"Failed to pull {image} and image not found: {e}")
                        raise
            except Exception as e:
                logger.error(f"Error checking image {image}: {e}")
                raise

    def create_container(self, language: str) -> Container:
        """Create a new container for the specified language."""
        config = LANGUAGE_CONFIG[language]
        container_name = self._generate_container_name(language)

        logger.info(f"Creating container {container_name} with image {config['image']}")

        try:
            container = self.client.containers.create(
                image=config["image"],
                name=container_name,
                detach=True,
                tty=True,
                stdin_open=True,
                working_dir="/tmp",
                network_mode="none",  # Disable network
                mem_limit="256m",
                cpu_quota=50000,  # 0.5 CPU (50% of 100000)
                cpu_period=100000,
                command=["/bin/sh"]  # Keep container alive
            )
            container.start()

            self.containers[language] = container
            self.last_used[language] = datetime.now()

            logger.info(f"Container {container_name} created and started (ID: {container.short_id})")
            return container

        except Exception as e:
            logger.error(f"Failed to create container for {language}: {e}")
            raise

    def get_container(self, language: str) -> Container:
        """Get or create container for the specified language."""
        if language not in self.containers:
            return self.create_container(language)

        container = self.containers[language]

        # Check if container is still running
        try:
            container.reload()
            if container.status != "running":
                logger.warning(f"Container for {language} is not running, recreating")
                self.cleanup_container(language)
                return self.create_container(language)
        except Exception as e:
            logger.warning(f"Error checking container status for {language}: {e}, recreating")
            self.cleanup_container(language)
            return self.create_container(language)

        return container

    def execute_code(self, language: str, code: str) -> ExecuteResponse:
        """Execute code in the container for the specified language."""
        start_time = time.time()

        logger.debug(f"Executing {language} code (length: {len(code)} bytes)")

        # Get container
        container = self.get_container(language)
        config = LANGUAGE_CONFIG[language]

        # Update last used timestamp
        self.last_used[language] = datetime.now()

        # Generate unique filename
        execution_id = str(uuid.uuid4())
        filename = f"exec_{execution_id}{config['extension']}"
        filepath = f"/tmp/{filename}"

        logger.debug(f"Writing code to {filepath} in container {container.short_id}")

        try:
            # Write code to container using put_archive
            tar_data = self._create_tarfile(filename, code)
            container.put_archive("/tmp", tar_data)

            # Prepare command
            command = [cmd.format(filepath=filepath) if '{filepath}' in cmd else cmd
                      for cmd in config["command"]]

            logger.debug(f"Executing command: {' '.join(command)}")

            # Execute code
            # Note: Using demux=False to get combined stdout+stderr to avoid race conditions
            exec_result = container.exec_run(
                command,
                demux=False,  # Get combined output to avoid intermittent empty stdout
                workdir="/tmp",
                environment={},
                privileged=False,
                user="",
                stream=False,
                stdin=False,
            )

            # Parse output
            exit_code = exec_result.exit_code

            # With demux=False, output is bytes (not tuple)
            output_bytes = exec_result.output
            combined_output = output_bytes.decode('utf-8') if output_bytes else ""

            logger.debug(f"Captured combined output length: {len(combined_output)}")

            # For now, treat all output as stdout since Python prints go to stdout
            # stderr would only have actual errors which also get captured
            stdout = combined_output
            stderr = ""

            # Truncate if needed
            stdout = self._truncate_output(stdout)
            stderr = self._truncate_output(stderr)

            # Calculate execution time
            execution_time_ms = (time.time() - start_time) * 1000

            # Get container stats for metrics
            stats = container.stats(stream=False)
            memory_stats = stats.get('memory_stats', {})
            cpu_stats = stats.get('cpu_stats', {})
            precpu_stats = stats.get('precpu_stats', {})

            # Calculate memory usage in MB
            memory_used_mb = memory_stats.get('usage', 0) / (1024 * 1024)

            # Calculate CPU percentage
            cpu_delta = cpu_stats.get('cpu_usage', {}).get('total_usage', 0) - \
                       precpu_stats.get('cpu_usage', {}).get('total_usage', 0)
            system_delta = cpu_stats.get('system_cpu_usage', 0) - \
                          precpu_stats.get('system_cpu_usage', 1)

            cpu_percent = 0.0
            if system_delta > 0 and cpu_delta > 0:
                num_cpus = cpu_stats.get('online_cpus', 1)
                cpu_percent = (cpu_delta / system_delta) * num_cpus * 100.0

            logger.info(
                f"Execution completed: {language}, exit_code={exit_code}, "
                f"time={execution_time_ms:.2f}ms, memory={memory_used_mb:.2f}MB"
            )

            return ExecuteResponse(
                stdout=stdout,
                stderr=stderr,
                exit_code=exit_code,
                execution_time_ms=round(execution_time_ms, 2),
                container_id=container.short_id,
                language=language,
                image_name=config["image"],
                memory_used_mb=round(memory_used_mb, 2),
                cpu_percent=round(cpu_percent, 2),
                file_path=filepath
            )

        except Exception as e:
            logger.error(f"Error executing code in {language} container: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Docker API error: {str(e)}"
            )

    def cleanup_container(self, language: str):
        """Stop and remove container for the specified language."""
        if language not in self.containers:
            return

        container = self.containers[language]
        container_id = container.short_id

        logger.info(f"Cleaning up container for {language} (ID: {container_id})")

        try:
            container.kill()
            logger.debug(f"Container {container_id} killed")
        except Exception as e:
            logger.warning(f"Error killing container {container_id}: {e}")

        try:
            container.remove(force=True)
            logger.debug(f"Container {container_id} removed")
        except Exception as e:
            logger.warning(f"Error removing container {container_id}: {e}")

        del self.containers[language]
        if language in self.last_used:
            del self.last_used[language]

        logger.info(f"Container for {language} cleaned up successfully")

    def cleanup_all(self):
        """Clean up all containers."""
        logger.info("Cleaning up all containers")
        languages = list(self.containers.keys())
        for language in languages:
            self.cleanup_container(language)
        logger.info("All containers cleaned up")

    def get_container_status(self, language: str) -> str:
        """Get the status of a container."""
        if language not in self.containers:
            return "stopped"

        try:
            container = self.containers[language]
            container.reload()
            return container.status
        except Exception:
            return "error"

    def get_uptime(self) -> float:
        """Get server uptime in seconds."""
        return time.time() - self.start_time


# Global container manager
container_manager: Optional[ContainerManager] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown."""
    global container_manager

    logger.info("Starting up FastAPI application")

    # Initialize container manager
    container_manager = ContainerManager()

    # Check Docker availability
    if not container_manager.check_docker_available():
        logger.error("Docker daemon is not available. Exiting.")
        raise RuntimeError("Docker daemon is not available")

    # Pull images
    logger.info("Pulling Docker images")
    container_manager.pull_images()

    # Pre-start containers
    logger.info("Pre-starting containers for all languages")
    for language in LANGUAGE_CONFIG.keys():
        container_manager.create_container(language)

    logger.info("FastAPI application startup complete")

    yield

    # Shutdown
    logger.info("Shutting down FastAPI application")
    container_manager.cleanup_all()
    logger.info("FastAPI application shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="Code Runner API",
    description="Execute code in isolated Docker containers",
    version="0.1.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("FastAPI app created with CORS middleware")


@app.post("/execute/python", response_model=ExecuteResponse)
async def execute_python(request: ExecuteRequest):
    """Execute Python code."""
    logger.info("Received Python execution request")
    return container_manager.execute_code("python", request.code)


@app.post("/execute/ruby", response_model=ExecuteResponse)
async def execute_ruby(request: ExecuteRequest):
    """Execute Ruby code."""
    logger.info("Received Ruby execution request")
    return container_manager.execute_code("ruby", request.code)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    logger.debug("Health check requested")

    container_statuses = {}
    for language in LANGUAGE_CONFIG.keys():
        container_statuses[language] = container_manager.get_container_status(language)

    # Determine overall status
    all_running = all(status == "running" for status in container_statuses.values())
    status = "ok" if all_running else "degraded"

    uptime = container_manager.get_uptime()

    logger.debug(f"Health check: status={status}, containers={container_statuses}")

    return HealthResponse(
        status=status,
        containers=container_statuses,
        uptime_seconds=round(uptime, 2)
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug")
