"""Game timer and countdown logic"""
import random
from gevent import sleep
from utils.helpers import get_sid_from_player
from utils.text import mask_topic
from sockets.party_events import update_plrList


def countdown(socketio, parties, party_code, seconds, tick=0.1, break_check=None, drawer_id=None):
    """Generic countdown timer."""
    while seconds > 0:
        party = parties.get(party_code)
        if not party:
            return "stopped"

        if drawer_id and drawer_id not in party["Players"]:
            return "left"

        socketio.emit(
            "update_timer",
            {"time": f"{seconds//60:02}:{seconds%60:02}"},
            room=party_code,
        )
        socketio.emit("timer_anim", room=party_code)
        party["Values"]["TimesLeft"] = seconds

        for _ in range(int(1 / tick)):
            sleep(tick)
            party = parties.get(party_code)
            if not party:
                return "stopped"
            if drawer_id and drawer_id not in party["Players"]:
                return "left"
            if break_check and break_check():
                return "break"
        seconds -= 1
    return "done"


def plr_left(socketio, parties, party_code):
    """Handle player leaving during game."""
    socketio.emit(
        "canvas_alert",
        {"icon": ".tag", "msg": "ผู้เล่นออกจากเกมแล้ว"},
        room=party_code,
    )
    countdown(socketio, parties, party_code, 3)


def run_game(socketio, parties, socket_map, party_code):
    """Run the game loop for all rounds and players."""
    if party_code not in parties:
        return

    party = parties.get(party_code)
    if not party:
        return

    num_rounds = int(party["Gamerules"]["Rounds"])
    for _ in range(num_rounds):
        plrs = party["Players"].copy()
        for drawer_id, plrs in plrs.items():
            party = parties.get(party_code)
            if not party:
                return
            if drawer_id not in party["Players"]:
                continue

            party["Values"]["CurrentDrawer"] = drawer_id
            party["Values"]["PickedTopic"] = None
            party["Values"]["Guessed"] = 0
            update_plrList(socketio, parties, {"party_code": party_code})

            topics_list = party["Values"].get("Topics", [])
            num_to_pick = min(3, len(topics_list))
            picked_topics = (
                random.sample(topics_list, num_to_pick) if topics_list else []
            )

            while len(picked_topics) < 3 and picked_topics:
                picked_topics.append(picked_topics[-1])

            drawer_sid = get_sid_from_player(socket_map, party_code, drawer_id)

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
                socketio.emit("topics_pick_all", room=party_code, skip_sid=drawer_sid)

            finished = countdown(
                socketio, parties, party_code, 10,
                break_check=lambda: parties.get(party_code, {}).get("Values", {}).get("PickedTopic"),
                drawer_id=drawer_id,
            )

            if finished == "left":
                plr_left(socketio, parties, party_code)
                continue
            if finished == "stopped":
                return

            party = parties.get(party_code)
            if not party:
                return
            topic = party["Values"]["PickedTopic"]

            if not topic:
                socketio.emit(
                    "canvas_alert",
                    {"icon": ".alert", "msg": "ผู้เล่นไม่ได้เลือกหัวข้อ"},
                    room=party_code,
                )
                countdown(socketio, parties, party_code, 5)
                continue

            socketio.emit(
                "pick_done",
                {"drawer_id": drawer_id, "hint": mask_topic(topic)},
                room=party_code,
            )

            draw_finished = countdown(
                socketio, parties, party_code,
                party["Gamerules"]["DrawTime"] * 60,
                break_check=lambda: (
                    parties.get(party_code, {}).get("Values", {}).get("Guessed", 0)
                    >= (len(parties.get(party_code, {}).get("Players", [])) - 1)
                    and len(parties.get(party_code, {}).get("Players", [])) > 1
                ),
                drawer_id=drawer_id,
            )
            if draw_finished == "left":
                plr_left(socketio, parties, party_code)
                continue
            if draw_finished == "stopped":
                return

            value = {
                "answer": topic,
                "allguess": party["Values"]["Guessed"] >= (len(party["Players"])-1)
            }
            socketio.emit("show_answer", value, room=party_code)
            countdown(socketio, parties, party_code, 5)
            socketio.emit("update_timer", {"time": "99:99"}, room=party_code)

    parties[party_code]["Values"]["State"] = "Ended"
    value = {}
    socketio.emit("game_ended", value, room=party_code)