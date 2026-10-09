import pytest
from fastapi.testclient import TestClient
from main import app, APP_PIN, VALID_AUTH_TOKEN

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data

def test_auth_login_and_cookie():
    # 1. Неверный пин-код
    bad_res = client.post("/api/auth/login", json={"pin": "0000"})
    assert bad_res.status_code == 401

    # 2. Правильный пин-код 2509
    good_res = client.post("/api/auth/login", json={"pin": "2509"})
    assert good_res.status_code == 200
    data = good_res.json()
    assert data.get("ok") is True
    assert data.get("token") == VALID_AUTH_TOKEN
    assert "auth_token" in good_res.cookies

    # 3. Проверка через /api/auth/check с токеном в заголовке
    check_header = client.get("/api/auth/check", headers={"Authorization": f"Bearer {VALID_AUTH_TOKEN}"})
    assert check_header.status_code == 200
    assert check_header.json().get("authenticated") is True

    # 4. Проверка через /api/auth/check с кукой
    check_cookie = client.get("/api/auth/check", cookies={"auth_token": VALID_AUTH_TOKEN})
    assert check_cookie.status_code == 200
    assert check_cookie.json().get("authenticated") is True

def test_protected_routes_require_auth():
    # Без авторизации защищенные роуты возвращают 401
    fresh_client = TestClient(app)
    unauth_dossier = fresh_client.get("/api/dossier")
    assert unauth_dossier.status_code == 401

    unauth_history = fresh_client.get("/api/chat/history")
    assert unauth_history.status_code == 401

    # С авторизацией защищенные роуты работают (200)
    auth_client = TestClient(app, cookies={"auth_token": VALID_AUTH_TOKEN})
    auth_dossier = auth_client.get("/api/dossier")
    assert auth_dossier.status_code == 200
    assert "name" in auth_dossier.json()

def test_german_check_logic():
    # 1. Пустой перевод
    empty_res = client.post("/api/german/check", json={
        "sentence": "Heute lerne ich Deutsch.",
        "german_text": "Heute lerne ich Deutsch.",
        "user_translation": ""
    })
    assert empty_res.status_code == 200
    assert empty_res.json().get("correct") is False

    # 2. Правильный точный перевод из курса
    correct_res = client.post("/api/german/check", json={
        "sentence": "Heute lerne ich Deutsch.",
        "german_text": "Heute lerne ich Deutsch.",
        "user_translation": "Сегодня я учу немецкий."
    })
    assert correct_res.status_code == 200
    assert correct_res.json().get("correct") is True

    # 3. Заведомо неверный бессмысленный перевод
    wrong_res = client.post("/api/german/check", json={
        "sentence": "Heute lerne ich Deutsch.",
        "german_text": "Heute lerne ich Deutsch.",
        "user_translation": "квадратный помидор летит в космос"
    })
    assert wrong_res.status_code == 200
    assert wrong_res.json().get("correct") is False

def test_german_endpoint():
    response = client.get("/api/german?level=A1")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0

def test_library_endpoint():
    response = client.get("/api/library")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0

def test_books_and_german_course_endpoints():
    res_books = client.get("/api/books")
    assert res_books.status_code == 200
    assert isinstance(res_books.json(), list)

    res_course = client.get("/api/german/course")
    assert res_course.status_code == 200
    assert isinstance(res_course.json(), dict)
    assert "lessons" in res_course.json()

def test_dossier_intake_flow():
    auth_client = TestClient(app, cookies={"auth_token": VALID_AUTH_TOKEN})
    test_payload = {
        "current_challenges": ["Адаптация в Германии", "Немецкий B1"],
        "energy_level": "7/10",
        "inner_critic_triggers": "«Я делаю недостаточно»",
        "somatic_stress_signs": "Зажим в шее",
        "restorative_resources": ["Чай с мятой", "Прогулки"],
        "core_values": ["Спокойствие", "Самоценность"],
        "support_style": "Бережное принятие и тепло",
        "personal_growth_goal": "Свободный немецкий B1"
    }
    save_res = auth_client.post("/api/dossier/intake", json=test_payload)
    assert save_res.status_code == 200
    assert save_res.json().get("status") == "ok"

    get_res = auth_client.get("/api/dossier")
    assert get_res.status_code == 200
    data = get_res.json()
    assert "intake_profile" in data
    assert data["intake_profile"]["energy_level"] == "7/10"

