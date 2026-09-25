#!/usr/bin/env python3
"""
update-games-readme.py
Escanea el directorio games/ y actualiza automáticamente el catálogo de juegos en README.md.
Se ejecuta en cada merge a main y en el pipeline de CI/CD.
"""

import os
import json
import re
import sys

def main():
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.."))
    games_dir = os.path.join(repo_root, "games")
    readme_path = os.path.join(repo_root, "README.md")

    if not os.path.exists(games_dir) or not os.path.exists(readme_path):
        print(f"❌ Error: No se encontró games/ o README.md en {repo_root}")
        sys.exit(1)

    games = []
    
    # Listar subdirectorios en games/ ordenados alfabéticamente
    entries = sorted(os.listdir(games_dir))
    for entry in entries:
        full_path = os.path.join(games_dir, entry)
        if not os.path.isdir(full_path):
            continue
        
        game_html = os.path.join(full_path, "game", "index.html")
        if not os.path.exists(game_html):
            continue
        
        slug = entry
        meta_file = os.path.join(full_path, "game.json")
        
        if os.path.exists(meta_file):
            try:
                with open(meta_file, "r", encoding="utf-8") as f:
                    meta = json.load(f)
            except Exception as e:
                print(f"⚠️ Advertencia al leer {meta_file}: {e}")
                meta = {}
        else:
            meta = {}
        
        name = meta.get("name", slug.capitalize())
        icon = meta.get("icon", "🕹️")
        genre = meta.get("genre", "Arcade Retro")
        desc = meta.get("description", "Minijuego interactivo retro con control móvil en tiempo real.")
        controls = meta.get("controls", "Control táctil móvil / Teclado")
        
        games.append({
            "slug": slug,
            "name": name,
            "icon": icon,
            "genre": genre,
            "desc": desc,
            "controls": controls,
            "prod_screen": f"https://myplayad.com/{slug}/",
            "prod_control": f"https://controllers.myplayad.com/{slug}/",
            "dev_screen": f"https://dev.myplayad.com/{slug}/",
            "dev_control": f"https://dev-controllers.myplayad.com/{slug}/"
        })

    print(f"🎮 Juegos detectados ({len(games)}): {', '.join([g['slug'] for g in games])}")

    # Generar tabla y contenido Markdown
    lines = []
    lines.append(f"Actualmente la rama principal (`main`) cuenta con **{len(games)} minijuegos** interactivos adaptados al estándar **Pure Arcade** (pantalla completa, gabinete centrado, bezel de 440px y QR local offline):\n")
    
    lines.append("| Juego | Género | Mecánica & Descripción | Controles Móviles / Teclado | Producción | Staging (Dev) |")
    lines.append("| :--- | :--- | :--- | :--- | :--- | :--- |")
    
    for g in games:
        prod_links = f"🖥️ [Pantalla]({g['prod_screen']})<br>📱 [Control]({g['prod_control']})"
        dev_links = f"🖥️ [Pantalla]({g['dev_screen']})<br>📱 [Control]({g['dev_control']})"
        lines.append(f"| **{g['icon']} {g['name']}**<br>`{g['slug']}` | {g['genre']} | {g['desc']} | {g['controls']} | {prod_links} | {dev_links} |")
    
    content_to_insert = "\n".join(lines)

    start_tag = "<!-- GAMES_CATALOG_START -->"
    end_tag = "<!-- GAMES_CATALOG_END -->"

    with open(readme_path, "r", encoding="utf-8") as f:
        readme_content = f.read()

    pattern = re.compile(rf"{re.escape(start_tag)}[\s\S]*?{re.escape(end_tag)}")
    replacement = f"{start_tag}\n{content_to_insert}\n{end_tag}"

    if pattern.search(readme_content):
        new_readme = pattern.sub(replacement, readme_content)
    else:
        # Si las etiquetas no existen, insertamos la sección después de la descripción inicial
        section = f"\n## 🕹️ Catálogo de Minijuegos Disponibles en Producción\n\n{replacement}\n"
        # Buscar el final de la sección de componentes
        marker = "3. **`games/` (Static HTML/JS):**"
        idx = readme_content.find(marker)
        if idx != -1:
            end_of_line = readme_content.find("\n---", idx)
            if end_of_line != -1:
                insert_pos = end_of_line + 4
                new_readme = readme_content[:insert_pos] + section + readme_content[insert_pos:]
            else:
                new_readme = readme_content + section
        else:
            new_readme = readme_content + section

    # Actualizar también la lista entre paréntesis en el párrafo introductorio
    names_str = ", ".join([g["name"] for g in games])
    new_readme = re.sub(r'minijuegos retro \([^)]*\)', f'minijuegos retro ({names_str})', new_readme)

    if new_readme != readme_content:
        with open(readme_path, "w", encoding="utf-8") as f:
            f.write(new_readme)
        print("✅ README.md actualizado exitosamente con la lista de juegos.")
    else:
        print("ℹ️ README.md ya está actualizado con la lista actual de juegos.")

if __name__ == "__main__":
    main()

