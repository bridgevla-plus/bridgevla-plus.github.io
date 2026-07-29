#!/usr/bin/env bash
# 重新生成 DOBOT 真机 demo 的网页素材：
#   1) 视频转码 -> static/videos/real/dobot/<task>/<setting>.mp4
#   2) 首帧 poster -> static/images/dobot_posters/<task>__<setting>.jpg
#   3) 关键帧序列 -> static/images/dobot_keyframes/<task>/k1..k5.jpg
#
# 原片是 1920x1080 / 30fps / mpeg4（MPEG-4 Part 2）。浏览器基本不支持这个编码，
# 所以转 H.264 是必需的，不只是为了压体积（1.4 GB -> 43.6 MB）。
#
#   bash tools/build_dobot_demos.sh
set -uo pipefail

SRC_ROOT=${SRC_ROOT:-/DATA/disk1/zyz/projects/BridgeVLA_sam/data/selected_demo}
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
SRC="$SRC_ROOT/videos"
DST="$HERE/static/videos/real/dobot"
POST="$HERE/static/images/dobot_posters"
KF="$HERE/static/images/dobot_keyframes"

CRF=${CRF:-26}
JOBS=${JOBS:-4}

# 相机是横装的：原片 1920x1080 里桌面是躺着的，逆时针 90° 才是正常视角
# （机械臂从上方伸下、抽屉柜/置物架正立）。ffmpeg transpose=2 = 逆时针 90°。
ROTATE=${ROTATE:-transpose=2}
# 旋转后画面下方约 30% 是空桌面和桌沿外的杂物；34 个组合全时段核对过，
# 保留上方 70.3125% 不会切到任何机械臂或物体。1920 × 0.703125 = 1350。
KEEP=${KEEP:-0.703125}
WIDTH=${WIDTH:-720}          # 旋转裁剪后的目标宽度（1080x1350 -> 720x900，4:5）
VF="${ROTATE},crop=iw:ih*${KEEP}:0:0,scale=${WIDTH}:-2"

# 源目录名 -> 页面 slug（与 index.html 里 #dobot-demo-data 的 task id 一致）
declare -A SLUG=(
  [put-lids-on-the-blocks-then-uncover-the-blue-block]=cover_blocks
  [press-the-blue-button-three-times-then-press-the-yellow-button]=press_button
  [swap-the-two-eggplants-on-the-plate]=swap_eggplant
  [put-the-watermelon-in-the-upper-drawer]=drawer_upper
  [put-the-watermelon-in-the-lower-drawer]=drawer_lower
  [put-the-soda-water-in-the-top-shelf]=shelf_upper
  [put-the-red-bull-on-the-bottom-shelf]=shelf_lower
)

command -v ffmpeg >/dev/null || { echo "需要 ffmpeg"; exit 1; }
[ -d "$SRC" ] || { echo "找不到源目录 $SRC"; exit 1; }

mkdir -p "$POST" "$KF"
for s in "${SLUG[@]}"; do mkdir -p "$DST/$s" "$KF/$s"; done

# ---------- 1 & 2：视频 + poster --------------------------------------------
# 并行执行时不能靠 -e 判重（文件还没生成），所以在规划阶段用关联数组占位。
# 源目录里 Press Button × Height 录了两个 episode；页面只用 ep007。
EXCLUDE_RE=${EXCLUDE_RE:-'height__press-the-blue-button-three-times-then-press-the-yellow-button__ep022_'}

