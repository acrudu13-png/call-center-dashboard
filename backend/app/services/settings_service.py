"""
Shared settings service — single place to read/write encrypted settings from DB.
"""

import json
import logging
from sqlalchemy.orm import Session

from app.models.setting import Setting
from app.crypto import encrypt, decrypt, is_encrypted

logger = logging.getLogger(__name__)

# Fields that are encrypted at rest in the database
SENSITIVE_FIELDS: dict[str, list[str]] = {
    "sftp": ["password"],
    "s3": ["accessKey", "secretKey"],
    "llm": ["openRouterApiKey"],
    "soniox": ["apiKey"],
}


def get_setting(db: Session, key: str, default_cls, org_id: str = None):
    """Load a setting from DB, decrypting sensitive fields.
    If org_id is None, falls back to first matching row (backward compat for scheduler)."""
    if org_id:
        row = db.query(Setting).filter(Setting.organization_id == org_id, Setting.key == key).first()
    else:
        row = db.query(Setting).filter(Setting.key == key).first()
    if row and row.value:
        data = json.loads(row.value)
        for field in SENSITIVE_FIELDS.get(key, []):
            if field in data and data[field] and is_encrypted(data[field]):
                try:
                    data[field] = decrypt(data[field])
                except Exception:
                    logger.warning(f"Failed to decrypt {key}.{field}")
        return default_cls(**data)
    return default_cls()


def save_setting(db: Session, key: str, data, org_id: str = None):
    """Save a setting to DB, encrypting sensitive fields."""
    if org_id:
        row = db.query(Setting).filter(Setting.organization_id == org_id, Setting.key == key).first()
    else:
        row = db.query(Setting).filter(Setting.key == key).first()
    data_dict = data.model_dump()
    for field in SENSITIVE_FIELDS.get(key, []):
        if field in data_dict and data_dict[field] and not is_encrypted(data_dict[field]):
            data_dict[field] = encrypt(data_dict[field])
    value = json.dumps(data_dict)
    if row:
        row.value = value
    else:
        row = Setting(organization_id=org_id, key=key, value=value)
        db.add(row)
    db.commit()
    return data  # return original (unencrypted) for the response
