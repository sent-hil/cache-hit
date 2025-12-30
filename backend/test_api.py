#!/usr/bin/env python3
"""
Simple test script for the Code Runner API.
Usage: python test_api.py
"""

import requests
import json

BASE_URL = "http://localhost:8000"


def test_health():
    """Test health check endpoint."""
    print("Testing /health endpoint...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
    print()


def test_python_execution():
    """Test Python code execution."""
    print("Testing Python execution...")
    code = """
print("Hello from Python!")
numbers = [1, 2, 3, 4, 5]
total = sum(numbers)
print(f"Sum: {total}")
"""
    response = requests.post(f"{BASE_URL}/execute/python", json={"code": code})
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Output:\n{result['stdout']}")
    print(f"Execution time: {result['execution_time_ms']}ms")
    print(f"Memory used: {result['memory_used_mb']}MB")
    print()


def test_ruby_execution():
    """Test Ruby code execution."""
    print("Testing Ruby execution...")
    code = """
puts "Hello from Ruby!"
array = [1, 2, 3, 4, 5]
total = array.sum
puts "Sum: #{total}"
"""
    response = requests.post(f"{BASE_URL}/execute/ruby", json={"code": code})
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Output:\n{result['stdout']}")
    print(f"Execution time: {result['execution_time_ms']}ms")
    print(f"Memory used: {result['memory_used_mb']}MB")
    print()


def test_error_handling():
    """Test error handling."""
    print("Testing error handling...")
    code = """
print("Before error")
raise ValueError("Test error")
print("After error - should not print")
"""
    response = requests.post(f"{BASE_URL}/execute/python", json={"code": code})
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Stdout:\n{result['stdout']}")
    print(f"Stderr:\n{result['stderr']}")
    print(f"Exit code: {result['exit_code']}")
    print()


if __name__ == "__main__":
    try:
        test_health()
        test_python_execution()
        test_ruby_execution()
        test_error_handling()
        print("All tests passed!")
    except Exception as e:
        print(f"Error: {e}")
