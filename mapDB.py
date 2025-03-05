import os
from notion_client import Client
import graphviz
from dotenv import load_dotenv
import json

load_dotenv()

# 1. Inicializar el cliente de Notion API
NOTION_TOKEN = os.environ.get("NOTION_TOKEN")
notion = Client(auth=NOTION_TOKEN)

# 2. Función para obtener todas las bases de datos
def obtener_bases_de_datos():
    bases_de_datos = []
    results = notion.search(
        filter={"property": "object", "value": "database"},
    ).get("results")

    for database in results:
        bases_de_datos.append(database)
    return bases_de_datos

# 3. Función para extraer relaciones entre bases de datos
def extraer_relaciones(bases_de_datos):
    relaciones = {}
    for database in bases_de_datos:
        database_id = database["id"]
        database_title = database["title"][0]["plain_text"] if database["title"] else "Sin título"

        relaciones[database_title] = {}

        database_schema = notion.databases.retrieve(database_id)
        for propiedad_nombre, propiedad_config in database_schema["properties"].items():
            if propiedad_config["type"] == "relation":
                related_database_id = propiedad_config["relation"]["database_id"]
                related_database_info = notion.databases.retrieve(related_database_id)
                related_database_title = related_database_info["title"][0]["plain_text"] if related_database_info["title"] else "Sin título"

                relaciones[database_title][propiedad_nombre] = related_database_title
    return relaciones

# 4. Generar grafo con Graphviz
def generar_grafo_relaciones(relaciones, nombre_archivo="mapa_bases_de_datos"):
    dot = graphviz.Digraph(comment='Mapa de Relaciones de Bases de Datos Notion', graph_attr={'rankdir': 'LR'})

    for database_nombre in relaciones:
        dot.node(database_nombre, database_nombre)

    for database_nombre, relaciones_db in relaciones.items():
        for propiedad_nombre, database_relacionada_nombre in relaciones_db.items():
            dot.edge(database_nombre, database_relacionada_nombre, label=propiedad_nombre)

    dot.render(nombre_archivo, format='png', view=False)
    print(f"Mapa de relaciones guardado en: {nombre_archivo}.png")

# 5. Generar archivo de texto con relaciones
def generar_texto_relaciones(relaciones, nombre_archivo_texto="relaciones_bases_de_datos"):
    texto_relaciones = "Relaciones entre Bases de Datos de Notion:\n\n"
    for database_nombre, relaciones_db in relaciones.items():
        texto_relaciones += f"Base de datos: {database_nombre}\n"
        if relaciones_db:
            for propiedad_nombre, database_relacionada_nombre in relaciones_db.items():
                texto_relaciones += f"  - {propiedad_nombre} --> {database_relacionada_nombre}\n"
        else:
            texto_relaciones += "  (No tiene relaciones con otras bases de datos)\n"
        texto_relaciones += "\n"

    with open(f"{nombre_archivo_texto}.txt", "w", encoding="utf-8") as archivo_texto:
        archivo_texto.write(texto_relaciones)
    print(f"Información de relaciones guardada en: {nombre_archivo_texto}.txt")

    return texto_relaciones

# 6. Generar código Mermaid y guardarlo en un archivo
def generar_mermaid(relaciones, nombre_archivo_mermaid="relaciones_mermaid"):
    mermaid_code = """```mermaid
graph LR
"""

    for database_nombre, relaciones_db in relaciones.items():
        if not relaciones_db:
            mermaid_code += f"    {database_nombre.replace(' ', '_')}[{database_nombre}]\n"
        else:
            for propiedad_nombre, database_relacionada_nombre in relaciones_db.items():
                mermaid_code += f"    {database_nombre.replace(' ', '_')} -- {propiedad_nombre} --> {database_relacionada_nombre.replace(' ', '_')}\n"

    mermaid_code += "```"

    with open(f"{nombre_archivo_mermaid}.md", "w", encoding="utf-8") as archivo_mermaid:
        archivo_mermaid.write(mermaid_code)
    print(f"Código Mermaid guardado en: {nombre_archivo_mermaid}.md")

