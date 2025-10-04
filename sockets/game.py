"""Game socket events"""
from flask import request
from gevent import spawn_later
from utils.helpers import clamp
from sockets.party import update_inGamePlayers
from game_logic.timer import run_game


def register_game_events(socketio, parties, socket_map):
    """Register game-related socket events."""
    
    @socketio.on("start_game")
    def handle_start_game(data):
        """Host starts the game with provided options."""
        sid = request.sid
        if sid not in socket_map:
            return {"success": False, "error": "Invalid session!"}

        party_code, player_id = socket_map[sid]

        if party_code not in parties:
            return {"success": False, "error": "Party not found!"}
        if player_id not in parties[party_code]["Players"]:
            return {"success": False, "error": "Player not in party!"}
        if parties[party_code]["Host"] != player_id:
            return {"success": False, "error": "Only host can start the game!"}
        if parties[party_code]["Values"]["State"] != "Waiting":
            return {"success": False, "error": "Invalid Party state!"}
        
        rounds = int(data.get("roundsCount", 1))
        draw_time = int(data.get("drawTime", 1))
        guess_limit = int(data.get("guessLimit", 0))

        parties[party_code]["Values"]["State"] = "InGame"
        parties[party_code]["Gamerules"]["Rounds"] = clamp(rounds, 1, 10)
        parties[party_code]["Gamerules"]["DrawTime"] = clamp(draw_time, 1, 15)
        parties[party_code]["Gamerules"]["GuessLimit"] = clamp(guess_limit, 0, 20)
        parties[party_code]["Gamerules"]["OnlyCustomTopics"] = data.get("onlyCustom", False)
        
        for plr in parties[party_code]["Players"].values():
            plr["GuessesLeft"] = parties[party_code]["Gamerules"]["GuessLimit"]
            if parties[party_code]["Gamerules"]["GuessLimit"] <= 0:
                plr["GuessesLeft"] = None

        customTopics = data.get("customTopics", "")
        if customTopics:
            topics = [w.strip() for w in customTopics.split(",") if w.strip()]
            if data.get("onlyCustom") and topics:
                parties[party_code]["Values"]["Topics"] = topics
            else:
                parties[party_code]["Values"]["Topics"].extend(topics)

        value = {"guessLimit": parties[party_code]["Gamerules"]["GuessLimit"]}
        socketio.emit("start_game", value, room=party_code)
        update_inGamePlayers(
            socketio, parties, {"party_code": party_code}, True,
            parties[party_code]["Values"]["CurrentDrawer"]
        )
        spawn_later(3, run_game, socketio, parties, socket_map, party_code)

        return {"success": True}

    @socketio.on("pick_topic")
    def handle_topic(data):
        """Handle incoming topic the drawer picked."""
        sid = request.sid
        if sid not in socket_map:
            return

        party_code, player_id = socket_map[sid]
        picked_topic = data.get("picked_topic")

        if party_code not in parties:
            return
        if player_id != parties[party_code]["Values"]["CurrentDrawer"]:
            return

        if picked_topic in parties[party_code]["Values"]["Topics"]:
            parties[party_code]["Values"]["PickedTopic"] = picked_topic

    @socketio.on('draw_line')
    def handle_draw(data):
        sid = request.sid
        if sid not in socket_map:
            return
        party_code, _ = socket_map[sid]
        parties[party_code]["Values"]["Drawing"] = data
        socketio.emit('draw_line', data, to=party_code, include_self=False)
