import re
import logging
from typing import Optional
from app.schemas.setting import FilenameParserSettings

logger = logging.getLogger(__name__)


def check_metadata_conditions(conditions: list[dict], metadata: dict) -> bool:
    """Check if call metadata matches all rule conditions.
    Empty conditions = matches all calls.
    Operators: equals, not_equals, contains, not_contains.
    """
    if not conditions:
        return True
    for cond in conditions:
        field = cond.get("field", "")
        operator = cond.get("operator", "equals")
        expected = cond.get("value", "")
        actual = str(metadata.get(field, ""))
        if operator == "equals" and actual != expected:
            return False
        elif operator == "not_equals" and actual == expected:
            return False
        elif operator == "contains" and expected not in actual:
            return False
        elif operator == "not_contains" and expected in actual:
            return False
    return True


def parse_filename(settings: FilenameParserSettings, filename: str) -> dict:
    """
    Apply the configured regex pattern to a filename and return extracted fields.
    Returns dict with keys matching named capture groups. Missing fields are None.
    """
    result = {}

    if not settings.filenamePattern:
        return result

    try:
        # Convert JavaScript named groups (?<name>...) to Python (?P<name>...)
        pattern = re.sub(r'\(\?<([^>]+)>', r'(?P<\1>', settings.filenamePattern)
        match = re.search(pattern, filename)
        if match:
            result = {k: v for k, v in match.groupdict().items() if v is not None}
    except re.error as e:
        logger.warning(f"Invalid filename regex pattern: {e}")

    return result
