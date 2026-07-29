# 视频素材清单

页面已经引用了下面所有路径。**已就位**的部分直接播放；**待补**的部分会自动显示
"Video coming soon" 占位卡（浏览器加载失败时由 `bridgevla_plus.js` 换上），
把 `.mp4` 放到对应路径即可生效，**不需要改 HTML**。

| 分区 | 状态 | 数量 |
| --- | --- | --- |
| 真机 · DOBOT CR5A（7 任务 × 5 设置） | ✅ 已就位 | 35（全满） |
| 真机 · Franka 基础任务 | ⬜ 待补 | 6 |
| 真机 · Franka 泛化设置 | ⬜ 待补 | 6 |
| 仿真 · RLBench | ⬜ 待补 | 4 |
| 仿真 · RMBench | ⬜ 待补 | 9 |
| 仿真 · MemoryBench | ⬜ 待补 | 3 |

编码建议：

```bash
ffmpeg -i raw.mp4 -vf "scale=1280:-2" -c:v libx264 -preset slow -crf 26 \
       -pix_fmt yuv420p -an -movflags +faststart out.mp4
```

DOBOT 那批还额外做了旋转和裁剪（相机横装），见下。

---

## ✅ 已就位：DOBOT CR5A 真机 demo

由页面上的 **demo 浏览器**（`#dobot-explorer`）驱动：选任务 → 选设置 → 播放对应
rollout。只有当前选中的那一个视频会被下载。

**素材来源**：`/DATA/disk1/zyz/projects/BridgeVLA_sam/data/selected_demo`

处理链（`tools/build_dobot_demos.sh`，三步都在同一个 filter 里）：

1. **转码**：原片是 1920×1080 / 30 fps 的 **mpeg4（MPEG-4 Part 2）**，浏览器基本
   不支持，必须转 H.264（不只是压体积）。
2. **旋转**：相机横装，原片里桌面是躺着的 —— 逆时针 90°（`transpose=2`）后
   机械臂从上方伸下、抽屉柜和置物架正立，才是正常视角。
3. **裁剪**：旋转后画面下方约 30% 全是空桌面和桌沿外的杂物。保留上方
   **70.3125%**（1920 × 0.703125 = 1350），35 个组合的全时段都核对过，
   不会切到任何机械臂或物体。

最终 **720×900（4:5 竖版）**，原始约 1.5 GB → **38.7 MB**。

```
static/videos/real/dobot/<task>/<setting>.mp4      35 个，共 38.7 MB，720×900
static/images/dobot_posters/<task>__<setting>.jpg  35 张 poster（视频首帧）
static/images/dobot_keyframes/<task>/k1..k5.jpg    35 张关键帧，480×600
```

要改旋转方向或裁剪比例，改脚本顶部的 `ROTATE` / `KEEP` 后重跑；页面上
`.demo-video` 和 `.keyframe-strip img` 的 `aspect-ratio` 要跟着一起改。

`<task>` ∈ `cover_blocks` `press_button` `swap_eggplant` `drawer_upper`
`drawer_lower` `shelf_upper` `shelf_lower`
`<setting>` ∈ `basic` `distractor` `background` `height` `lighting`

| slug | 论文中的任务 | 指令 | 组 |
| --- | --- | --- | --- |
| `cover_blocks` | Cover Blocks | "Put lids on the blocks, then uncover the blue block" | 记忆依赖 · 遮挡 |
| `press_button` | Press Button | "Press the blue button three times, then press the yellow button" | 记忆依赖 · 计数 |
| `swap_eggplant` | Swap Eggplant | "Swap the two eggplants on the plate" | 记忆依赖 · 重排 |
| `drawer_upper` | Put in Drawer (upper) | "Put the watermelon in the upper drawer" | 记忆无关 |
| `drawer_lower` | Put in Drawer (lower) | "Put the watermelon in the lower drawer" | 记忆无关 |
| `shelf_upper` | Put on Shelf (upper) | "Put the soda water in the top shelf" | 记忆无关 |
| `shelf_lower` | Put on Shelf (lower) | "Put the red bull in the bottom shelf" | 记忆无关 |

7 × 5 = **35 个组合全部有录像**，页面上没有置灰项。

### 关于 episode 的一点说明

- **`drawer_upper` × `lighting`** 一度缺失（源里 upper / lower drawer 的 lighting
  曾指向同一个 episode 名 `ep012_0725_214446`，导出时重名），现已由补录的
  **`ep018_0728_210633`** 补齐。
- **`press_button` × `height`** 源里有两个 episode（`ep007` 和 `ep022`），页面只用
  **`ep007`**（`height.mp4`）。`ep022` 已从素材和转码脚本中排除（脚本里的
  `EXCLUDE_RE`）。

多试验的显示能力仍然保留：某个 (task, setting) 若要放第二段录像，把它命名为
`<setting>_alt.mp4`（poster 同理 `<task>__<setting>_alt.jpg`），再在
`#dobot-demo-data` 的 `"alts"` 里写上 `{"<task>": ["<setting>"]}`，视频右上角就会
出现 **Trial 1 / Trial 2** 切换。目前 `"alts"` 是空的。

### 增改任务 / 设置

全部由 `index.html` 里的 `<script type="application/json" id="dobot-demo-data">`
驱动 —— 加一个任务就在 `tasks` 里加一项，字段：`id`（= 目录名）、`group`
（`memory` / `free`）、`label`、`sub`、`family`、`instruction`、`why`、
`scores`（`{setting: [BridgeVLA++, BridgeVLA, SAM2Act+]}`，10 次试验的成功次数）、
`keyframes`（step 序号数组）、可选 `missing`。

