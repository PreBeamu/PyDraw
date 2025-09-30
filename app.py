"""Start the app using py app.py"""
from gevent import monkey, spawn_later, sleep
from flask import Flask, jsonify, render_template, request
from flask_socketio import SocketIO, join_room, leave_room
from string import ascii_uppercase, digits
from copy import deepcopy
import random
import uuid
import unicodedata
import re

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
SOCKET_MAP = {}
TOPICS = [
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
# TEMPLATES
# ============================
PARTY_TEMPLATE = {
    "Host": None,
    "Players": {},
    "Gamerules": {
        "Rounds": 1,
        "DrawTime": 2,
        "GuessLimit": 0,
        "OnlyCustomTopics": False,
    },
    "Values": {
        "State": "Waiting",
        "Topics": TOPICS.copy(),
        "CurrentDrawer": None,
        "PickedTopic": None,
        "RoundsLeft": 0,
        "TimeLeft": 0,
    },
}
PLAYER_TEMPLATE = {
    "name": None,
    "avatar": [0, 0, 0, 0],
    "score": 0,
    "guessed": 0,
}

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
        party_code = "".join(random.choices(ascii_uppercase + digits, k=5))
        if party_code not in PARTIES:
            return party_code


def clamp(value, min_val, max_val):
    """Clamp a number between min_val and max_val."""
    return max(min_val, min(max_val, value))


def make_player(name, avatar_items):
    """
    Create a new player dictionary with a unique ID.

    Args:
        name (str): The player's display name.
        avatar_items (list): List of 4 integers representing avatar parts.

    Returns:
        tuple: (player_id (str), player_data (dict))
    """
    player_id = uuid.uuid4().hex[:30]
    player_data = deepcopy(PLAYER_TEMPLATE)

    player_data["name"] = name
    player_data["avatar"] = avatar_items

    return player_id, player_data


def get_sid_from_player(party_code, player_id):
    """Return sid of specific player using player_id."""
    for sid, (p_code, p_id) in SOCKET_MAP.items():
        if p_code == party_code and p_id == player_id:
            return sid
    return None


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
                "players": PARTIES[party_code]["Players"],
            }
            socketio.emit("update_players", value, room=party_code)
        else:
            update_inGamePlayers(
                data, True, PARTIES[party_code]["Values"]["CurrentDrawer"]
            )


def update_inGamePlayers(data, reset, drawer):
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
            "drawer_id": drawer,
            "players": PARTIES[party_code]["Players"],
        }
        socketio.emit("update_players", value, room=party_code)


def mask_topic(topic):
    """
    Convert a topic into underscores and remove diacritics.
    Spaces are preserved as spaces, other characters become underscores.
    """
    # Remove diacritics
    no_diacritics = "".join(
        ch
        for ch in unicodedata.normalize("NFD", topic)
        if unicodedata.category(ch) != "Mn"
    )

    # Replace every non-space character with "_"
    masked = re.sub(r"[^\s]", "_", no_diacritics)

    return masked

def remove_diacritic(text):
    """Remove diacritic marks from text."""
    normalized = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


# ============================
# RUN GAME
# ============================
def countdown(party_code, seconds, tick=0.1, break_check=None, drawer_id=None):
    """
    Generic countdown timer.
    Returns:
        "done"    - countdown finished normally
        "stopped" - party ended or break_check triggered
        "left"    - drawer left mid countdown
        "break"   - loop got stopped by break_check
    """
    while seconds > 0:
        party = PARTIES.get(party_code)
        if not party:
            return "stopped"

        # If drawer left -> stop countdown immediately
        if drawer_id and drawer_id not in party["Players"]:
            return "left"

        # Emit timer
        socketio.emit(
            "update_timer",
            {"time": f"{seconds//60:02}:{seconds%60:02}"},
            room=party_code,
        )
        socketio.emit("timer_anim", room=party_code)

        # Tick down
        for _ in range(int(1 / tick)):
            sleep(tick)
            party = PARTIES.get(party_code)
            if not party:
                return "stopped"
            if drawer_id and drawer_id not in party["Players"]:
                return "left"
            if break_check and break_check():
                return "break"
        seconds -= 1
    return "done"


