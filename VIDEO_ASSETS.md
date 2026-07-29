# 视频素材清单

页面已经引用了下面所有路径。**已就位**的部分直接播放；**待补**的部分会自动显示
"Video coming soon" 占位卡（浏览器加载失败时由 `bridgevla_plus.js` 换上），
把 `.mp4` 放到对应路径即可生效，**不需要改 HTML**。

| 分区 | 状态 | 数量 |
| --- | --- | --- |
| 真机 · DOBOT CR5A（7 任务 × 5 设置） | ✅ 已就位 | 35（全满） |
| 真机 · Franka 基础任务（选择式浏览器） | ⬜ 待补 | 13 |
| 真机 · Franka 泛化设置（选择式浏览器，每设置 3 段） | ✅ 已就位 | 18（全满） |
| 真机 · Franka 失败案例（Category） | ✅ 已就位 | 3（全满） |
| 仿真 · RLBench（18 任务） | ✅ 13 / ⬜ 5 | 18 |
| 仿真 · RMBench（9 任务） | ✅ 3 / ⬜ 6 | 9 |
| 仿真 · MemoryBench（3 任务） | ✅ 已就位 | 3（全满） |

仿真视频分别位于「Simulation」的对应基准面板里（RMBench / RLBench / MemoryBench
选项卡）；Franka 视频由真机区的 **Franka 浏览器**（`#franka-explorer`）驱动，
未就位的选项显示占位卡和期望路径。面板处于隐藏状态不影响占位检测。

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

## ✅ 已就位：仿真 rollout（19 段）

由 `tools/build_sim_demos.py` 从训练日志里挑出来：

```bash
python3 tools/build_sim_demos.py            # 重跑；--dry-run 只看会选哪些
```

规则：

1. **只用主模型。** run 名里含 `no_mem` / `no_spatial_mem` / `no_temporal_mem` 的
   是消融实验，绝不能当成 BridgeVLA++ 的 rollout 展示，脚本直接跳过。
2. **只用成功的 episode**，三种日志的成功标记方式各不相同：
   RLBench 看文件名里的 `_success_`；RMBench 看视频同目录的 `_result.txt`；
   MemoryBench 看目录名 `<episode>_SR1.0`。
3. 同一任务有多个成功 episode 时，优先完整运动录像（≥60 帧），并在其中取时长最接近
   25 s 的那个（有些 RMBench episode 长达 80 s，页面上没人看得完）。
4. 统一转 H.264 + `yuv420p` + faststart。**RMBench 的 `press_button` /
   `observe_and_pickup` 日志里只存了关键帧**（4–26 帧、不到 3 秒），拉伸到约 8 秒播放，
   看起来是关键帧走查而不是闪一下。
5. 顺带生成封面（15% 处那一帧）到 `static/images/sim_posters/<bench>__<slug>.jpg`。

**每段视频的来源 episode、帧数、时长都记在 `static/videos/sim/MANIFEST.json`。**

分辨率就是日志里渲染的原始尺寸：RLBench / MemoryBench 是 **320×180**，
RMBench 是 **320×240**。所以 RMBench 的卡片用 4:3 舞台（`.media-slot.ratio-43`）——
按 16:9 裁会把桌面上方的记忆提示牌（数字卡）切掉。三个基准合计约 6 MB。

| 目录 | 已就位的 slug |
| --- | --- |
| `static/videos/sim/rlbench/<slug>/trial_1.mp4` | `close_jar` `drag_stick` `meat_off_grill` `open_drawer` `place_cups` `place_wine` `push_buttons` `put_in_cupboard` `put_in_drawer` `put_in_safe` `screw_bulb` `slide_block` `sort_shape` |
| `static/videos/sim/rmbench/<slug>/trial_1.mp4` | `observe_and_pick_up` `battery_try` `press_button` |
| `static/videos/sim/memorybench/<slug>/trial_1.mp4` | `reopen_drawer` `put_block_back` `rearrange_block` |

---

## ✅ 已就位：从 BridgeVLA 页面导入（21 段，14.1 MB）

来源是 BridgeVLA（NeurIPS 2025）的项目页：
`/DATA/disk1/zyz/projects/TPAMI_bridgevla/project_page/BridgeVLA.github.io/static/videos`

```bash
python3 tools/import_bridgevla_assets.py       # --dry-run 只看会拷哪些
```

