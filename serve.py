#!/usr/bin/env python3
"""Servidor de desarrollo: como http.server pero sin caché.

El navegador guarda index.html y los .js de forma agresiva, y al editar el
juego se siguen viendo versiones antiguas. Aquí se desactiva la caché para
que cada recarga muestre siempre el código actual.

    python3 serve.py [puerto]     (por defecto 8080)
"""

import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # una línea por petición, sin ruido de fechas
        sys.stderr.write("%s\n" % (fmt % args))


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    print(f"Tabernas con Historia → http://localhost:{port}")
    ThreadingHTTPServer(("0.0.0.0", port), NoCacheHandler).serve_forever()