### 重新生成

视频、poster、关键帧都由同一个脚本产出：

```bash
bash tools/build_dobot_demos.sh
# 可调：SRC_ROOT=… CRF=26 ROTATE=transpose=2 KEEP=0.703125 WIDTH=720 JOBS=4
```

脚本末尾会打印各任务的 `keyframes` step 序号；若与 `#dobot-demo-data` 里的不一致，
把新的抄回去。

---

## ⬜ 待补

### 仿真 · RLBench（4）

| 路径 | 显示为 |
| --- | --- |
| `static/videos/sim/rlbench/sort_shape/trial_1.mp4` | Sort Shape — 55.2% → 72.0% |
| `static/videos/sim/rlbench/place_cups/trial_1.mp4` | Place Cups — 58.4% → 76.8% |
| `static/videos/sim/rlbench/stack_cups/trial_1.mp4` | Stack Cups — 98.4% |
| `static/videos/sim/rlbench/insert_peg/trial_1.mp4` | Insert Peg — 99.2% |

### 仿真 · RMBench（9，双臂，每任务一个）

| 路径 | 显示为 |
| --- | --- |
| `static/videos/sim/rmbench/observe_and_pick_up/trial_1.mp4` | Observe & Pick Up — 81% *(M(1))* |
| `static/videos/sim/rmbench/rearrange_blocks/trial_1.mp4` | Rearrange Blocks — 100% *(M(1))* |
| `static/videos/sim/rmbench/put_back_block/trial_1.mp4` | Put Back Block — 100% *(M(1))* |
| `static/videos/sim/rmbench/swap_blocks/trial_1.mp4` | Swap Blocks — 99% *(M(1))* |
| `static/videos/sim/rmbench/swap_t/trial_1.mp4` | Swap T — 96% *(M(1))* |
| `static/videos/sim/rmbench/battery_try/trial_1.mp4` | Battery Try — 96% *(M(n))* |
| `static/videos/sim/rmbench/blocks_ranking_try/trial_1.mp4` | Blocks Ranking Try — 100% *(M(n))* |
| `static/videos/sim/rmbench/cover_blocks/trial_1.mp4` | Cover Blocks — 99% *(M(n))* |
| `static/videos/sim/rmbench/press_button/trial_1.mp4` | Press Button — 93% *(M(n))* |

### 仿真 · MemoryBench（3）

| 路径 | 显示为 |
| --- | --- |
| `static/videos/sim/memorybench/reopen_drawer/trial_1.mp4` | Reopen Drawer — 100.0% |
| `static/videos/sim/memorybench/put_block_back/trial_1.mp4` | Put Block Back — 99.8% |
| `static/videos/sim/memorybench/rearrange_block/trial_1.mp4` | Rearrange Block — 99.2% |

### 真机 · Franka 基础设置（6）

| 路径 | 指令 |
| --- | --- |
| `static/videos/real/franka_basic/redbull_top_shelf/trial_1.mp4` | "Put the RedBull can in the top shelf" |
| `static/videos/real/franka_basic/coke_top_shelf/trial_1.mp4` | "Put the coke can in the top shelf" |
| `static/videos/real/franka_basic/red_block_blue_plate/trial_1.mp4` | "Place the red block in the blue plate" |
| `static/videos/real/franka_basic/press_sanitizer/trial_1.mp4` | "Press sanitizer" |
| `static/videos/real/franka_basic/zebra_upper_drawer/trial_1.mp4` | "Put the zebra in the upper drawer" |
| `static/videos/real/franka_basic/giraffe_lower_drawer/trial_1.mp4` | "Put the giraffe in the lower drawer" |

### 真机 · Franka 泛化设置（6）

| 路径 | 设置 |
| --- | --- |
| `static/videos/real/franka_generalization/distractor/trial_1.mp4` | Distractor |
| `static/videos/real/franka_generalization/lighting/trial_1.mp4` | Lighting |
| `static/videos/real/franka_generalization/background/trial_1.mp4` | Background |
| `static/videos/real/franka_generalization/height/trial_1.mp4` | Height |
| `static/videos/real/franka_generalization/combination/trial_1.mp4` | Combination（未一起演示过的物体–技能组合） |
| `static/videos/real/franka_generalization/category/trial_1.mp4` | Category（机器人数据中未出现的物体类别） |

> Franka 那 12 个如果也按"任务 × 设置"组织，可以直接复用 DOBOT 的 demo 浏览器组件：
> 复制 `#dobot-explorer` 那一段，换一份 JSON 数据和三个 `data-*-root` 路径即可。

---

## 往网格里加更多 trial

每张卡片是 `.media-card` 包一个 `.media-slot`。复制一张卡、改 `<source src>` 就行：

```html
<div class="media-card">
  <div class="media-slot">
    <video muted loop playsinline controls preload="metadata">
      <source src="static/videos/…/trial_2.mp4" type="video/mp4">
    </video>
  </div>
  <p class="media-caption">Trial 2</p>
</div>
```

要做成轮播就照 `#bench-gallery` 的结构：`.carousel` 外壳 + `.frame` +
每项一个 `.slide`（第一个带 `is-active`）+ 两个 `.carousel-btn` +
一个空的 `<div class="dots"></div>`（圆点由脚本生成）。