**只导入真机素材。** 源页面还有 RLBench / COLOSSEUM / GemBench 的 rollout，但那些是
**base 模型**的录像，而本页仿真面板放的是 `build_sim_demos.py` 从我们自己 eval 日志里
挑出来的 BridgeVLA++ rollout —— 混在一起就成了张冠李戴，所以那三个基准的视频一段都不拿。
真机 Franka 的表（Table 8 / Figure 4）在期刊扩展里本来就是 BridgeVLA 的成绩，
所以这批不存在归属问题。

编码上源文件全部已经是 H.264 + yuv420p，所以逐个 `-c:v copy` 重封装，
视频码流逐比特一致，只是把 `moov` 挪到文件头（源文件都没有 faststart）。
封面取 15% 处那一帧，讲解视频例外——取第 40 s 的「shared 2D space」那张图。

| 目录 | 内容 |
| --- | --- |
| `static/videos/real/franka/generalization/<setting>[_2\|_3].mp4` | 6 个泛化设置 × 3 段 rollout |
| `static/videos/real/franka/failure/<slug>.mp4` | 3 段 Category 设置的失败案例 |
| `static/images/franka_posters/…` | 21 张封面 |

来源 episode、原始分辨率、时长、处理方式都记在
`static/videos/IMPORTED_MANIFEST.json`。

**每段真机片子都烧了 `X6` 角标，是 6 倍速**——页面上「Browse the rollouts」那段
lede 里已经写明，换素材时别忘了同步。

### 泛化设置的三段 rollout

Franka 浏览器现在支持一个 chip 挂多段录像：`#franka-demo-data` 里给该项写一个
`clips` 数组，每项 `{ "id": …, "instruction": … }`，视频右上角就会出现
**Rollout 1 / 2 / 3** 切换，指令行跟着换。路径仍按 `<group>/<id>.mp4` 推导，
所以 `clips[i].id` 就是文件名。没有 `clips` 的项（13 个基础任务）走老路径
`<group>/<item.id>.mp4`。

| 设置 | Rollout 1 | Rollout 2 | Rollout 3 |
| --- | --- | --- | --- |
| Distractor | 橙色积木→绿盘 | 长颈鹿→下抽屉 | 按洗手液 |
| Lighting | RedBull→上层架 | 按洗手液 | 长颈鹿→下抽屉 |
| Background | 红积木→蓝盘 | RedBull→上层架 | 斑马→上抽屉 |
| Height | 红积木→蓝盘 | 按洗手液 | 苏打水→下层架 |
| Combination | 橙积木→下抽屉 | RedBull→绿盘 | 黄积木→紫盘 |
| Category | 桃子→下层架 | 瓶子→蓝盘 | 熊猫→下抽屉 |

源页面把 `illumination_put_the_RedBull_can_in_the_top_shelf_2_34` 标成了
"Put RedBull can on bottom shelf"，与文件名矛盾；这里按文件名写 **top shelf**。

### 讲解视频（⛔ 目前不放在页面上）

`long.mp4` 在源页面里也没有被引用过。它是 BridgeVLA 的**旁白讲解片**，片尾还有
BridgeVLA 的 logo 和副标题，讲的全是 Part I 的内容。曾经放在方法区
「Part I — BridgeVLA」下面，现已撤下，文件也从仓库里删了。

要放回来：

```bash
python3 tools/import_bridgevla_assets.py --with-overview
```

然后把 `.figure.explainer` 那段 HTML 加回 `index.html` 的 Part I 之后、
以及对应的 CSS 规则（两者和视频文件在同一个 commit 里一起删的，`git show` 能捞回来）。

注意它是**唯一带音轨**的片子，所以**不能放进 `.media-slot`**——`.media-slot video`
会被 `IntersectionObserver` 自动播放，一个有旁白的片子自动播是灾难。原来用的是
`.figure.explainer` + `preload="none"` + 原生控件，只有点了才加载那 13.8 MB。

---

## ⬜ 待补

### 仿真：需要重跑 eval 才能拿到的 11 段

日志里主模型**没有**这些任务的成功录像。补录后重跑
`python3 tools/build_sim_demos.py` 就会自动就位，不用改 HTML。

**RLBench（5）** — 主模型的可视化 run 是
`logs/train/7_3_rlbench_07_04_02_04`，只覆盖 14 个任务、每任务 3 个 episode。