def plr_left(party_code):
    socketio.emit(
        "canvas_alert",
        {
            "icon": ".tag",
            "msg": "ผู้เล่นออกจากเกมแล้ว"
        },
        room=party_code,
    )
    countdown(party_code, 3)


def run_game(party_code):
    """
    Run the game loop for all rounds and players.
    Handles topic picking, skipping if no choice, and drawing timer.
    """
    if party_code not in PARTIES:
        return

    def timer_task():
        party = PARTIES.get(party_code)
        if not party:
            return

        num_rounds = int(party["Gamerules"]["Rounds"])
        for _ in range(num_rounds):
            plrs = party["Players"].copy()
            for drawer_id, player in plrs.items():
                party = PARTIES.get(party_code)
                if not party:
                    return
                if drawer_id not in party["Players"]:
                    continue
                
                # --- Set values ---
                party["Values"]["CurrentDrawer"] = drawer_id
                party["Values"]["PickedTopic"] = None
                update_plrList({"party_code": party_code})

                # --- Random Topics ---
                topics_list = party["Values"].get("Topics", [])
                num_to_pick = min(3, len(topics_list))
                picked_topics = (
                    random.sample(topics_list, num_to_pick) if topics_list else []
                )

                while len(picked_topics) < 3 and picked_topics:
                    picked_topics.append(picked_topics[-1])

                drawer_sid = get_sid_from_player(party_code, drawer_id)

                if drawer_sid:
                    socketio.emit(
                        "topics_pick_drawer",
                        {
                            "topic1": picked_topics[0] if len(picked_topics) > 0 else None,
                            "topic2": picked_topics[1] if len(picked_topics) > 1 else None,
                            "topic3": picked_topics[2] if len(picked_topics) > 2 else None,
                        },
                        to=drawer_sid
                    )
                    socketio.emit(
                        "topics_pick_all",
                        room=party_code,
                        skip_sid=drawer_sid
                    )

                # --- Topic Pick Countdown ---
                finished = countdown(
                    party_code,
                    10,
                    break_check=lambda: PARTIES.get(party_code, {}).get("Values", {}).get("PickedTopic"),
                    drawer_id=drawer_id,
                )

                if finished == "left":
                    plr_left(party_code)
                    continue
                if finished == "stopped":
                    return

                party = PARTIES.get(party_code)
                if not party:
                    return
                topic = party["Values"]["PickedTopic"]

                if not topic:
                    socketio.emit(
                        "canvas_alert",
                        {
                            "icon": ".alert",
                            "msg": "ผู้เล่นไม่ได้เลือกหัวข้อ"
                        },
                        room=party_code,
                    )
                    countdown(party_code, 5)
                    continue

                # --- Announce chosen topic ---
                socketio.emit(
                    "pick_done",
                    {
                        "drawer_id": drawer_id,
                        "hint": mask_topic(topic)
                    },
                    room=party_code,
                )

                # --- Draw Phase ---
                draw_finished = countdown(
                    party_code,
                    party["Gamerules"]["DrawTime"] * 60,
                    drawer_id=drawer_id,
                )
                if draw_finished == "left":
                    plr_left(party_code)
                    continue
                if draw_finished == "stopped":
                    return

                # --- Show Answer Phase ---
                socketio.emit("show_answer", {"answer": topic}, room=party_code)
                countdown(party_code, 10)

                # Final emit for clarity
                socketio.emit("update_timer", {"time": "99:99"}, room=party_code)

        print("Game Ended")

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

    new_party = deepcopy(PARTY_TEMPLATE)
    new_party["Host"] = player_id
    new_party["Players"] = {player_id: player_data}
    new_party["Values"]["CurrentDrawer"] = player_id

    PARTIES[party_code] = new_party

    return jsonify(
        {
            "party_code": party_code,
            "player_id": player_id,
        }
    )


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
    if PARTIES[party_code]["Values"]["State"] != "Waiting":
        return jsonify({"error": "Game already started"}), 404

    player_id, player_data = make_player(player_name, player_avatar)
    PARTIES[party_code]["Players"][player_id] = player_data

    return jsonify(
        {"player_id": player_id, "party_state": PARTIES[party_code]["Values"]["State"]}
    )


