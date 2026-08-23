from flask import Blueprint, jsonify 
from app.models.prompt import Prompt



prompt_bp = Blueprint("prompts", __name__)

@prompt_bp.route("/prompts", methods=["GET"])
def show_prompt():
    #Prompts = Prompt.query.order_by(Prompt.id.desc()).limit(20).all()
    Prompts = Prompt.query.all()
    return jsonify([prompt.to_dict() for prompt in Prompts])