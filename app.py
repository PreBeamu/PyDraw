from gevent import monkey
monkey.patch_all()

from flask import Flask, render_template
from flask_socketio import SocketIO

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
    return render_template("index.html")

# -------------------------------
# Main
# -------------------------------
if __name__ == "__main__":
    socketio.run(app, debug=True)