# ============================
# SOCKET HANDLERS
# ============================
@socketio.on("join_party_room")
def handle_join_party(data):
    """
    Join a player to a Socket.IO room for the party.

    Args (data dict):
        party_code: str
        player_id: str
        player_name: str (optional)s
        host_name: str (optional)

    Stores:
        SOCKET_MAP[sid] = (party_code, player_id)

    Emits:
        message: system message for join/create
        update_players: refreshed player list
    """
    party_code = data.get("party_code")
    player_id = data.get("player_id")
    type = data.get("join") or data.get("create")
    player_name = PARTIES[party_code]["Players"][player_id]["name"]

    if party_code not in PARTIES:
        return
    if player_id not in PARTIES[party_code]["Players"]:
        return

    for _, (code, pid) in SOCKET_MAP.items():
        if pid == player_id and code == party_code:
            return

    join_room(party_code)
    SOCKET_MAP[request.sid] = (party_code, player_id)
    update_plrList(data)

    msg_type = "create" if "create" in data else "join"
    value = {
        "custom_class": msg_type,
        "name": player_name,
        "avatar": PARTIES[party_code]["Players"][player_id]["avatar"],
        "message": f"{player_name} {'สร้าง' if msg_type=='create' else 'เข้าร่วม'}ปาร์ตี้!",
    }
    socketio.emit("message", value, room=party_code)
    socketio.emit("guess", value, room=party_code)


@socketio.on("leave_party_room")
def handle_leave_party():
    """
    Explicitly remove a player from a Socket.IO room.
    Returns a dict like {'success': True} or {'success': False, 'error': "..."}
    """
    sid = request.sid

    # --- Validate session ---
    if sid not in SOCKET_MAP:
        return {"success": False, "error": "Invalid session!"}

    party_code, player_id = SOCKET_MAP[sid]

    if party_code not in PARTIES:
        return {"success": False, "error": "Party not found!"}
    if player_id not in PARTIES[party_code]["Players"]:
        return {"success": False, "error": "Player not in party!"}

    player_name = PARTIES[party_code]["Players"][player_id]["name"]
    del PARTIES[party_code]["Players"][player_id]
    SOCKET_MAP.pop(sid, None)

    # --- Conditions ---
    if not PARTIES[party_code]["Players"]:
        del PARTIES[party_code]
    else:
        if PARTIES[party_code]["Host"] == player_id:
            PARTIES[party_code]["Host"] = next(iter(PARTIES[party_code]["Players"]))
        update_plrList({"party_code": party_code})

    # --- Notify all remaining clients ---
    value = {
        "custom_class": "left",
        "name": player_name,
        "avatar": [1, 1, 1, 1],
        "message": f"{player_name} ออกจากปาร์ตี้!",
    }
    socketio.emit("message", value, room=party_code)
    socketio.emit("guess", value, room=party_code)

    # --- Leave socket room ---
    leave_room(party_code)

    return {"success": True}


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
            "message": f"{player_name} ออกจากปาร์ตี้!",
        }
        socketio.emit("message", value, room=party_code)
        socketio.emit("guess", value, room=party_code)
        update_plrList({"party_code": party_code})


