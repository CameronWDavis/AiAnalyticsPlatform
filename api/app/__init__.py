from flask import Flask
from .extensions import db, cors
from config import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    cors.init_app(app, origins=["http://localhost:5173"])

    from app.routes.users import users_bp
    app.register_blueprint(users_bp, url_prefix="/api")

    from app.routes.prompts import prompt_bp
    app.register_blueprint(prompt_bp, url_prefix="/api")

    from app.routes.usage import usage_bp
    app.register_blueprint(usage_bp, url_prefix="/api")

    from app.routes.categories import category_bp
    app.register_blueprint(category_bp, url_prefix="/api")

    from app.routes.analytics import bp as analytics_bp
    app.register_blueprint(analytics_bp)
    
    return app