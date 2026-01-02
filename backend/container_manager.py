import io
import logging
import secrets
import tarfile
import time
import uuid
from datetime import datetime
from typing import Dict

import docker
from docker.errors import ImageNotFound
from docker.models.containers import Container
from fastapi import HTTPException

logger = logging.getLogger("main")

MAX_OUTPUT_SIZE = 10 * 1024

LANGUAGE_CONFIG = {
    "python": {
        "image": "python-numpy:3.10-alpine",
        "extension": ".py",
        "command": ["python3", "{filepath}"],
    },
    "ruby": {
        "image": "ruby:3.2-alpine",
        "extension": ".rb",
        "command": ["ruby", "{filepath}"],
    },
}


class ExecuteResponse:
    def __init__(
        self,
        stdout: str,
        stderr: str,
        exit_code: int,
        execution_time_ms: float,
        container_id: str,
        language: str,
        image_name: str,
        memory_used_mb: float,
        cpu_percent: float,
        file_path: str,
    ):
        self.stdout = stdout
        self.stderr = stderr
        self.exit_code = exit_code
        self.execution_time_ms = execution_time_ms
        self.container_id = container_id
        self.language = language
        self.image_name = image_name
        self.memory_used_mb = memory_used_mb
        self.cpu_percent = cpu_percent
        self.file_path = file_path


class ContainerManager:
    def __init__(self):
        self.client: docker.DockerClient = docker.from_env()
        self.containers: Dict[str, Container] = {}
        self.last_used: Dict[str, datetime] = {}
        self.start_time = time.time()
        logger.info("ContainerManager initialized")

    def _generate_container_name(self, language: str) -> str:
        suffix = secrets.token_hex(2)
        return f"code-runner-{language}-{suffix}"

    def _create_tarfile(self, filename: str, content: str) -> bytes:
        tar_stream = io.BytesIO()
        tar = tarfile.TarFile(fileobj=tar_stream, mode="w")

        file_data = content.encode("utf-8")
        tarinfo = tarfile.TarInfo(name=filename)
        tarinfo.size = len(file_data)
        tarinfo.mtime = time.time()

        tar.addfile(tarinfo, io.BytesIO(file_data))
        tar.close()

        tar_stream.seek(0)
        return tar_stream.read()

    def _truncate_output(self, output: str) -> str:
        if len(output) > MAX_OUTPUT_SIZE:
            return output[:MAX_OUTPUT_SIZE] + "\n[Output truncated at 10KB limit]"
        return output

    def check_docker_available(self) -> bool:
        try:
            self.client.ping()
            logger.info("Docker daemon is available")
            return True
        except Exception as e:
            logger.error(f"Docker daemon not available: {e}")
            return False

    def pull_images(self):
        for language, config in LANGUAGE_CONFIG.items():
            image = config["image"]
            logger.info(f"Checking image {image} for {language}")
            try:
                self.client.images.get(image)
                logger.info(f"Image {image} already exists")
            except ImageNotFound:
                logger.info(f"Pulling image {image}")
                try:
                    self.client.images.pull(image)
                    logger.info(f"Successfully pulled {image}")
                except Exception as e:
                    logger.error(f"Failed to pull {image} and image not found: {e}")
                    raise
            except Exception as e:
                logger.error(f"Error checking image {image}: {e}")
                raise

    def create_container(self, language: str) -> Container:
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
                network_mode="none",
                mem_limit="256m",
                cpu_quota=50000,
                cpu_period=100000,
                command=["/bin/sh"],
            )
            container.start()

            self.containers[language] = container
            self.last_used[language] = datetime.now()

            logger.info(
                f"Container {container_name} created and started (ID: {container.short_id})"
            )
            return container

        except Exception as e:
            logger.error(f"Failed to create container for {language}: {e}")
            raise

    def get_container(self, language: str) -> Container:
        if language not in self.containers:
            return self.create_container(language)

        container = self.containers[language]

        try:
            container.reload()
            if container.status != "running":
                logger.warning(f"Container for {language} is not running, recreating")
                self.cleanup_container(language)
                return self.create_container(language)
        except Exception as e:
            logger.warning(
                f"Error checking container status for {language}: {e}, recreating"
            )
            self.cleanup_container(language)
            return self.create_container(language)

        return container

    def execute_code(self, language: str, code: str) -> ExecuteResponse:
        start_time = time.time()

        logger.debug(f"Executing {language} code (length: {len(code)} bytes)")

        container = self.get_container(language)
        config = LANGUAGE_CONFIG[language]

        self.last_used[language] = datetime.now()

        execution_id = str(uuid.uuid4())
        filename = f"exec_{execution_id}{config['extension']}"
        filepath = f"/tmp/{filename}"

        logger.debug(f"Writing code to {filepath} in container {container.short_id}")

        try:
            tar_data = self._create_tarfile(filename, code)
            container.put_archive("/tmp", tar_data)

            command = [
                cmd.format(filepath=filepath) if "{filepath}" in cmd else cmd
                for cmd in config["command"]
            ]

            logger.debug(f"Executing command: {' '.join(command)}")

            exec_result = container.exec_run(
                command,
                demux=False,
                workdir="/tmp",
                environment={},
                privileged=False,
                user="",
                stream=False,
                stdin=False,
            )

            exit_code = exec_result.exit_code

            output_bytes = exec_result.output
            combined_output = output_bytes.decode("utf-8") if output_bytes else ""

            logger.debug(f"Captured combined output length: {len(combined_output)}")

            stdout = combined_output
            stderr = ""

            stdout = self._truncate_output(stdout)
            stderr = self._truncate_output(stderr)

            execution_time_ms = (time.time() - start_time) * 1000

            stats = container.stats(stream=False)
            memory_stats = stats.get("memory_stats", {})
            cpu_stats = stats.get("cpu_stats", {})
            precpu_stats = stats.get("precpu_stats", {})

            memory_used_mb = memory_stats.get("usage", 0) / (1024 * 1024)

            cpu_delta = cpu_stats.get("cpu_usage", {}).get(
                "total_usage", 0
            ) - precpu_stats.get("cpu_usage", {}).get("total_usage", 0)
            system_delta = cpu_stats.get("system_cpu_usage", 0) - precpu_stats.get(
                "system_cpu_usage", 1
            )

            cpu_percent = 0.0
            if system_delta > 0 and cpu_delta > 0:
                num_cpus = cpu_stats.get("online_cpus", 1)
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
                image_name=config["image"],  # type: ignore
                memory_used_mb=round(memory_used_mb, 2),
                cpu_percent=round(cpu_percent, 2),
                file_path=filepath,
            )

        except Exception as e:
            logger.error(
                f"Error executing code in {language} container: {e}", exc_info=True
            )
            raise HTTPException(status_code=500, detail=f"Docker API error: {str(e)}")

    def cleanup_container(self, language: str):
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
        logger.info("Cleaning up all containers")
        languages = list(self.containers.keys())
        for language in languages:
            self.cleanup_container(language)
        logger.info("All containers cleaned up")

    def get_container_status(self, language: str) -> str:
        if language not in self.containers:
            return "stopped"

        try:
            container = self.containers[language]
            container.reload()
            return container.status
        except Exception:
            return "error"

    def get_uptime(self) -> float:
        return time.time() - self.start_time
