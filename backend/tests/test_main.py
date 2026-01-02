import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


class TestExecutePython:
    def test_execute_simple_python_code(self, client):
        response = client.post("/execute/python", json={"code": "print('hello world')"})

        assert response.status_code == 200
        data = response.json()
        assert data["stdout"] == "hello world\n"
        assert data["stderr"] == ""
        assert data["exit_code"] == 0


class TestExecuteRuby:
    def test_execute_simple_ruby_code(self, client):
        response = client.post("/execute/ruby", json={"code": "puts 'hello world'"})

        assert response.status_code == 200
        data = response.json()
        assert data["stdout"] == "hello world\n"
        assert data["stderr"] == ""
        assert data["exit_code"] == 0


class TestHealth:
    def test_health_check(self, client):
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"


class TestPathTraversalProtection:
    """Test that path traversal attacks are prevented in SPA file serving."""

    def test_blocks_basic_path_traversal(self, client):
        """Test that basic ../ path traversal is blocked."""
        response = client.get("/../../../etc/passwd")
        assert response.status_code == 404

    def test_blocks_encoded_path_traversal(self, client):
        """Test that URL-encoded path traversal is blocked."""
        response = client.get("/..%2F..%2F..%2Fetc%2Fpasswd")
        assert response.status_code == 404

    def test_blocks_parent_directory_access(self, client):
        """Test that accessing parent directories is blocked."""
        response = client.get("/../backend/main.py")
        assert response.status_code == 404

    def test_blocks_absolute_paths(self, client):
        """Test that absolute paths outside frontend are blocked."""
        response = client.get("/etc/passwd")
        assert response.status_code == 404