JOBFILE=$(mktemp)
declare -A TAKEN=()
for f in "$SRC"/*.mp4; do
  base=$(basename "$f" .mp4)
  if [ -n "$EXCLUDE_RE" ] && [[ "$base" =~ $EXCLUDE_RE ]]; then
    echo "  skip (excluded) $base"; continue
  fi
  setting="${base%%__*}"; rest="${base#*__}"; task="${rest%%__*}"
  slug="${SLUG[$task]:-}"
  [ -n "$slug" ] || { echo "SKIP 未知任务: $task"; continue; }
  name="$setting"; key="$slug/$setting"
  # 同一 (task, setting) 有第二个 episode 时存为 *_alt（页面上显示 Trial 1/2）
  if [ -n "${TAKEN[$key]:-}" ]; then name="${setting}_alt"; key="$slug/$name"; fi
  TAKEN[$key]=1
  printf '%s\t%s\t%s\n' "$f" "$DST/$slug/$name.mp4" "$POST/${slug}__${name}.jpg" >> "$JOBFILE"
done

echo "转码 $(wc -l < "$JOBFILE") 个视频（${VF}, CRF ${CRF}, ${JOBS} 路并行）…"
encode_one() {
  IFS=$'\t' read -r in out poster <<< "$1"
  ffmpeg -y -v error -i "$in" -vf "${VF}" -c:v libx264 -preset slow -crf "${CRF}" \
    -pix_fmt yuv420p -an -movflags +faststart "$out" || { echo "FAIL enc $(basename "$in")"; return 1; }
  ffmpeg -y -v error -i "$out" -frames:v 1 -q:v 4 "$poster" || { echo "FAIL poster $(basename "$out")"; return 1; }
  echo "  ok  $(basename "$(dirname "$out")")/$(basename "$out")"
}
export -f encode_one; export VF CRF
xargs -P "$JOBS" -d '\n' -I{} bash -c 'encode_one "$@"' _ {} < "$JOBFILE"
rm -f "$JOBFILE"

# ---------- 3：关键帧序列（basic 设置的 step 帧） ----------------------------
echo "抽取关键帧…"
SRC_ROOT="$SRC_ROOT" KF="$KF" VF_KF="${ROTATE},crop=iw:ih*${KEEP}:0:0,scale=480:-2" python3 - <<'PY'
import os, re, glob, subprocess
SRC = os.environ['SRC_ROOT']; KF = os.environ['KF']; VF = os.environ['VF_KF']
SLUG = {
 'put-lids-on-the-blocks-then-uncover-the-blue-block':'cover_blocks',
 'press-the-blue-button-three-times-then-press-the-yellow-button':'press_button',
 'swap-the-two-eggplants-on-the-plate':'swap_eggplant',
 'put-the-watermelon-in-the-upper-drawer':'drawer_upper',
 'put-the-watermelon-in-the-lower-drawer':'drawer_lower',
 'put-the-soda-water-in-the-top-shelf':'shelf_upper',
 'put-the-red-bull-on-the-bottom-shelf':'shelf_lower',
}
for task, slug in SLUG.items():
    frames = sorted(glob.glob(f'{SRC}/{task}/basic/*/step_*/frames/*.jpg'),
                    key=lambda p: (int(re.search(r'step_(\d+)', p).group(1)),
                                   int(re.search(r'frame_(\d+)', p).group(1))))
    steps = []
    for i, f in enumerate(frames, 1):
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', f,
                        '-vf', VF, '-q:v', '5',
                        os.path.join(KF, slug, f'k{i}.jpg')], check=True)
        steps.append(int(re.search(r'step_(\d+)', f).group(1)))
    # index.html 的 "keyframes" 字段就是这串 step 序号
    print(f'  {slug:15s} {len(frames)} 帧  keyframes={steps}')
PY

echo
echo "=== 结果 ==="
find "$DST" -name '*.mp4' -printf '%s\n' | awk '{s+=$1} END{printf "视频 %d 个, %.1f MB\n", NR, s/1048576}'
find "$POST" -name '*.jpg' | wc -l | xargs echo "poster:"
find "$KF" -name '*.jpg' | wc -l | xargs echo "关键帧:"
echo
echo "若 keyframes 序号有变化，记得同步 index.html 中 #dobot-demo-data 的 keyframes 字段。"
