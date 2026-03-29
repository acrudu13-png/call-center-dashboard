"""
AES-256 encryption for sensitive settings (API keys, passwords) stored in the database.
Uses Fernet (AES-128-CBC with HMAC-SHA256) from the cryptography library.
The encryption key is derived from the ENCRYPTION_KEY env var via PBKDF2.
"""

import base64
import os
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

# Fixed salt — consistent across restarts so existing data can be decrypted.
# Changing this invalidates all encrypted data in the DB.
_SALT = b"callqa-settings-v1"

_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is not None:
        return _fernet

    secret = os.getenv("ENCRYPTION_KEY", "")
    if not secret:
        raise RuntimeError("ENCRYPTION_KEY environment variable is required")

    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=_SALT,
        iterations=480_000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(secret.encode()))
    _fernet = Fernet(key)
    return _fernet


def encrypt(plaintext: str) -> str:
    """Encrypt a string and return a base64-encoded ciphertext."""
    if not plaintext:
        return ""
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    """Decrypt a base64-encoded ciphertext back to plaintext."""
    if not ciphertext:
        return ""
    return _get_fernet().decrypt(ciphertext.encode()).decode()


def is_encrypted(value: str) -> bool:
    """Heuristic check: Fernet tokens start with 'gAAAAA'."""
    return value.startswith("gAAAAA") and len(value) > 50
