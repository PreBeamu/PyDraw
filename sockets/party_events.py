"""Party socket events"""
from flask import request
from flask_socketio import join_room, leave_room


def update_plrList(socketio, parties, data):
    """Emit the updated list of players in a party."""
    party_code = data.get("party_code")
    if party_code in parties:
        if parties[party_code]["Values"]["State"] == "Waiting":
            value = {
                "type": "Party",
                "reset": False,
                "host": parties[party_code]["Host"],
                "players": parties[party_code]["Players"],
            }
            socketio.emit("update_players", value, room=party_code)
        else:
            update_inGamePlayers(
                socketio, parties, data, True,
                parties[party_code]["Values"]["CurrentDrawer"]
            )


def update_inGamePlayers(socketio, parties, data, reset, drawer):
    """Emit the updated list of players in the game."""
    party_code = data.get("party_code")
    if party_code in parties:
        value = {
            "type": "InGame",
            "reset": reset,
            "drawer_id": drawer,
            "players": parties[party_code]["Players"],
        }
        socketio.emit("update_players", value, room=party_code)


def register_party_events(socketio, parties, socket_map):
    """Register party-related socket events."""
    
    @socketio.on("join_party_room")
    def handle_join_party(data):
        """Join a player to a Socket.IO room for the party."""
        party_code = data.get("party_code")
        player_id = data.get("player_id")
        player_name = parties[party_code]["Players"][player_id]["Name"]

        if party_code not in parties:
            return
        if player_id not in parties[party_code]["Players"]:
            return

        for _, (code, pid) in socket_map.items():
            if pid == player_id and code == party_code:
                return

        join_room(party_code)
        socket_map[request.sid] = (party_code, player_id)
        update_plrList(socketio, parties, data)

        msg_type = "create" if "create" in data else "join"
        value = {
            "custom_class": msg_type,
            "name": player_name,
            "avatar": parties[party_code]["Players"][player_id]["Avatar"],
            "message": f"{player_name} {'สร้าง' if msg_type=='create' else 'เข้าร่วม'}ปาร์ตี้!",
        }
        socketio.emit("message", value, room=party_code)
        socketio.emit("guess", value, room=party_code)

    @socketio.on("leave_party_room")
    def handle_leave_party():
        """Remove a player from a Socket.IO room."""
        sid = request.sid

        if sid not in socket_map:
            return {"success": False, "error": "Invalid session!"}

        party_code, player_id = socket_map[sid]

        if party_code not in parties:
            return {"success": False, "error": "Party not found!"}
        if player_id not in parties[party_code]["Players"]:
            return {"success": False, "error": "Player not in party!"}

        player_name = parties[party_code]["Players"][player_id]["Name"]
        del parties[party_code]["Players"][player_id]
        socket_map.pop(sid, None)

        if not parties[party_code]["Players"]:
            del parties[party_code]
        else:
            if parties[party_code]["Host"] == player_id:
                parties[party_code]["Host"] = next(iter(parties[party_code]["Players"]))
            update_plrList(socketio, parties, {"party_code": party_code})

        value = {
            "custom_class": "left",
            "name": player_name,
            "avatar": [1, 1, 1, 1],
            "message": f"{player_name} ออกจากปาร์ตี้!",
        }
        socketio.emit("message", value, room=party_code)
        socketio.emit("guess", value, room=party_code)

        leave_room(party_code)
        return {"success": True}

    @socketio.on("disconnect")
    def handle_disconnect():
        """Handle socket disconnection."""
        sid = request.sid
        if sid not in socket_map:
            return
        party_code, player_id = socket_map.pop(sid)

        if party_code in parties and player_id in parties[party_code]["Players"]:
            player_name = parties[party_code]["Players"][player_id]["Name"]
            del parties[party_code]["Players"][player_id]

            if parties[party_code]["Host"] == player_id:
                if parties[party_code]["Players"]:
                    parties[party_code]["Host"] = next(iter(parties[party_code]["Players"]))
                else:
                    del parties[party_code]
                    return

            value = {
                "custom_class": "left",
                "name": player_name,
                "avatar": [1, 1, 1, 1],
                "message": f"{player_name} ออกจากปาร์ตี้!",
            }
            socketio.emit("message", value, room=party_code)
            socketio.emit("guess", value, room=party_code)
            update_plrList(socketio, parties, {"party_code": party_code})