| 页面 slug | 日志任务名 | 现状 |
| --- | --- | --- |
| `insert_peg` | `insert_onto_square_peg` | 有 3 个 episode，**全部失败** |
| `stack_blocks` | `stack_blocks` | 主模型没跑；消融 run 里 50 个也全失败 |
| `stack_cups` | `stack_cups` | 主模型没跑（消融 run 有 23 个成功） |
| `sweep_to_dustpan` | `sweep_to_dustpan_of_size` | 主模型没跑（消融 run 有 40 个成功） |
| `turn_tap` | `turn_tap` | 主模型没跑（消融 run 有 47 个成功） |

**RMBench（6）** — 主模型只有 `press_button`、`battery_try`、`observe_and_pickup`
三个 run 存了录像；其余六个任务的录像全部来自 `*_no_mem` / `*_no_spatial_mem` /
`*_no_temporal_mem` 消融 run，不能拿来当 BridgeVLA++ 展示。

| 页面 slug | 日志任务名 |
| --- | --- |
| `rearrange_blocks` | `rearrange_blocks` |
| `put_back_block` | `put_back_block` |
| `swap_blocks` | `swap_blocks` |
| `swap_t` | `swap_T` |
| `blocks_ranking_try` | `blocks_ranking_try` |
| `cover_blocks` | `cover_blocks` |

另外，`press_button` 和 `observe_and_pickup` 现有的只是关键帧录像（26 / 4 帧）。
重跑时若能像 `battery_try` 的 `06_29_17_31_40` 那次一样存完整运动录像，观感会好很多。

### 还没用上的日志（可选）

| 日志 | 内容 | 备注 |
| --- | --- | --- |
| `logs/train_colosseum/7_20_colosseum_all_07_21_00_31` | 20 个任务 × 15 个扰动变体，164 段成功 | 页面 COLOSSEUM 面板目前没有视频区；用来展示「同一任务 × 不同扰动」很合适 |
| `logs/train_gembench/after_memorybench_06_04_21_14` | 677 段（目录名全是 `SR1.0`），mpeg4 需转码 | 是 6 月 4 日的 run，**不一定**对应论文里 GemBench 的数字，用前需确认 |

### 真机 · Franka 基础任务（13，由 `#franka-explorer` 驱动）

真机区的 Franka 面板是和 DOBOT 同款的**选择式浏览器**：13 个基础任务 chip +
6 个泛化设置 chip。泛化那 6 个已就位（见下方「从 BridgeVLA 页面导入」），
13 个基础任务仍显示 "Video coming soon" 占位卡 + 期望路径。
**把文件放到对应路径即生效，不改 HTML。**

数据（成绩、指令、说明）在 `index.html` 的
`<script type="application/json" id="franka-demo-data">` 里；路径按
`static/videos/real/franka/<group>/<id>.mp4` 推导。竖版不需要——Franka 相机正装，
直接 16:9 横版即可（台面框是 16:9）。可选封面：
`static/images/franka_posters/<group>__<id>.jpg`。

**基础任务（`basic/`，13 个）**

| 文件名（`static/videos/real/franka/basic/…`） | 指令 |
| --- | --- |
| `redbull_top_shelf.mp4` | "Put the RedBull can in the top shelf" |
| `soda_bottom_shelf.mp4` | "Put the soda can in the bottom shelf" |
| `redbull_bottom_shelf.mp4` | "Put the RedBull can in the bottom shelf" |
| `coke_top_shelf.mp4` | "Put the coke can in the top shelf" |
| `red_block_blue_plate.mp4` | "Place the red block in the blue plate" |
| `orange_block_green_plate.mp4` | "Place the orange block in the green plate" |
| `red_block_purple_plate.mp4` | "Place the red block in the purple plate" |
| `yellow_block_green_plate.mp4` | "Place the yellow block in the green plate" |
| `press_sanitizer.mp4` | "Press sanitizer" |
| `zebra_upper_drawer.mp4` | "Put the zebra in the upper drawer" |
| `zebra_lower_drawer.mp4` | "Put the zebra in the lower drawer" |
| `giraffe_lower_drawer.mp4` | "Put the giraffe in the lower drawer" |
| `wolf_upper_drawer.mp4` | "Put the wolf in the upper drawer" |

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

要做「多张图选一张看」的展示就照 `#franka-gallery` 的结构（`.fig-tabs`）：
一行 `.picker-chip` 按钮（`data-fig="0..n"`）+ `.fig-tab-stage` 里每项一个
`<figure>`（第一个带 `is-active`），视口高度固定、图片按比例收进去。
