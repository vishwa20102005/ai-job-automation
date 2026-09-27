"""
Test configuration and fixtures.
Uses SQLite in-memory database for isolation.
"""
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Use SQLite for tests (no PostgreSQL required)
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_careerpilot.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key-minimum-32-characters-long")
os.environ.setdefault("ENVIRONMENT", "test")

from app.core.database import Base, get_db
from app.main import app

TEST_DATABASE_URL = "sqlite:///./test_careerpilot.db"

engine = create_engine(
    TEST_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """Create all tables before tests, drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    # Clean up SQLite file (best-effort; Windows may lock it)
    import os
    try:
        engine.dispose()
        if os.path.exists("test_careerpilot.db"):
            os.remove("test_careerpilot.db")
    except Exception:
        pass


@pytest.fixture(scope="function")
def db():
    """Per-test database session with rollback."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="session")
def client():
    """Test client with database override."""
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def registered_user(client):
    """Register and return a test user with tokens."""
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Test User",
            "email": f"test_{os.urandom(4).hex()}@example.com",
            "password": "TestPass123!",
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.fixture
def auth_headers(registered_user):
    """Return auth headers for a registered user."""
    return {"Authorization": f"Bearer {registered_user['access_token']}"}
