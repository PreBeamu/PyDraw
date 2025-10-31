"""Helper utility functions"""
import random
from string import ascii_uppercase, digits


def gen_code(existing_codes):
    """Generate a unique random 5-character party code."""
    while True:
        party_code = "".join(random.choices(ascii_uppercase + digits, k=5))
        if party_code not in existing_codes:
            return party_code


def clamp(value, min_val, max_val):
    """Clamp a number between min_val and max_val."""
    return max(min_val, min(max_val, value))


def get_sid_from_player(socket_map, party_code, player_id):
    """Return sid of specific player using player_id."""
    for sid, (p_code, p_id) in socket_map.items():
        if p_code == party_code and p_id == player_id:
            return sid
    return None


def score_update(score, time_max, time_remain, answered):
    """Update score based on time and people who have answered."""
    score = score + ((time_remain // time_max) * 1000) + (1 // (answered + 1)) * 450
    return int(score)