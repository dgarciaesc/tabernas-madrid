#!/usr/bin/env python3
"""Genera los audios narrados del juego con ElevenLabs (voz "Javier").

Uso:
    python3 backend/generate_audio.py

Lee la clave de ELEVENLABS_API_KEY desde .env (en la raíz del repo, ya
en .gitignore). Lee el manifiesto de textos a narrar desde
backend/audio_manifest.json (clave "idClip.lang" -> texto) y genera un
mp3 por clip en audio/<idClip>.<lang>.mp3, saltando los que ya existan
para poder relanzar el script sin repetir gasto de cuota si se corta a
medias.
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(ROOT, ".env")
MANIFEST_PATH = os.path.join(ROOT, "backend", "audio_manifest.json")
OUT_DIR = os.path.join(ROOT, "audio")

VOICE_ID = "PToUZ7lhIUiz1SP94rGo"  # "Javier"
MODEL_ID = "eleven_multilingual_v2"


def load_env():
    env = {}
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    return env


def tts(api_key, text, out_path, retries=3):
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    body = json.dumps({
        "text": text,
        "model_id": MODEL_ID,
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
    }).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("xi-api-key", api_key)
    req.add_header("Content-Type", "application/json")

    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=60) as res:
                data = res.read()
                with open(out_path, "wb") as f:
                    f.write(data)
                return True, len(data)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            if e.code == 429 and attempt < retries:
                wait = 5 * attempt
                print(f"    rate limited, esperando {wait}s…")
                time.sleep(wait)
                continue
            return False, f"HTTP {e.code}: {err_body[:300]}"
        except Exception as e:
            if attempt < retries:
                time.sleep(3)
                continue
            return False, str(e)
    return False, "agotados los reintentos"


def main():
    env = load_env()
    api_key = env.get("ELEVENLABS_API_KEY") or os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        print("ERROR: no se encontró ELEVENLABS_API_KEY en .env")
        sys.exit(1)

    if not os.path.exists(MANIFEST_PATH):
        print(f"ERROR: no existe {MANIFEST_PATH}")
        sys.exit(1)

    with open(MANIFEST_PATH, encoding="utf-8") as f:
        manifest = json.load(f)

    os.makedirs(OUT_DIR, exist_ok=True)

    total = len(manifest)
    total_chars = sum(len(t) for t in manifest.values())
    print(f"{total} clips a generar, {total_chars} caracteres en total.\n")

    done, skipped, failed = 0, 0, []
    chars_used = 0

    for i, (clip_id, text) in enumerate(sorted(manifest.items()), 1):
        out_path = os.path.join(OUT_DIR, f"{clip_id}.mp3")
        if os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
            skipped += 1
            print(f"[{i}/{total}] {clip_id}: ya existe, salto")
            continue

        print(f"[{i}/{total}] {clip_id}: generando ({len(text)} car.)…", end=" ")
        ok, info = tts(api_key, text, out_path)
        if ok:
            done += 1
            chars_used += len(text)
            print(f"OK ({info} bytes)")
        else:
            failed.append((clip_id, info))
            print(f"FALLO: {info}")
        time.sleep(0.3)  # cortesía con la API

    print(f"\nHecho. Generados: {done} · Ya existían: {skipped} · Fallidos: {len(failed)}")
    print(f"Caracteres consumidos en esta pasada: {chars_used}")
    if failed:
        print("\nFallidos:")
        for clip_id, info in failed:
            print(f"  - {clip_id}: {info}")
        sys.exit(1)


if __name__ == "__main__":
    main()
