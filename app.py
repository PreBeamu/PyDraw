"""start the app use py app.py"""
from gevent import monkey
from flask import Flask, render_template
from flask_socketio import SocketIO
monkey.patch_all()
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

# -------------------------------
# Main
# -------------------------------
if __name__ == "__main__":
    socketio.run(app, debug=True)
