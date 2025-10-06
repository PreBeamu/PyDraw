"""HTTP routes"""
from flask import render_template, request, jsonify
from models.template import create_player, create_party
from utils.helpers import gen_code


def register_routes(app, parties, socket_map):
    """Register all HTTP routes."""
    
    @app.route("/")
    def home():
        """Render the main index page."""
        return render_template("index.html")

    @app.route("/create_party", methods=["POST"])
    def create_party_route():
        """Create a new party and assign the creator as the host."""
        player_name = request.json.get("name")
        player_avatar = request.json.get("avatar")
        party_code = gen_code(parties)
        player_id, player_data = create_player(player_name, player_avatar)

        new_party = create_party(player_id, player_data)
        parties[party_code] = new_party

        return jsonify({
            "party_code": party_code,
            "player_id": player_id,
        })

    @app.route("/join_party", methods=["POST"])
    def join_party_route():
        """Add a player to an existing party."""
        party_code = request.json.get("party_code")
        player_name = request.json.get("name")
        player_avatar = request.json.get("avatar")

        if party_code not in parties:
            return jsonify({"error": "Party not found"}), 404
        if parties[party_code]["Values"]["State"] != "Waiting":
            return jsonify({"error": "Game already started"}), 404

        player_id, player_data = create_player(player_name, player_avatar)
        parties[party_code]["Players"][player_id] = player_data

        return jsonify({
            "player_id": player_id,
            "party_state": parties[party_code]["Values"]["State"]
        })