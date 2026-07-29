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
| `static/js/bridgevla_plus.js` | Missing-media placeholders, lazy video playback, carousels, scroll-spy, BibTeX copy. |
| `static/images/paper/` | Figures rendered from `manuscript_tpami/figures/*.pdf`. |
| `static/videos/real/dobot/` | All 35 real-robot rollouts (7 tasks × 5 settings), rotated upright and re-encoded. |
| `static/images/dobot_posters/` | First frame of each rollout, used as the `<video poster>`. |
| `static/images/dobot_keyframes/` | The 5-keyframe rollout strip per task (basic setting). |
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
8. **Videos** — all 35 DOBOT rollouts are in place; 28 clips (Franka + simulation)
   are still placeholders. See `VIDEO_ASSETS.md`.

## The real-robot demo explorer

The DOBOT section is a task × setting picker (`#dobot-explorer`): choose one of the
7 language instructions, then one of the 5 evaluation settings, and the panel shows
that exact rollout with the success count, the setting description, a per-setting
bar chart, and the task's 5-keyframe strip.

It is driven entirely by the JSON in `<script type="application/json"
id="dobot-demo-data">` inside `index.html` — edit that block to add a task,
correct a number, or mark a combination as unrecorded (`"missing": ["lighting"]` —
nothing uses it now that all 35 are recorded).
File paths are derived, not listed: `static/videos/real/dobot/<task>/<setting>.mp4`.

Only the selected clip is ever fetched — one `<video>` whose `src` is swapped.
Inlining all 35 players would have pulled ~39 MB on page load.

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

## Attribution

The layout and visual language are adapted, with the original author's
permission, from the BridgeVLA and MV-VDP project pages. All MV-VDP text,
tables, figures and videos have been removed.
