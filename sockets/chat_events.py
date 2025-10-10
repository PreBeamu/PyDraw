"""Chat and guess socket events"""
from flask import request
from utils.text import remove_diacritic
from sockets.party_events import update_inGamePlayers

def register_chat_events(socketio, parties, socket_map):
    """Register chat and guess socket events."""
    
    @socketio.on("message")
    def handle_message(data):
        """Handle incoming chat messages."""
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

    @socketio.on("guess")
    def handle_guess(data):
        """Handle incoming guesses."""
        custom_class = data.get("custom_class")
        party_code = data.get("party_code")
        name = data.get("name")
        message = data.get("message")

        sid = request.sid
        if sid not in socket_map:
            return

        _, player_id = socket_map[sid]
        player_data = parties[party_code]["Players"][player_id]

        isInt = isinstance(player_data["GuessesLeft"], int)
        if parties[party_code]["Gamerules"]["GuessLimit"] > 0 and isInt:
            if player_data["GuessesLeft"] <= 0:
                return
            player_data["GuessesLeft"] -= 1

        picked_word = parties[party_code]["Values"]["PickedTopic"]
        guess_clean = remove_diacritic(message).strip()
        word_clean = remove_diacritic(picked_word).strip()
        
        if guess_clean == word_clean:
            custom_class = "correct"
            timeleft = parties[party_code]["Values"]["TimesLeft"]
            answered = parties[party_code]["Values"]["Guessed"]
            timemax = parties[party_code]["Gamerules"]["DrawTime"]
            parties[party_code]["Values"]["Guessed"] += 1

            # Base time bonus: up to 1000 points, scaled by time left
            # Order bonus: first correct guess gets +450, then diminishing
            time_bonus = int((timeleft / (timemax*60)) * 1000)
            order_bonus = int(450 / (answered + 1))

            # Guesser
            score = time_bonus + order_bonus
            parties[party_code]["Players"][player_id]["Scores"] += score
            # Drawer
            drawer_id = parties[party_code]["Values"]["CurrentDrawer"]
            parties[party_code]["Players"][drawer_id]["Scores"] += int(score/2)

            message = f"{name} ทายถูกแล้ว! (+{score})"
            update_inGamePlayers(
                socketio, parties, {"party_code": party_code}, True,
                parties[party_code]["Values"]["CurrentDrawer"]
            )

        # --- ปื้ด Zone ---
        # If close (check if the word is about 85% of the answer) จับ guess_clean มาเทียบ word_clean
        # guess_clean : คำที่ผู้เล่นทายมา
        # word_clean : คำตอบของหัวข้อที่คนวาดกำลังวาด
        # guess_clean กับ word_clean ถูกลบสระออกแล้วทั้งคู่ เช่น โทรศัพท์ -> โทรศพท
        # [REMOVE COMMENT AFTER] >> custom_class = "almost"
        # [REMOVE COMMENT AFTER] >> message = f'"{message}" เกือบจะถูกแล้ว!' # will show something like "โทรศัพ" เกือบจะถูกแล้ว!

        value = {
            "guesses_left": player_data["GuessesLeft"],
            "custom_class": custom_class,
            "playerId": player_id,
            "name": name,
            "message": message,
        }
        
        if custom_class == "almost":
            socketio.emit("guess", value, to=sid)
        else:
            socketio.emit("guess", value, room=party_code)