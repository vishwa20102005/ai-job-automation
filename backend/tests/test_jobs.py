"""Job management API tests."""


def test_create_job(client, auth_headers):
    """Test creating a job."""
    resp = client.post(
        "/api/v1/jobs",
        json={
            "title": "Python Developer",
            "company": "TechCorp",
            "location": "Bangalore, India",
            "description": "We need a Python developer with FastAPI and PostgreSQL skills.",
            "required_skills": ["python", "fastapi"],
            "preferred_skills": ["docker"],
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Python Developer"
    assert data["company"] == "TechCorp"
    assert data["source"] == "manual"
    return data


def test_list_jobs(client, auth_headers):
    """Test listing jobs."""
    # Create a job first
    client.post(
        "/api/v1/jobs",
        json={"title": "AI Engineer", "description": "AI/ML role"},
        headers=auth_headers,
    )
    resp = client.get("/api/v1/jobs", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)


def test_get_job(client, auth_headers):
    """Test getting a specific job."""
    create_resp = client.post(
        "/api/v1/jobs",
        json={"title": "Backend Engineer", "description": "Backend role with Python"},
        headers=auth_headers,
    )
    job_id = create_resp.json()["id"]

    resp = client.get(f"/api/v1/jobs/{job_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == job_id


def test_update_job(client, auth_headers):
    """Test updating a job."""
    create_resp = client.post(
        "/api/v1/jobs",
        json={"title": "Dev Job", "description": "Some description"},
        headers=auth_headers,
    )
    job_id = create_resp.json()["id"]

    resp = client.patch(
        f"/api/v1/jobs/{job_id}",
        json={"title": "Updated Dev Job", "company": "NewCorp"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated Dev Job"


def test_delete_job(client, auth_headers):
    """Test deleting a job."""
    create_resp = client.post(
        "/api/v1/jobs",
        json={"title": "Delete Me", "description": "To be deleted"},
        headers=auth_headers,
    )
    job_id = create_resp.json()["id"]

    resp = client.delete(f"/api/v1/jobs/{job_id}", headers=auth_headers)
    assert resp.status_code == 204

    get_resp = client.get(f"/api/v1/jobs/{job_id}", headers=auth_headers)
    assert get_resp.status_code == 404


def test_job_ownership_enforcement(client, auth_headers):
    """Test that users cannot access other users' jobs."""
    # Create job for user A
    create_resp = client.post(
        "/api/v1/jobs",
        json={"title": "Private Job", "description": "Private"},
        headers=auth_headers,
    )
    job_id = create_resp.json()["id"]

    # Register user B
    user_b = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "User B",
            "email": "user_b_jobs@example.com",
            "password": "PassB12345",
        },
    ).json()
    headers_b = {"Authorization": f"Bearer {user_b['access_token']}"}

    # User B should NOT see user A's job
    resp = client.get(f"/api/v1/jobs/{job_id}", headers=headers_b)
    assert resp.status_code == 404


def test_job_search(client, auth_headers):
    """Test job search by title."""
    client.post(
        "/api/v1/jobs",
        json={"title": "React Frontend Developer", "description": "React role"},
        headers=auth_headers,
    )
    resp = client.get("/api/v1/jobs?search=React", headers=auth_headers)
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert any("React" in j["title"] for j in items)


def test_require_auth_for_jobs(client):
    """Test that job endpoints require authentication."""
    resp = client.get("/api/v1/jobs")
    assert resp.status_code in (401, 403)
