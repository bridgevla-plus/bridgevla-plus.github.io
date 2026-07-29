# BridgeVLA++ — project page

Static site for *BridgeVLA++: A Data-Efficient, Generalizable, and
Memory-Augmented Vision-Language-Action Framework for 3D Manipulation*.

```bash
python3 start_server.py     # http://localhost:8011
```

## Files

| File | Role |
| --- | --- |
| `index.html` | **The page.** Everything lives here; entry point for GitHub Pages. |
| `static/css/bridgevla_plus.css` | All styling. Self-contained — no Bulma / FontAwesome / jQuery. |
| `static/js/bridgevla_plus.js` | Missing-media placeholders, lazy video playback, tab switchers, the two demo explorers, scroll-spy, BibTeX copy. |
| `static/images/paper/` | Figures rendered from `manuscript_tpami/figures/*.pdf`. |
| `static/videos/real/dobot/` | All 35 DOBOT rollouts (7 tasks × 5 settings), rotated upright and re-encoded. |
| `static/videos/real/franka/` | 18 generalization rollouts (6 settings × 3) + 3 failure cases, imported from the BridgeVLA page. The 13 basic-task clips are **not recorded yet**; their expected paths are in `VIDEO_ASSETS.md`. |
| `static/videos/overview/` | The narrated BridgeVLA explainer shown in the method section — the only clip on the page with an audio track. |
| `static/videos/sim/` | 19 simulation rollouts pulled out of the training logs by `tools/build_sim_demos.py`, plus `MANIFEST.json` recording which episode each one came from. |
| `static/videos/IMPORTED_MANIFEST.json` | Provenance of everything `tools/import_bridgevla_assets.py` brought over from the BridgeVLA page. |
| `static/images/dobot_posters/` | First frame of each rollout, used as the `<video poster>`. |
| `static/images/dobot_keyframes/` | The 5-keyframe rollout strip per task (basic setting). |
| `static/images/sim_posters/` | `<video poster>` for the simulation clips. |
| `static/images/franka_posters/` | `<video poster>` for the Franka clips. |
| `static/images/bridgevla_plus_logo.svg` | Placeholder logo / favicon (hand-drawn SVG — swap for the real mark). |
| `welcome.html` | Optional splash screen from the original template, rebranded. Not linked from anywhere. |
| `home_page.html` | Redirect to `index.html` (the template served content from this filename). |
| `VIDEO_ASSETS.md` | Every video path the page expects, with what each one shows. |

The template's own assets (`static/css/bulma*`, `static/js/jquery*`,
`static/images/Overview.png`, `static/videos/Metaworld`, `static/videos/Real-World`,
`static/videos/Video_Generation`, …) are **left untouched but no longer referenced**.
Delete them before publishing so the site does not ship another paper's media.

## Placeholders left for you

Everything below is marked in `index.html` with a `TODO(author)` comment or a
`placeholder` / `.todo` badge that is visible in the rendered page.

1. **Author list** — names, personal-page links and superscript affiliation
   indices in the hero (`.authors`).
2. **Affiliations** — the three `<span><sup>n</sup>…</span>` entries.
3. **Venue badge** — currently "Journal extension of BridgeVLA, NeurIPS 2025 · venue TBD".
4. **Paper links** — arXiv, PDF, code, checkpoints are rendered as disabled
   "coming soon" buttons. Replace `href="#"`, drop `is-muted` and remove
   `aria-disabled` to activate one.
5. **BibTeX** — the BridgeVLA++ entry is a stub; the BridgeVLA (NeurIPS 2025)
   entry below it is real.
6. **Acknowledgements / funding / contact** — footer.
7. **Logo** — `static/images/bridgevla_plus_logo.svg` is a placeholder mark.
8. **Videos** — all 35 DOBOT rollouts, all 18 Franka generalization rollouts,
   the 3 failure cases and 19 of the 30 simulation rollouts are in place;
   24 clips are still placeholders (13 Franka basic tasks + 11 simulation, the
   latter needing an eval re-run). See `VIDEO_ASSETS.md`.

## Tabbed switchers

Two sections are organised as tab switchers (`static/js/bridgevla_plus.js`
drives both from the same generic component):

- **Simulation** (`#bench-explorer`) — one tab per benchmark, ordered
  RMBench → RLBench → COLOSSEUM → GemBench → MemoryBench. Each panel holds the
  suite illustration, the results table and (where recorded) the rollout
  videos. This replaced the old "benchmark suites" carousel, whose prev/next
  buttons sat at different heights for every slide.
- **Real robot** (`#platform-explorer`) — DOBOT CR5A (default) vs Franka
  Research 3. Each panel is the complete story for that platform: tables,
  figures and its own demo explorer.

Panels are toggled with the `hidden` attribute; on switch the script
re-measures table overflow and force-reveals the panel's `.reveal` elements
(they could never intersect the scroll observer while hidden).

The very tall COLOSSEUM suite figure is pre-split into two equal-height halves
(`colosseum_perturbations_a/_b.jpg`, split at a white row boundary, the short
half padded to match) and shown side by side. The six Franka setting
illustrations use a chip-picked, fixed-height viewport (`.fig-tabs`) for the
same reason: uniform height regardless of aspect ratio.

## The demo explorers

**DOBOT** (`#dobot-explorer`): a task × setting picker — 7 language
instructions × 5 evaluation settings, each showing the exact rollout with the
success counts, a per-setting bar chart and the task's 5-keyframe strip.
Driven by the JSON in `<script type="application/json" id="dobot-demo-data">`;
paths are derived, not listed: `static/videos/real/dobot/<task>/<setting>.mp4`.

