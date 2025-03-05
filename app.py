from flask import Flask, render_template, jsonify
from mapDB import extraer_relaciones  # Tu función para obtener datos de Notion
import os

app = Flask(__name__, static_folder="static")

@app.route("/")
def index():
    return render_template("index.html")  # Renderiza el HTML

if __name__ == "__main__":
    app.run()
