from datetime import timedelta

import pytest
from jose import jwt

from app.core.config import settings
from app.core.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_password_returns_bcrypt_hash(self):
        hashed = hash_password("mysecretpassword")
        assert hashed.startswith("$2")
        assert hashed != "mysecretpassword"

    def test_verify_password_correct(self):
        hashed = hash_password("correctpassword")
        assert verify_password("correctpassword", hashed) is True

    def test_verify_password_incorrect(self):
        hashed = hash_password("correctpassword")
        assert verify_password("wrongpassword", hashed) is False

    def test_hash_password_produces_unique_hashes(self):
        h1 = hash_password("samepassword")
        h2 = hash_password("samepassword")
        assert h1 != h2  # bcrypt salts differ


class TestAccessToken:
    def test_create_access_token_returns_string(self):
        token = create_access_token(subject=1)
        assert isinstance(token, str)

    def test_create_access_token_contains_subject(self):
        token = create_access_token(subject=42)
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert payload["sub"] == "42"

    def test_create_access_token_custom_expiry(self):
        token = create_access_token(subject=1, expires_delta=timedelta(minutes=5))
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert "exp" in payload

    def test_create_access_token_default_24h_expiry(self):
        token = create_access_token(subject=1)
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert payload["exp"] - payload["iat"] == 24 * 3600

    def test_decode_token_valid(self):
        token = create_access_token(subject=99)
        payload = decode_token(token)
        assert payload["sub"] == "99"

    def test_decode_token_invalid_raises(self):
        from jose import JWTError

        with pytest.raises(JWTError):
            decode_token("invalid.token.here")

    def test_decode_token_wrong_key_raises(self):
        from jose import JWTError

        token = jwt.encode({"sub": "1"}, "wrong-key", algorithm="HS256")
        with pytest.raises(JWTError):
            decode_token(token)
