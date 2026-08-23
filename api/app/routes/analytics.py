from datetime import date, timedelta
from flask import Blueprint, jsonify, request
from sqlalchemy import func
from app.extensions import db
from app.models.usage_log import UsageLog 

bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")

@bp.route("/summary", methods=["GET"])
def get_summary():
    days = request.args.get("days", 30, type=int)
    
    start_date = date.today() - timedelta(days=days)

    total_tokens = db.session.query(func.sum(UsageLog.total_tokens)) \
        .filter(UsageLog.date >= start_date) \
        .scalar() or 0

    total_cost = db.session.query(func.sum(UsageLog.estimated_cost_usd)) \
        .filter(UsageLog.date >= start_date) \
        .scalar() or 0

    total_requests = db.session.query(func.sum(UsageLog.request_count)) \
        .filter(UsageLog.date >= start_date) \
        .scalar() or 0

    active_users = db.session.query(func.count(func.distinct(UsageLog.user_id))) \
        .filter(UsageLog.date >= start_date) \
        .scalar() or 0

    return jsonify({
        "time_window_days": days,
        "total_tokens": total_tokens,
        "estimated_cost_usd": total_cost,
        "request_count": total_requests,
        "active_users": active_users
    })