def generar_json_jerarquico(relaciones, nombre_archivo_json="relaciones_data"):
    data_jerarquica = {"name": "Bases de Datos Notion", "children": []}

    bases_de_datos_procesadas = set()  # Para rastrear bases de datos ya procesadas en grupos

    for database_nombre, relaciones_db in relaciones.items():
        if database_nombre in bases_de_datos_procesadas: # Si ya se procesó en un grupo, saltar
            continue

        bases_de_datos_relacionadas_grupo = [database_nombre] # Empezar un nuevo grupo con la base de datos actual
        bases_de_datos_procesadas.add(database_nombre)

        nodos_grupo_json = [] # Lista para los nodos JSON del grupo

        # Añadir la base de datos principal del grupo
        nodo_db_principal_json = {"name": database_nombre, "children": []}
        if relaciones_db:
            for propiedad_nombre, database_relacionada_nombre in relaciones_db.items():
                nodo_db_principal_json["children"].append({
                    "name": propiedad_nombre,
                    "relationTo": database_relacionada_nombre
                })
        nodos_grupo_json.append(nodo_db_principal_json)


        # Buscar y añadir bases de datos relacionadas DIRECTAMENTE (nivel 1 de relación)
        for propiedad_nombre, database_relacionada_nombre in relaciones_db.items():
            if database_relacionada_nombre in relaciones and database_relacionada_nombre not in bases_de_datos_procesadas: # Si la relacionada también está en 'relaciones' y NO procesada
                bases_de_datos_relacionadas_grupo.append(database_relacionada_nombre)
                bases_de_datos_procesadas.add(database_relacionada_nombre)

                nodo_db_relacionada_json = {"name": database_relacionada_nombre, "children": []}
                relaciones_db_relacionada = relaciones.get(database_relacionada_nombre, {}) # Obtener relaciones de la base de datos relacionada
                if relaciones_db_relacionada:
                    for prop_rel_nombre, db_rel_relacionada_nombre in relaciones_db_relacionada.items():
                        nodo_db_relacionada_json["children"].append({
                            "name": prop_rel_nombre,
                            "relationTo": db_rel_relacionada_nombre
                        })
                nodos_grupo_json.append(nodo_db_relacionada_json)


        if len(bases_de_datos_relacionadas_grupo) > 1: # Si hay más de una base de datos en el grupo, crear nodo de grupo
            nombre_grupo = f"BD relacionadas: {database_nombre} y otras" # Nombre del grupo (puedes ajustarlo)
            nodo_grupo_principal = {"name": nombre_grupo, "children": nodos_grupo_json}
            data_jerarquica["children"].append(nodo_grupo_principal)
        else: # Si no hay otras bases de datos relacionadas DIRECTAMENTE en este primer nivel, añadir la base de datos individualmente
            data_jerarquica["children"].append(nodo_db_principal_json) # Añadir directamente a 'Bases de Datos Notion'

    import json
    with open(nombre_archivo_json + ".json", 'w') as file:
        json.dump([data_jerarquica], file, indent=4) # Convertir a lista para que sea un array JSON
    print(f"Archivo '{nombre_archivo_json}.json' generado exitosamente.")

# 7. Programa principal
if __name__ == "__main__":
    bases_de_datos = obtener_bases_de_datos()
    if not bases_de_datos:
        print("No se encontraron bases de datos accesibles para la integración.")
    else:
        relaciones = extraer_relaciones(bases_de_datos)
        if relaciones:
            generar_grafo_relaciones(relaciones)
            texto_relaciones = generar_texto_relaciones(relaciones)
            generar_mermaid(relaciones)  # Genera el código Mermaid
            data_json = generar_json_jerarquico(relaciones) # Genera el JSON y lo guarda en archivo
            print("\n--- Información de relaciones en formato texto: ---\n")
            print(texto_relaciones)
            print(json.dumps(data_json, indent=4, ensure_ascii=False)) # Imprime el JSON en consola para verificar
            print("Mapa de relaciones de bases de datos creado exitosamente.")
        else:
            print("No se encontraron relaciones entre las bases de datos accesibles.")
