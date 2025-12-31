import time

import pytest

from container_manager import ContainerManager


@pytest.fixture
def manager():
    cm = ContainerManager()
    yield cm
    cm.cleanup_all()


class TestCheckDockerAvailable:
    def test_docker_daemon_is_available(self, manager):
        result = manager.check_docker_available()

        assert result is True


class TestPullImages:
    def test_pull_python_image(self, manager):
        manager.pull_images()

        image = manager.client.images.get("python:3.10-alpine")
        assert image is not None

    def test_pull_ruby_image(self, manager):
        manager.pull_images()

        image = manager.client.images.get("ruby:3.2-alpine")
        assert image is not None


class TestCreateContainer:
    def test_create_python_container(self, manager):
        container = manager.create_container("python")

        assert container is not None
        container.reload()
        assert container.status == "running"
        assert "python" in manager.containers

    def test_create_ruby_container(self, manager):
        container = manager.create_container("ruby")

        assert container is not None
        container.reload()
        assert container.status == "running"
        assert "ruby" in manager.containers

    def test_container_has_unique_name(self, manager):
        container1 = manager.create_container("python")
        manager.cleanup_container("python")
        container2 = manager.create_container("python")

        assert container1.name != container2.name


class TestGetContainer:
    def test_get_existing_container(self, manager):
        container1 = manager.create_container("python")
        container2 = manager.get_container("python")

        assert container1.id == container2.id

    def test_get_creates_new_container_if_missing(self, manager):
        container = manager.get_container("python")

        assert container is not None
        container.reload()
        assert container.status == "running"
        assert "python" in manager.containers

    def test_get_recreates_stopped_container(self, manager):
        container1 = manager.create_container("python")
        container1.stop()

        container2 = manager.get_container("python")

        container2.reload()
        assert container2.status == "running"
        assert container1.id != container2.id


class TestExecuteCode:
    def test_execute_simple_python_code(self, manager):
        result = manager.execute_code("python", "print('hello world')")

        assert result.stdout == "hello world\n"
        assert result.exit_code == 0

    def test_execute_simple_ruby_code(self, manager):
        result = manager.execute_code("ruby", "puts 'hello world'")

        assert result.stdout == "hello world\n"
        assert result.exit_code == 0

    def test_execution_returns_stdout(self, manager):
        result = manager.execute_code("python", "print('line1')\nprint('line2')")

        assert "line1\n" in result.stdout
        assert "line2\n" in result.stdout

    def test_execution_returns_exit_code(self, manager):
        result = manager.execute_code("python", "import sys\nsys.exit(42)")

        assert result.exit_code == 42

    def test_execution_time_is_measured(self, manager):
        result = manager.execute_code("python", "import time\ntime.sleep(0.1)")

        assert result.execution_time_ms > 100

    def test_truncate_large_output(self, manager):
        code = "print('x' * 20000)"
        result = manager.execute_code("python", code)

        assert len(result.stdout) <= 10240 + 100
        assert "[Output truncated at 10KB limit]" in result.stdout


class TestCleanupContainer:
    def test_cleanup_existing_container(self, manager):
        manager.create_container("python")
        manager.cleanup_container("python")

        assert "python" not in manager.containers

    def test_cleanup_nonexistent_container(self, manager):
        manager.cleanup_container("nonexistent")

        assert "nonexistent" not in manager.containers


class TestCleanupAll:
    def test_cleanup_all_containers(self, manager):
        manager.create_container("python")
        manager.create_container("ruby")

        manager.cleanup_all()

        assert len(manager.containers) == 0


class TestGetContainerStatus:
    def test_status_of_running_container(self, manager):
        manager.create_container("python")

        status = manager.get_container_status("python")

        assert status == "running"

    def test_status_of_stopped_container(self, manager):
        status = manager.get_container_status("nonexistent")

        assert status == "stopped"


class TestGetUptime:
    def test_uptime_increases(self, manager):
        uptime1 = manager.get_uptime()
        time.sleep(0.1)
        uptime2 = manager.get_uptime()

        assert uptime2 > uptime1
        assert uptime2 - uptime1 >= 0.1
