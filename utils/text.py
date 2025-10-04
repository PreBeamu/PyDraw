"""Text processing utilities"""
import unicodedata
import re


def mask_topic(topic):
    """Convert a topic into underscores and remove diacritics."""
    no_diacritics = "".join(
        ch
        for ch in unicodedata.normalize("NFD", topic)
        if unicodedata.category(ch) != "Mn"
    )
    masked = re.sub(r"[^\s]", "_", no_diacritics)
    return masked


def remove_diacritic(text):
    """Remove diacritic marks from text."""
    normalized = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))