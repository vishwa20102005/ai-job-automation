"""Authentication API tests."""
import pytest
from fastapi.testclient import TestClient


def test_register_success(client: TestClient):
    """Test successful user registration."""
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Jane Doe",
            "email": "jane.doe.test@example.com",
            "password": "SecurePass123",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_register_duplicate_email(client: TestClient):
    """Test that duplicate email registration fails."""
    email = "duplicate_test@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"full_name": "User One", "email": email, "password": "Pass12345"},
    )
    resp = client.post(
        "/api/v1/auth/register",
        json={"full_name": "User Two", "email": email, "password": "Pass12345"},
    )
    assert resp.status_code == 400
    assert "already" in resp.json()["detail"].lower()


def test_register_short_password(client: TestClient):
    """Test validation for short password."""
    resp = client.post(
        "/api/v1/auth/register",
        json={"full_name": "Test", "email": "short@example.com", "password": "abc"},
    )
    assert resp.status_code == 422


def test_login_success(client: TestClient):
    """Test successful login."""
    email = "login_test@example.com"
    password = "LoginPass123"
    client.post(
        "/api/v1/auth/register",
        json={"full_name": "Login User", "email": email, "password": password},
    )
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_wrong_password(client: TestClient):
    """Test that wrong password is rejected."""
    email = "wrongpass@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"full_name": "Test", "email": email, "password": "CorrectPass123"},
    )
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "WrongPass456"},
    )
    assert resp.status_code == 401


def test_get_me(client: TestClient, auth_headers):
    """Test fetching current user profile."""
    resp = client.get("/api/v1/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "id" in data
    assert "email" in data
    assert "password_hash" not in data  # Never expose password hash


def test_get_me_without_token(client: TestClient):
    """Test that /me endpoint requires authentication."""
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code in (401, 403)


def test_refresh_token(client: TestClient, registered_user):
    """Test token refresh."""
    resp = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": registered_user["refresh_token"]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data


def test_logout(client: TestClient, auth_headers):
    """Test logout endpoint."""
    resp = client.post("/api/v1/auth/logout", headers=auth_headers)
    assert resp.status_code == 200


def test_health_endpoint(client: TestClient):
    """Test health check endpoint."""
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
