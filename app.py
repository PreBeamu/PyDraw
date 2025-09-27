"""Start the app using py app.py"""
from gevent import monkey, spawn_later, sleep
from flask import Flask, jsonify, render_template, request
from flask_socketio import SocketIO, join_room, leave_room
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
PARTIES = {}  # Stores all active parties
SOCKET_MAP = {}  # Maps socket session id -> (party_code, player_id)
topicS = [
    # --- Objects ---
    "โทรศัพท์", "โต๊ะ", "เก้าอี้", "ดินสอ", "ยางลบ", "หนังสือ",
    "รองเท้า", "หมวก", "แว่นตา", "จักรยาน", "รถยนต์", "บ้าน",
    "ตู้เย็น", "พัดลม", "คอมพิวเตอร์", "ทีวี", "นาฬิกา",

    # --- Animals ---
    "สุนัข", "แมว", "ปลา", "ช้าง", "นก", "ม้า", "เสือ", "ลิง",
    "ไก่", "เต่า", "กบ", "ปลาวาฬ",

    # --- Foods ---
    "ข้าว", "ก๋วยเตี๋ยว", "พิซซ่า", "แฮมเบอร์เกอร์", "ซูชิ", "ส้มตำ",
    "ไก่ทอด", "ไอศกรีม", "แตงโม", "ส้ม", "กล้วย",

    # --- Places ---
    "โรงเรียน", "วัด", "สนามบิน", "โรงพยาบาล", "ตลาด", "สนามฟุตบอล",
    "สวนสัตว์", "ชายหาด", "ภูเขา",

    # --- Activities ---
    "นอน", "กิน", "เต้น", "วิ่ง", "ว่ายน้ำ", "เล่นเกม", "ถ่ายรูป",
    "จักรยาน", "การบ้าน",
]

# ============================
# HELPER FUNCTIONS
# ============================
def gen_code():
    """
    Generate a unique random 5-character party code using uppercase letters and digits.

    Returns:
        str: A 5-character unique party code.
    """
    while True:
        party_code = ''.join(random.choices(ascii_uppercase + digits, k=5))
        if party_code not in PARTIES:
            return party_code


def make_player(name, avatar_items):
    """
    Create a new player dictionary with a unique ID.

    Args:
        name (str): The player's display name.
        avatar_items (list): List of 4 integers representing avatar parts.

    Returns:
        tuple: (player_id (str), player_data (dict))
    """
    playerId = str(uuid.uuid4().hex[:20])
    return playerId, {
        "name": name,
        "avatar": avatar_items,
        "score": 0,
        "guessed": 0,
    }


