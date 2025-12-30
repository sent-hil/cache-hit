import logging
from typing import Dict
from functools import lru_cache
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from container_manager import ContainerManager, LANGUAGE_CONFIG

logger = logging.getLogger(__name__)

router = APIRouter()


class ExecuteRequest(BaseModel):
    code: str = Field(..., max_length=100 * 1024)


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


@lru_cache
def get_container_manager() -> ContainerManager:
    return ContainerManager()


@router.post("/execute/python", response_model=ExecuteResponse)
async def execute_python(
    request: ExecuteRequest,
    manager: ContainerManager = Depends(get_container_manager)
):
    logger.info("Received Python execution request")
    return manager.execute_code("python", request.code)


@router.post("/execute/ruby", response_model=ExecuteResponse)
async def execute_ruby(
    request: ExecuteRequest,
    manager: ContainerManager = Depends(get_container_manager)
):
    logger.info("Received Ruby execution request")
    return manager.execute_code("ruby", request.code)


@router.get("/health", response_model=HealthResponse)
async def health_check(manager: ContainerManager = Depends(get_container_manager)):
    logger.debug("Health check requested")

    container_statuses = {}
    for language in LANGUAGE_CONFIG.keys():
        container_statuses[language] = manager.get_container_status(language)

    all_running = all(status == "running" for status in container_statuses.values())
    status = "ok" if all_running else "degraded"

    uptime = manager.get_uptime()

    logger.debug(f"Health check: status={status}, containers={container_statuses}")

    return HealthResponse(
        status=status, containers=container_statuses, uptime_seconds=round(uptime, 2)
    )
