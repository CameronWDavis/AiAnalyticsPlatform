from flask import Flask
from .extensions import db
from config import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)

    from app.routes.users import users_bp
    app.register_blueprint(users_bp, url_prefix="/api")

    from app.routes.prompts import prompt_bp
    app.register_blueprint(prompt_bp, url_prefix="/api")
    
    return app