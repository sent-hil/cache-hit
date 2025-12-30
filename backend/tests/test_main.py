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
