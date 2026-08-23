from flask import Blueprint, jsonify 
from app.models.category import Category



category_bp = Blueprint("categories", __name__)

@category_bp.route("/categories", methods=["GET"])
def show_category():
    categories = Category.query.all()
    return jsonify([category.to_dict() for category in categories])