@socketio.on("start_game")
def handle_start_game(data):
    """
    Host starts the game with provided options.
    Validates using request.sid from SOCKET_MAP instead of trusting player_id.
    """
    sid = request.sid
    if sid not in SOCKET_MAP:
        return {"success": False, "error": "Invalid session!"}

    party_code, player_id = SOCKET_MAP[sid]

    if party_code not in PARTIES:
        return {"success": False, "error": "Party not found!"}
    if player_id not in PARTIES[party_code]["Players"]:
        return {"success": False, "error": "Player not in party!"}
    if PARTIES[party_code]["Host"] != player_id:
        return {"success": False, "error": "Only host can start the game!"}
    if PARTIES[party_code]["Values"]["State"] != "Waiting":
        return {"success": False, "error": "Invalid Party state!"}
    
    rounds = int(data.get("roundsCount", 1))
    draw_time = int(data.get("drawTime", 1))
    guess_limit = int(data.get("guessLimit", 0))

    # --- Apply Gamerules ---
    PARTIES[party_code]["Values"]["State"] = "InGame"
    PARTIES[party_code]["Gamerules"]["Rounds"] = clamp(rounds, 1, 10)
    PARTIES[party_code]["Gamerules"]["DrawTime"] = clamp(draw_time, 1, 15)
    PARTIES[party_code]["Gamerules"]["GuessLimit"] = clamp(guess_limit, 0, 20)
    PARTIES[party_code]["Gamerules"]["OnlyCustomTopics"] = data.get("onlyCustom", False)

    customTopics = data.get("customTopics", "")
    if customTopics:
        topics = [w.strip() for w in customTopics.split(",") if w.strip()]
        if data.get("onlyCustom") and topics:
            PARTIES[party_code]["Values"]["Topics"] = topics
        else:
            PARTIES[party_code]["Values"]["Topics"].extend(topics)

    # --- Notify clients ---
    socketio.emit("start_game", room=party_code)
    update_inGamePlayers(
        {"party_code": party_code}, True, PARTIES[party_code]["Values"]["CurrentDrawer"]
    )
    spawn_later(3, run_game, party_code)

    return {"success": True}


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
        "message": message,
    }
    socketio.emit("message", value, room=party_code)


@socketio.on("pick_topic")
def handle_topic(data):
    """
    Handle incoming topic the drawer picked and set to Values.

    Args (data dict):
        picked_topic: str
    """

    sid = request.sid
    if sid not in SOCKET_MAP:
        return

    party_code, player_id = SOCKET_MAP[sid]
    picked_topic = data.get("picked_topic")

    if party_code not in PARTIES:
        return
    if player_id != PARTIES[party_code]["Values"]["CurrentDrawer"]:
        return

    if picked_topic in PARTIES[party_code]["Values"]["Topics"]:
        PARTIES[party_code]["Values"]["PickedTopic"] = picked_topic


@socketio.on("guess")
def handle_message(data):
    """
    Handle incoming guesses and broadcast to the game.

    Args (data dict):
        party_code: str
        name: str

        message: str

    Emits:
        message: dict containing custom_class, name, avatar, and message
    """
    custom_class = data.get("custom_class")
    party_code = data.get("party_code")
    name = data.get("name")
    message = data.get("message")

    sid = request.sid
    if sid not in SOCKET_MAP:
        return

    _, player_id = SOCKET_MAP[sid]

    # Check answer
    picked_word = PARTIES[party_code]["Values"]["PickedTopic"]
    guess_clean = remove_diacritic(message).strip()
    word_clean = remove_diacritic(picked_word).strip()
    if guess_clean == word_clean:
        custom_class = "correct"
        message = f"{name} ทายถูกแล้ว! (+100)"
        # Cool scoring logic here..
    
    # If close (check if the word is about 85% of the answer) จับ guess_clean มาเทียบ word_clean
    # guess_clean : คำที่ผู้เล่นทายมา
    # word_clean : คำตอบของหัวข้อที่คนวาดกำลังวาด
    # guess_clean กับ word_clean ถูกลบสระออกแล้วทั้งคู่ เช่น โทรศัพท์ -> โทรศพท
    custom_class = "almost"
    message = f'"{message}" เกือบจะถูกแล้ว!' # will show something like "โทรศัพ" เกือบจะถูกแล้ว!

    value = {
        "custom_class": custom_class,
        "player_id": player_id,
        "name": name,
        "message": message,
    }
    if custom_class == "almost":
        socketio.emit("guess", value, to=sid)
    else:
        socketio.emit("guess", value, room=party_code)


# ============================
# MAIN
# ============================
if __name__ == "__main__":
    socketio.run(app, debug=True)
