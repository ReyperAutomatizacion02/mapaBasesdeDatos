from flask import Flask, render_template, jsonify
from mapDB import extraer_relaciones  # Tu función para obtener datos de Notion

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")  # Renderiza el HTML

@app.route("/api/datos")
def datos():
    datos = extraer_relaciones()  # Llama a tu función para obtener datos de Notion
    return jsonify(datos)  # Devuelve los datos en formato JSON

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))  # Render asigna el puerto automáticamente
    app.run(host="0.0.0.0", port=port, debug=True)
