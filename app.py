"""Main Flask application entry point"""
from gevent import monkey
monkey.patch_all()

from flask import Flask
from flask_socketio import SocketIO

from config import SECRET_KEY, SOCKETIO_ASYNC_MODE, CORS_ALLOWED_ORIGINS
from routes.main import register_routes
from sockets.party import register_party_events
from sockets.game import register_game_events
from sockets.chat import register_chat_events

# ============================
# APP SETUP
# ============================
app = Flask(__name__)
app.config["SECRET_KEY"] = SECRET_KEY
socketio = SocketIO(app, async_mode=SOCKETIO_ASYNC_MODE, cors_allowed_origins=CORS_ALLOWED_ORIGINS)

# Global state
PARTIES = {}
SOCKET_MAP = {}

# ============================
# REGISTER ROUTES & EVENTS
# ============================
register_routes(app, PARTIES, SOCKET_MAP)
register_party_events(socketio, PARTIES, SOCKET_MAP)
register_game_events(socketio, PARTIES, SOCKET_MAP)
register_chat_events(socketio, PARTIES, SOCKET_MAP)

# ============================
# MAIN
# ============================
if __name__ == "__main__":
    socketio.run(app, debug=True)