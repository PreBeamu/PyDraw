"""start the app use py app.py"""
from gevent import monkey
monkey.patch_all()

from flask import Flask, render_template, request, session, jsonify, url_for,redirect
from flask_socketio import join_room, leave_room, emit, SocketIO

# -------------------------------
# App Setup
# -------------------------------
app = Flask(__name__)
app.config["SECRET_KEY"] = "S3cr3tK3y"
socketio = SocketIO(app, async_mode="gevent", cors_allowed_origins="*")

# -------------------------------
# Routes
# -------------------------------
@app.route("/")
def home():
    """render index.html"""
    return render_template("index.html")

@socketio.on("message")
def handle_message(data):
    text = {"name": "สมมุติ", "message": data.get("msg")}
    emit("message", text, broadcast=True)

# -------------------------------
# Main
# -------------------------------
if __name__ == "__main__":
    socketio.run(app, debug=True)