def score_update(score, time_max, time_remain, answered):
    """
    update score based on time and people who have answered

    Args:
        score (int): the score before this update.
        time_max (int): total time of the round (seconds)
        time_remain (int): total time left in said round (seconds)
        answered (int: default 0) total people that have answered this picture

    Returns:
        int: the new update score
    """
    score = score + ((time_remain // time_max) * 1000) + (1 // (answered + 1)) * 450
    return int(score)

def get_top_three(playerId):
    """
    idk what the player format just yet so please fix
    because it will 100% break

    Args:
        playerId{?} (tuple?):
                playerId = str(uuid.uuid4().hex[:20])
            return playerId, {
                "name": name,
                "avatar": avatar_items,
                "score": 0,
                ^ this format ig
    return
        list: [{firstplace_score}, {secondplace_score}, {threeplace_score}]
    }

    """
    three = sorted(playerId, key=lambda tres: tres["score"], reverse=True)
    return three[:3]

def update_plrList(data):
    """
    Emit the updated list of players in a party to all sockets in the room.

    Args:
        data (dict): Contains 'party_code' key for the room to update.
    """
    party_code = data.get("party_code")
    if party_code in PARTIES:
        if PARTIES[party_code]["Values"]["State"] == "Waiting":
            value = {
                "type": "Party",
                "reset": False,
                "host": PARTIES[party_code]["Host"],
                "players": PARTIES[party_code]["Players"]
            }
            socketio.emit("update_players", value, room=party_code)
        else:
            update_inGamePlayers(data,True,PARTIES[party_code]["Values"]["CurrentDrawer"])

def update_inGamePlayers(data,reset,drawer):
    """
    Emit the updated list of players in the game to all sockets in the room.

    Args:
        data (dict): Contains 'party_code' key for the room to update.
        reset: Reset loadedPlayers list or not.
        drawer: Current drawer.
    """
    party_code = data.get("party_code")
    if party_code in PARTIES:
        value = {
            "type": "InGame",
            "reset": reset,
            "drawer": drawer,
            "players": PARTIES[party_code]["Players"]
        }
        socketio.emit("update_players", value, room=party_code)

# ============================
# RUN GAME
# ============================
def runGame(party_code):
    """
    Start the game timer countdown for the current drawer.
    Emits 'timer_update' events to clients every second.
    """
    if party_code not in PARTIES:
        return

    def timer_task():
        """
        Runs a countdown timer for a given party, updating the remaining time every second.
        """
        # --- Random Topics ---
        topics_list = PARTIES[party_code]["Values"].get("Topics", [])
        num_topics_to_pick = min(3, len(topics_list))
        picked_topics = random.sample(topics_list, num_topics_to_pick) if topics_list else []

        # --- Fill up to 3 by repeating the last picked topic ---
        while len(picked_topics) < 3 and picked_topics:
            picked_topics.append(picked_topics[-1])

        value = {
            "drawer": PARTIES[party_code]["Values"]["CurrentDrawer"],
            "topic1": picked_topics[0],
            "topic2": picked_topics[1],
            "topic3": picked_topics[2],
        }
        socketio.emit("topics_pick", value, room=party_code)
        
        # --- TopicsPick Timer ---
        pre_start = 20
        while pre_start > 0:
            # --- Check if party still exists ---
            if party_code not in PARTIES:
                return
            
            # --- Update remaining time ---
            time_label = f"{pre_start//60:02}:{pre_start%60:02}"
            socketio.emit("update_timer", {"time": time_label}, room=party_code)
            sleep(1)
            pre_start -= 1

        # --- Draw Timer ---
        remaining = PARTIES[party_code]["Gamerules"]["DrawTime"]*60
        while remaining > 0:
            # --- Check if party still exists ---
            if party_code not in PARTIES:
                return
            
            # --- Update remaining time ---
            PARTIES[party_code]["Values"]["TimeLeft"] = remaining
            time_label = f"{remaining//60:02}:{remaining%60:02}"
            socketio.emit("update_timer", {"time": time_label}, room=party_code)
            sleep(1)
            remaining -= 1

        # --- Timer finished ---
        if party_code in PARTIES:
            PARTIES[party_code]["Values"]["TimeLeft"] = 0
            socketio.emit("update_timer", {"time": "00:00"}, room=party_code)
            # Continue to next round or end game

    socketio.start_background_task(timer_task)

# ============================
# ROUTES
# ============================
@app.route("/")
def home():
    """
    Render the main index page.

    Returns:
        str: Rendered HTML page.
    """

    return render_template("index.html")


@app.route("/create_party", methods=["POST"])
def create_party():
    """
    Create a new party and assign the creator as the host.

    JSON Request:
        name: str
        avatar: list[int]

    Returns:
        JSON: party_code and player_id
    """
    player_name = request.json.get("name")
    player_avatar = request.json.get("avatar")
    party_code = gen_code()
    player_id, player_data = make_player(player_name, player_avatar)

    PARTIES[party_code] = {
        "Host": player_id,
        "Players": {player_id: player_data},
        "Gamerules": {
            "Rounds" : 1,
            "DrawTime" : 2,
            "GuessLimit" : 0,
            "OnlyCustomTopics" : False,
        },
        "Values": {
            "State": "Waiting",
            "Topics": topicS,
            "CurrentDrawer": player_id,
            "TimeLeft": 0,
        }
    }

    return jsonify({
        "party_code": party_code,
        "player_id": player_id,
    })


@app.route("/join_party", methods=["POST"])
def join_party():
    """
    Add a player to an existing party.

    JSON Request:
        party_code: str
        name: str
        avatar: list[int]

    Returns:
        JSON: player_id and party_state.
    """
    party_code = request.json.get("party_code")
    player_name = request.json.get("name")
    player_avatar = request.json.get("avatar")

    if party_code not in PARTIES:
        return jsonify({"error": "Party not found"}), 404

    player_id, player_data = make_player(player_name, player_avatar)
    PARTIES[party_code]["Players"][player_id] = player_data

    return jsonify({
        "player_id": player_id,
        "party_state": PARTIES[party_code]["Values"]["State"]
    })


@app.route("/leave_party", methods=["POST"])
def leave_party():
    """
    Remove a player from a party when they explicitly leave.

    JSON Request:
        party_code: str
        player_id: str

    Returns:
        JSON: success status and party_deleted flag if party becomes empty.
    """
    party_code = request.json.get("party_code")
    player_id = request.json.get("player_id")

    if party_code not in PARTIES:
        return jsonify({"error": "Party not found"}), 404
    if player_id not in PARTIES[party_code]["Players"]:
        return jsonify({"error": "Player not in party"}), 400

    del PARTIES[party_code]["Players"][player_id]

    # --- Delete party if empty ---
    if not PARTIES[party_code]["Players"]:
        del PARTIES[party_code]
        return jsonify({"success": True, "party_deleted": True})

    # --- Assign new host if host left ---
    if PARTIES[party_code]["Host"] == player_id:
        PARTIES[party_code]["Host"] = next(iter(PARTIES[party_code]["Players"]))

    return jsonify({"success": True})

@app.route("/start_game", methods=["POST"])
def start_game():
    """
    Start game and getting all party settings.

    JSON Request:
        party_code: str
        player_id: str
        roundsCount: int
        guessLimit: int
        drawTime: int
        onlyCustom: bool
        customTopics: str

    Returns:
        JSON: success status.
    """
    party_code = request.json.get("party_code")
    player_id = request.json.get("player_id")
    roundsCount = request.json.get("roundsCount")
    drawTime = request.json.get("drawTime")
    guessLimit = request.json.get("guessLimit")
    onlyCustom = request.json.get("onlyCustom")
    customTopics = request.json.get("customTopics")

    # --- Check if valid ---
    if party_code not in PARTIES:
        return jsonify({"error": "Party not found"}), 404
    if player_id not in PARTIES[party_code]["Players"]:
        return jsonify({"error": "Player not in party"}), 400
    if PARTIES[party_code]["Host"] != player_id:
        return jsonify({"error": "Only host can start the game"}), 403

    # --- Assign Gamerules ---
    PARTIES[party_code]["Values"]["State"] = "InGame"
    PARTIES[party_code]["Gamerules"]["Rounds"] = roundsCount
    PARTIES[party_code]["Gamerules"]["DrawTime"] = drawTime
    PARTIES[party_code]["Gamerules"]["GuessLimit"] = guessLimit
    PARTIES[party_code]["Gamerules"]["OnlyCustomTopics"] = onlyCustom
    if customTopics:
        topics = [w.strip() for w in customTopics.split(",") if w.strip()]
        if onlyCustom and topics:
            PARTIES[party_code]["Values"]["Topics"] = topics
        else:
            PARTIES[party_code]["Values"]["Topics"].extend(topics)
    socketio.emit("start_game", room=party_code)
    update_inGamePlayers(request.json,True,PARTIES[party_code]["Values"]["CurrentDrawer"])
    spawn_later(3, runGame, party_code)

    return jsonify({"success": True})

# ============================
# SOCKET HANDLERS
# ============================
@socketio.on("message")
def handle_message(data):
    """
    Handle incoming chat messages and broadcast to the party.

    Args (data dict):
        custom_class: optional string (e.g., 'system')
        party_code: str
        name: str
        avatar: list[int]
        message: str

    Emits:
        message: dict containing custom_class, name, avatar, and message
    """
    custom_class = data.get("custom_class")
    party_code = data.get("party_code")
    name = data.get("name")
    avatar = data.get("avatar")
    message = data.get("message")

    value = {
        "custom_class": custom_class,
        "name": name,
        "avatar": avatar,
        "message": message
    }
    socketio.emit("message", value, room=party_code)


@socketio.on("join_party_room")
def handle_join_party(data):
    """
    Join a player to a Socket.IO room for the party.

    Args (data dict):
        party_code: str
        player_id: str
        player_name: str (optional)
        host_name: str (optional)

    Stores:
        SOCKET_MAP[sid] = (party_code, player_id)

    Emits:
        message: system message for join/create
        update_players: refreshed player list
    """
    party_code = data.get("party_code")
    player_id = data.get("player_id")
    player_name = data.get("player_name") or data.get("host_name")

    if party_code in PARTIES and player_id in PARTIES[party_code]["Players"]:
        join_room(party_code)
        SOCKET_MAP[request.sid] = (party_code, player_id)
        update_plrList(data)

        msg_type = "create" if "host_name" in data else "join"
        value = {
            "custom_class": msg_type,
            "name": player_name,
            "avatar": PARTIES[party_code]["Players"][player_id]["avatar"],
            "message": f"{player_name} {'สร้าง' if msg_type=='create' else 'เข้าร่วม'}ปาร์ตี้!"
        }
        socketio.emit("message", value, room=party_code)


@socketio.on("leave_party_room")
def handle_leave_party(data):
    """
    Explicitly remove a player from a Socket.IO room.

    Args (data dict):
        party_code: str
        player_name: str

    Emits:
        message: system message for leaving
        update_players: refreshed player list
    """
    party_code = data.get("party_code")
    player_name = data.get("player_name")

    if party_code in PARTIES:
        value = {
            "custom_class": "left",
            "name": player_name,
            "avatar": [1, 1, 1, 1],
            "message": f"{player_name} ออกจากปาร์ตี้!"
        }
        socketio.emit("message", value, room=party_code)
        leave_room(party_code)
        update_plrList(data)

@socketio.on("disconnect")
def handle_disconnect():
    """
    Handle socket disconnection (tab closed or network lost).

    Removes the player from the party if present, reassigns host if necessary,
    and emits updated player list to remaining players.
    """
    sid = request.sid
    if sid not in SOCKET_MAP:
        return

    party_code, player_id = SOCKET_MAP.pop(sid)

    if party_code in PARTIES and player_id in PARTIES[party_code]["Players"]:
        player_name = PARTIES[party_code]["Players"][player_id]["name"]
        del PARTIES[party_code]["Players"][player_id]

        # --- Reassign host or delete party if empty ---
        if PARTIES[party_code]["Host"] == player_id:
            if PARTIES[party_code]["Players"]:
                PARTIES[party_code]["Host"] = next(iter(PARTIES[party_code]["Players"]))
            else:
                del PARTIES[party_code]
                return

        value = {
            "custom_class": "left",
            "name": player_name,
            "avatar": [1, 1, 1, 1],
            "message": f"{player_name} ออกจากปาร์ตี้!"
        }
        socketio.emit("message", value, room=party_code)
        update_plrList({"party_code": party_code})

# ============================
# MAIN
# ============================
if __name__ == "__main__":
    socketio.run(app, debug=True)
