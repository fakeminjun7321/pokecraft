# 🗿 Meshy image-to-3D 파이프라인 — img/poke/<id>.png → models/poke/<id>.glb
#
# 사용법:
#   1. https://www.meshy.ai 가입 → API 키 발급 (Settings → API Keys)
#   2. 터미널에서:  MESHY_API_KEY=msy_xxxx python3 tools/meshy_gen.py 6 25 130
#      (도감 번호를 인자로 — 안 주면 img/poke의 전부)
#   3. 끝나면 js/meshlist.js가 자동 갱신되고 게임이 GLB를 우선 사용
#
# 비용 참고: Meshy 무료 크레딧으로 몇 개 시험 → 퀄리티 확인 후 결제 결정 권장
import json, os, sys, time, base64, urllib.request

KEY = os.environ.get('MESHY_API_KEY', '')
if not KEY:
    sys.exit('MESHY_API_KEY 환경변수를 설정하세요 (예: MESHY_API_KEY=msy_xxx python3 tools/meshy_gen.py 6)')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG, OUT = os.path.join(ROOT, 'img/poke'), os.path.join(ROOT, 'models/poke')
os.makedirs(OUT, exist_ok=True)

def api(path, body=None):
    req = urllib.request.Request('https://api.meshy.ai' + path,
        data=json.dumps(body).encode() if body else None,
        headers={'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json'},
        method='POST' if body else 'GET')
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)

def gen(sp):
    img_path = f'{IMG}/{sp}.png'
    if not os.path.exists(img_path):
        return f'{sp}: 이미지 없음'
    if os.path.exists(f'{OUT}/{sp}.glb'):
        return f'{sp}: 이미 있음 (건너뜀)'
    b64 = base64.b64encode(open(img_path, 'rb').read()).decode()
    task = api('/openapi/v1/image-to-3d', {
        'image_url': 'data:image/png;base64,' + b64,
        'enable_pbr': False,
        'should_remesh': True,
        'should_texture': True,
        'target_polycount': 8000,   # 웹게임용 경량
    })
    tid = task.get('result')
    if not tid:
        return f'{sp}: 작업 생성 실패 {task}'
    print(f'{sp}: 생성 중 (task {tid[:8]}...)', flush=True)
    for _ in range(120):  # 최대 ~20분
        time.sleep(10)
        st = api(f'/openapi/v1/image-to-3d/{tid}')
        if st.get('status') == 'SUCCEEDED':
            url = st['model_urls']['glb']
            urllib.request.urlretrieve(url, f'{OUT}/{sp}.glb')
            return f'{sp}: ✅ 완료 ({os.path.getsize(f"{OUT}/{sp}.glb")//1024}KB)'
        if st.get('status') in ('FAILED', 'CANCELED'):
            return f'{sp}: ❌ 실패 {st.get("task_error", {})}'
    return f'{sp}: 시간 초과'

ids = [int(a) for a in sys.argv[1:]] or sorted(
    int(f[:-4]) for f in os.listdir(IMG) if f.endswith('.png'))
for sp in ids:
    print(gen(sp), flush=True)

# js/meshlist.js 갱신
done = sorted(int(f[:-4]) for f in os.listdir(OUT) if f.endswith('.glb'))
open(os.path.join(ROOT, 'js/meshlist.js'), 'w').write(
    "'use strict';\nconst MESH_IDS = " + json.dumps(done) + ";\n")
print('meshlist.js 갱신:', len(done), '종 — index.html ?v= 토큰 올리고 커밋하세요')
