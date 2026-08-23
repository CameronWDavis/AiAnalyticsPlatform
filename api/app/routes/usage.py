from flask import Blueprint, jsonify 
from app.models.usage_log import UsageLog



usage_bp = Blueprint("usage_log", __name__)

@usage_bp.route("/usage_log", methods=["GET"])
def show_logs():
    usage_logs = UsageLog.query.all()
    return jsonify([usage_log.to_dict() for usage_log in usage_logs])