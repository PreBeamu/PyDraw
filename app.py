"""Start the app using py app.py"""
from gevent import monkey
from flask import Flask, jsonify, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from string import ascii_uppercase, digits
import random
import uuid
from time import sleep
monkey.patch_all()

# ============================
# APP SETUP
# ============================
app = Flask(__name__)
app.config["SECRET_KEY"] = "S3cr3tK3y"
socketio = SocketIO(app, async_mode="gevent", cors_allowed_origins="*")

# ============================
# GLOBALS & SETTINGS
# ============================
PARTIES = {}

# ============================
# HELPER FUNCTIONS
# ============================
def gen_code():
    """Generate a unique random 5-character party code."""
    while True:
        code = ''.join(random.choices(ascii_uppercase + digits, k=5))
        if code not in PARTIES:
            return code

def make_player(name,avatar_items):
    """Create a new player entry and return (id, player_dict)."""
    playerId = str(uuid.uuid4().hex[:20])
    return playerId, {
        "name": name,
        "avatar": avatar_items,
        "score": 0,
    }

# ============================
# ROUTES & SOCKETS
# ============================
@app.route("/")
def home():
    """Render index.html page."""
    return render_template("index.html")

@app.route("/create_party", methods=["POST"])
def create_party():
    """Create a new party with a unique code and return host info."""
    player_name = request.json.get("name")
    player_avatar = request.json.get("avatar")
    party_code = gen_code()
    player_id, player_data = make_player(player_name,player_avatar)

    PARTIES[party_code] = {
        "Host": player_id,
        "Players": {player_id: player_data}
    }
    sleep(1)

    return jsonify({
        "party_code": party_code,
        "player_id": player_id,
    })

@app.route("/join_party", methods=["POST"])
def join_party():
    """Join an existing party by code."""
    code = request.json.get("code")
    player_name = request.json.get("name")
    player_avatar = request.json.get("avatar")

    if code not in PARTIES:
        return jsonify({"error": "Party not found"}), 404

    # Create new player
    player_id, player_data = make_player(player_name, player_avatar)

    # Add to party
    PARTIES[code]["Players"][player_id] = player_data
    sleep(1)

    return jsonify({
        "player_id": player_id,
        "party_host": {
            "id": PARTIES[code]["Host"],
            "name": PARTIES[code]["Players"][PARTIES[code]["Host"]]["name"],
            "avatar": PARTIES[code]["Players"][PARTIES[code]["Host"]]["avatar"],
        },
        "players": PARTIES[code]["Players"]
    })

@app.route("/leave_party", methods=["POST"])
def leave_party():
    """Remove a player from a party and handle host/cleanup."""
    code = request.json.get("code")
    player_id = request.json.get("player_id")
    sleep(1)

    if code not in PARTIES:
        return jsonify({"error": "Party not found"}), 404
    if player_id not in PARTIES[code]["Players"]:
        return jsonify({"error": "Player not in party"}), 400

    # Remove player
    del PARTIES[code]["Players"][player_id]

    # Delete party if empty
    if not PARTIES[code]["Players"]:
        del PARTIES[code]
        return jsonify({"success": True, "party_deleted": True})

    # Assign new host if host left
    if PARTIES[code]["Host"] == player_id:
        PARTIES[code]["Host"] = next(iter(PARTIES[code]["Players"]))

    return jsonify({"success": True})

@socketio.on("message")
def handle_message(data):
    """Socket to Handle chat messages."""
    custom_class = data.get("custom_class")
    party_code = data.get("party_code")
    name = data.get("name")
    avatar = data.get("avatar")
    msg = data.get("msg")

    value = {"custom_class": custom_class, "name": name, "avatar": avatar, "message": msg}
    emit("message", value, room=party_code)

@socketio.on("join_party_room")
def handle_join_party(data):
    """Put player inside socket room when joined party."""
    party_code = data.get("party_code")
    player_id = data.get("player_id")
    if party_code in PARTIES and player_id in PARTIES[party_code]["Players"]:
        join_room(party_code)
        
@socketio.on("leave_party_room")
def handle_leave_party(data):
    """Kick player outside socket room when left party."""
    party_code = data.get("party_code")
    player_id = data.get("player_id")
    if party_code in PARTIES:
        leave_room(party_code)

# ============================
# MAIN
# ============================
if __name__ == "__main__":
    socketio.run(app, debug=True)
