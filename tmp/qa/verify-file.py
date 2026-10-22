from pathlib import Path
import base64, hashlib, re
html = Path('controlling-study.html').read_text(encoding='utf-8')
embedded = re.search(r"const PDF_BASE64='([^']+)'", html).group(1)
original = Path(r'C:/Users/USER/Downloads/5. Controlling (1).pdf').read_bytes()
assert hashlib.sha256(base64.b64decode(embedded)).digest() == hashlib.sha256(original).digest()
assert '__EMBEDDED_PDF__' not in html
assert not re.search(r'(?:src|href)=["\']https?://', html)
assert '<script src=' not in html and '@import' not in html
Path('tmp/qa/app-check.js').write_text(re.search(r'<script>(.*?)</script>',html,re.S).group(1),encoding='utf-8')
print('PASS: embedded PDF is byte-for-byte identical; no external asset dependencies; one HTML file,',len(html.encode('utf-8')),'bytes.')
