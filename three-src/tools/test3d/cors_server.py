# テスト用：別のサイト扱いの画像を配る（ACAO=1 なら CORS を許可する）
import sys, http.server, functools
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        if ACAO: self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()
    def log_message(self, *a): pass
port = int(sys.argv[1]); ACAO = sys.argv[2] == '1'
http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(H, directory='/home/claude/mochipoyo-trade-quest')).serve_forever()