**Franka** (`#franka-explorer`): a flat picker — 13 basic-task instructions +
6 generalization settings, driven by `#franka-demo-data`. Success counts come
from the paper (10-demo / 3-demo / RVT-2). An item with a `clips` array holds
one rollout per entry and gets a **Rollout 1 / 2 / 3** switch over the stage
(each generalization setting was recorded on three different tasks, so the
instruction line changes with the rollout); an item without one derives the
single path `static/videos/real/franka/<group>/<id>.mp4`. The 13 basic tasks
have no clip yet and show a "Video coming soon" overlay with the exact path —
dropping a file there activates it with no HTML change.

Only the selected clip is ever fetched — one `<video>` whose `src` is swapped.
Inlining all 35 DOBOT players would have pulled ~39 MB on page load.

Source material: `/DATA/disk1/zyz/projects/BridgeVLA_sam/data/selected_demo`.
Three things happen at encode time (`tools/build_dobot_demos.sh`):

- **Transcode.** The originals are 1080p **mpeg4 (MPEG-4 Part 2)**, which browsers
  effectively cannot play — H.264 is mandatory here, not just an optimisation.
- **Rotate.** The camera is mounted sideways; `transpose=2` (90° counter-clockwise)
  puts the arm overhead and the drawer unit / shelf upright.
- **Crop.** The bottom ~30% after rotation is bare table and floor clutter. The top
  70.3125% is kept — checked across all 35 combinations and the whole timeline,
  it never clips an arm or an object.

Result: **720×900 (4:5 portrait)**, ~1.5 GB → **38.7 MB**. The portrait aspect is why
`.demo-video` is a width-capped column rather than a wide one; change `ROTATE` /
`KEEP` in the script and the `aspect-ratio` rules in the CSS together.

## How the media placeholder works

A `<video>` whose file is missing fires an `error` on its `<source>`; the script
then swaps in a dashed "Video coming soon" card showing the expected path. So the
markup can reference the final filenames today and start working the moment a file
lands — no HTML edits needed. The same fallback covers `<img>` inside a
`.media-slot`.

Videos are never all playing at once: an `IntersectionObserver` plays a clip when
it scrolls into view and pauses it when it leaves, and clips inside an inactive
carousel slide stay paused.

## Regenerating the figures

The figure PNG/JPEGs come straight from the manuscript. To refresh after a figure
changes (`pdftoppm` + ImageMagick):

```bash
SRC=../../manuscript_tpami/figures
DST=static/images/paper
pdftoppm -png -r 138 -singlefile $SRC/teaser.pdf $DST/teaser          # ~1800 px wide
pdftoppm -png -r 190 -singlefile $SRC/architecture.pdf $DST/architecture
# photo-heavy grids are then re-encoded as JPEG to keep the page light:
convert $DST/foo.png -strip -interlace Plane -quality 86 $DST/foo.jpg && rm $DST/foo.png
```

Pick the DPI as `target_width_px / pdf_width_pt * 72`.

## Regenerating the DOBOT demo assets

Videos, posters and keyframe strips all come out of one script:

```bash
bash tools/build_dobot_demos.sh
# knobs: SRC_ROOT=… CRF=26 ROTATE=transpose=2 KEEP=0.703125 WIDTH=720 JOBS=4
```

It reads `/DATA/disk1/zyz/projects/BridgeVLA_sam/data/selected_demo`, writes into
`static/videos/real/dobot/`, `static/images/dobot_posters/` and
`static/images/dobot_keyframes/`, and prints the `keyframes` step arrays — if those
change, copy them into `#dobot-demo-data` in `index.html`.

## Regenerating the simulation rollouts

```bash
python3 tools/build_sim_demos.py            # --dry-run to see the picks only
```

It walks the training logs under
`/DATA/disk1/zyz/projects/BridgeVLA_sam/data/bridgevla_data/logs`, takes one
**successful** episode per task from the **main-model** runs only — anything
whose run name contains `no_mem` / `no_spatial_mem` / `no_temporal_mem` is an
ablation and must never be shown as a BridgeVLA++ rollout — and writes
`static/videos/sim/<bench>/<slug>/trial_1.mp4` plus a poster. Success is
recorded differently in each suite (RLBench: in the file name; RMBench: in
`_result.txt`; MemoryBench: in the `<episode>_SR1.0` directory name), so the
script has one reader per convention.

Tasks with no successful main-model clip are printed as `MISSING` and left as
page placeholders; `VIDEO_ASSETS.md` lists which evals need re-running. Every
chosen clip's provenance lands in `static/videos/sim/MANIFEST.json`.

## Importing from the BridgeVLA page

```bash
python3 tools/import_bridgevla_assets.py    # --dry-run to see the picks only
```

Copies the reusable material from the BridgeVLA (NeurIPS 2025) project page:
the 18 Franka generalization rollouts, the 3 Category failure cases and the
narrated explainer. **Real-robot material only** — that page also ships
RLBench, COLOSSEUM and GemBench clips, but those are base-model recordings and
the simulation panels here show BridgeVLA++ rollouts, so importing them would
misattribute them. The Franka tables are BridgeVLA results in the journal
extension too, so those clips carry no such problem.

Every source is already H.264 / yuv420p, so each clip is remuxed with
`-c:v copy` — a bit-identical video bitstream — purely to move `moov` to the
front; none of the originals are faststart. Provenance lands in
`static/videos/IMPORTED_MANIFEST.json`. The Franka clips carry a burned-in
`X6` badge and play at 6× real time, which the page states in the explorer's
lede.

## Attribution

The layout and visual language are adapted, with the original author's
permission, from the BridgeVLA and MV-VDP project pages. All MV-VDP text,
tables, figures and videos have been removed.
