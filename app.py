"""Start the app using py app.py"""
from gevent import monkey
from flask import Flask, jsonify, render_template, request
from flask_socketio import SocketIO, emit
from string import ascii_uppercase, digits
import random
import uuid
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
    playerId = str(uuid.uuid4())
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

    return jsonify({
        "party_code": party_code,
        "player_id": player_id,
        "party_host": {
            "name": player_data["name"],
            "avatar": player_data["avatar"],
        }
    })

@app.route("/leave_party", methods=["POST"])
def leave_party():
    """Remove a player from a party and handle host/cleanup."""
    code = request.json.get("code")
    player_id = request.json.get("player_id")

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
    value = {"name": data.get("name"), "avatar": data.get("avatar"), "message": data.get("msg")}
    emit("message", value, broadcast=True)

# ============================
# MAIN
# ============================
if __name__ == "__main__":
    socketio.run(app, debug=True)
