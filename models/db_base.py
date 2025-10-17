"""Party and Player data models"""
import uuid
from copy import deepcopy
from config import TOPICS


PLAYER_TEMPLATE = {
    "Name": None,
    "Avatar": [0, 0, 0, 0],
    "Scores": 0,
    "GuessesLeft": None
}

PARTY_TEMPLATE = {
    "Host": None,
    "Players": {},
    "Gamerules": {
        "Rounds": 1,
        "DrawTime": 2,
        "GuessLimit": 0,
        "OnlyCustomTopics": False
    },
    "Values": {
        "State": "Waiting",
        "Topics": TOPICS.copy(),
        "CurrentDrawer": None,
        "PickedTopic": None,
        "RoundsLeft": 0,
        "TimesLeft": 0,
        "Drawing": None,
        "Guessed": 0
    },
}


def create_player(name, avatar_items):
    """
    Create a new player with a unique ID.
    
    Args:
        name (str): Player's display name
        avatar_items (list): List of 4 integers representing avatar parts
        
    Returns:
        tuple: (player_id (str), player_data (dict))
    """
    player_id = uuid.uuid4().hex[:30]
    player_data = deepcopy(PLAYER_TEMPLATE)
    
    player_data["Name"] = name
    player_data["Avatar"] = avatar_items
    
    return player_id, player_data


def create_party(host_id, host_data):
    """
    Create a new party with a host.
    
    Args:
        host_id (str): Host player ID
        host_data (dict): Host player data
        
    Returns:
        dict: New party data
    """
    new_party = deepcopy(PARTY_TEMPLATE)
    new_party["Host"] = host_id
    new_party["Players"] = {host_id: host_data}
    new_party["Values"]["CurrentDrawer"] = host_id
    
    return new_party