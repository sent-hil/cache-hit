"""Pytest configuration and fixtures for backend tests."""

import os

import pytest


@pytest.fixture(scope="session", autouse=True)
def set_test_environment():
    """Set up environment variables for testing."""
    # Set a dummy MOCHI_API_KEY for tests
    os.environ["MOCHI_API_KEY"] = "test_api_key_for_testing"
    yield
