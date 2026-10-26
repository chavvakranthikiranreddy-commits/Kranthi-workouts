"""Downloads the free exercise photo library (public domain, github.com/yuhonas/free-exercise-db)
and puts smaller copies in www/ex/ so they are bundled inside the APK. Run by the Build APK workflow."""
import os, subprocess, sys
from PIL import Image

COMMIT = 'f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5'
SRC = '/tmp/free-exercise-db'
OUT = os.path.join(os.path.dirname(__file__), '..', 'www', 'ex')

if not os.path.isdir(SRC):
    subprocess.run(['git', 'clone', '--quiet', 'https://github.com/yuhonas/free-exercise-db.git', SRC], check=True)
    subprocess.run(['git', '-C', SRC, 'checkout', '--quiet', COMMIT], check=True)

n = 0
for ex in sorted(os.listdir(os.path.join(SRC, 'exercises'))):
    folder = os.path.join(SRC, 'exercises', ex)
    if not os.path.isdir(folder):
        continue
    os.makedirs(os.path.join(OUT, ex), exist_ok=True)
    for f in sorted(os.listdir(folder)):
        if not f.endswith('.jpg'):
            continue
        dst = os.path.join(OUT, ex, f)
        if os.path.exists(dst):
            continue
        im = Image.open(os.path.join(folder, f)).convert('RGB')
        im.thumbnail((600, 600))
        im.save(dst, 'JPEG', quality=70, optimize=True, progressive=True)
        n += 1
print(f'{n} exercise photos ready in www/ex')
sys.exit(0)
