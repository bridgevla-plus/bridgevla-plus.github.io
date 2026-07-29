#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Import the reusable video assets from the BridgeVLA (NeurIPS 2025) project page.

Only the **real-robot** material is imported.  The source page also ships
RLBench, COLOSSEUM and GemBench rollouts, but those are base-model recordings
and the simulation panels here show BridgeVLA++ rollouts pulled from our own
eval logs by `build_sim_demos.py` — mixing the two would misattribute them, so
they are deliberately left behind.  What comes across:

  * the 18 Franka generalization rollouts (6 settings × 3), which back the
    numbers already in the Franka panel — those are BridgeVLA results in the
    journal extension too, so no attribution problem;
  * the 3 Category-setting failure cases;
  * with `--with-overview` only, the narrated BridgeVLA explainer — it is not
    on the page at the moment.

Encoding follows the page convention — H.264 / yuv420p / faststart.  Every
source already meets the codec spec, so each clip is remuxed with `-c:v copy`
(a bit-identical video bitstream) purely to move `moov` to the front; none of
the originals are faststart.  A source that ever fails the spec is re-encoded
instead — the source page's simulation clips, for instance, are yuv444p (High
4:4:4 Predictive), which Chrome and Safari cannot decode.

Usage:  python3 tools/import_bridgevla_assets.py [--dry-run] [--with-overview]
"""
from __future__ import annotations
import argparse, json, os, shutil, subprocess, sys

SRC = '/DATA/disk1/zyz/projects/TPAMI_bridgevla/project_page/BridgeVLA.github.io/static/videos'
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FRANKA_OUT = os.path.join(HERE, 'static/videos/real/franka')
FRANKA_POSTERS = os.path.join(HERE, 'static/images/franka_posters')
OVERVIEW_OUT = os.path.join(HERE, 'static/videos/overview')

# --------------------------------------------------------------- real robot

# Franka: the source page has three rollouts per generalization setting and no
# basic-setting clip at all, so the 13 basic tasks stay placeholders.  Clip ids
# follow the explorer's derived-path rule — `<group>/<id>.mp4` — with `_2` /
# `_3` suffixes for the second and third rollout of a setting.
FRANKA_GENERALIZATION = {
    'background':     'real_reduce_size/background/background_place_the_red_block_in_the_blue_plate_1_41_caption.mp4',
    'background_2':   'real_reduce_size/background/background_put_the_RedBull_can_in_the_top_shelf_2_40_caption.mp4',
    'background_3':   'real_reduce_size/background/background_put_the_zebra_in_the_upper_drawer_3_70_caption.mp4',
    'lighting':       'real_reduce_size/lighting/illumination_put_the_RedBull_can_in_the_top_shelf_2_34_caption.mp4',
    'lighting_2':     'real_reduce_size/lighting/illumination_press_sanitizer_2_16_caption.mp4',
    'lighting_3':     'real_reduce_size/lighting/illumination_put_the_giraffe_in_the_lower_drawer_1_69_caption.mp4',
    'distractor':     'real_reduce_size/distractor/Disturbance_place_the_orange_block_in_the_green_plate_2_42_caption.mp4',
    'distractor_2':   'real_reduce_size/distractor/Disturbance_put_the_giraffe_in_the_lower_drawer_1_71_caption.mp4',
    'distractor_3':   'real_reduce_size/distractor/Disturbance_press_sanitizer_1_16_caption.mp4',
    'height':         'real_reduce_size/height/height_place_the_red_block_in_the_blue_plate_1_46_caption.mp4',
    'height_2':       'real_reduce_size/height/height_press_sanitizer_2_17_caption.mp4',
    'height_3':       'real_reduce_size/height/height_put_the_soda_can_in_the_bottom_shelf_3_41_caption.mp4',
    'combination':    'real_reduce_size/combination/combination_put_the_orange_block_in_the_lower_drawer_1_74_caption.mp4',
    'combination_2':  'real_reduce_size/combination/combination_put_the_RedBull_can_in_the_green_plate_1_41_caption.mp4',
    'combination_3':  'real_reduce_size/combination/combination_place_the_yellow_block_in_the_purple_plate_4_41_caption.mp4',
    'category':       'real_reduce_size/category/category_put_the_peach_in_the_bottom_shelf_6_43_caption.mp4',
    'category_2':     'real_reduce_size/category/category_place_the_bottle_in_the_blue_plate_3_42_caption.mp4',
    'category_3':     'real_reduce_size/category/category_put_the_panda_in_the_lower_drawer_1_69_caption.mp4',
}

# All three failure cases are from the Category setting — the one setting whose
# absolute success rate stays low.
FRANKA_FAILURE = {
    'bread_green_plate':  'real_reduce_size/failure/category_place_the_bread_in_the_green_plate_4_52_caption.mp4',
    'apple_top_shelf':    'real_reduce_size/failure/category_put_the_apple_in_the_top_shelf_2_54_caption.mp4',
    'peach_bottom_shelf': 'real_reduce_size/failure/category_put_the_peach_in_the_bottom_shelf_5_22_caption.mp4',
}

# The narrated BridgeVLA explainer.  Currently **not** on the page and behind
# `--with-overview`, so a plain re-run does not resurrect a 13.8 MB file that
# nothing references.  To put it back: run with the flag, then re-add the
# `.figure.explainer` block under "Part I — BridgeVLA" in index.html and its
# rule in the CSS (both were removed in the same commit as the file).
OVERVIEW = {'bridgevla_overview': 'long.mp4'}


def probe(path: str) -> dict:
    out = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
         'stream=width,height,nb_frames,codec_name,pix_fmt:format=duration,size',
         '-of', 'json', path], capture_output=True, text=True).stdout
    d = json.loads(out)
    s = d['streams'][0]
    return dict(w=int(s['width']), h=int(s['height']),
                frames=int(s.get('nb_frames') or 0),
                codec=s['codec_name'], pix_fmt=s['pix_fmt'],
                dur=float(d['format']['duration']),
                size=int(d['format']['size']))


def convert(src: str, dst: str, meta: dict, keep_audio=False, dry=False) -> str:
    """Remux when the source already meets the spec, re-encode when it does not.

    yuv444p H.264 is High 4:4:4 Predictive: Chrome and Safari refuse it, so
    those clips have to be re-encoded rather than copied.  Everything else is
    copied bit for bit and only gains `+faststart`, which none of the sources
    have (their `moov` sits after `mdat`).
    """
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    needs_encode = meta['codec'] != 'h264' or meta['pix_fmt'] != 'yuv420p'
    cmd = ['ffmpeg', '-y', '-v', 'error', '-i', src]
    if needs_encode:
        cmd += ['-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
                '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p']
    else:
        cmd += ['-c:v', 'copy']
    cmd += ['-c:a', 'aac', '-b:a', '128k'] if keep_audio else ['-an']
    cmd += ['-movflags', '+faststart', dst]
    if dry:
        print('   would run:', ' '.join(cmd))
    else:
        subprocess.run(cmd, check=True)
    return 'encode' if needs_encode else 'copy'


def poster(clip: str, dst: str, at=None, dry=False) -> None:
    """One frame ~15% in — same rule as build_sim_demos.py.

    `at` overrides that with an absolute second, which the overview video needs:
    15% into it lands on a montage of task thumbnails, while 40 s is the core
    "shared 2D space" slide the caption is actually about.
    """
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if dry:
        print('   would poster:', dst)
        return
    ss = at if at is not None else probe(clip)['dur'] * 0.15
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', f'{ss:.2f}',
                    '-i', clip, '-frames:v', '1', '-q:v', '4', dst], check=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--with-overview', action='store_true',
                    help='also import the narrated explainer (not on the page)')
    args = ap.parse_args()
    dry = args.dry_run

    if not shutil.which('ffmpeg'):
        sys.exit('ffmpeg not found')
    if not os.path.isdir(SRC):
        sys.exit(f'source page not found: {SRC}')

    # (label, mapping, dst path builder, poster path builder, keep_audio, poster_at)
    jobs = [
        ('real/franka/generalization', FRANKA_GENERALIZATION,
         lambda s: os.path.join(FRANKA_OUT, 'generalization', f'{s}.mp4'),
         lambda s: os.path.join(FRANKA_POSTERS, f'generalization__{s}.jpg'), False, None),
        ('real/franka/failure', FRANKA_FAILURE,
         lambda s: os.path.join(FRANKA_OUT, 'failure', f'{s}.mp4'),
         lambda s: os.path.join(FRANKA_POSTERS, f'failure__{s}.jpg'), False, None),
    ]
    if args.with_overview:
        jobs.append(
            ('overview', OVERVIEW,
             lambda s: os.path.join(OVERVIEW_OUT, f'{s}.mp4'),
             lambda s: os.path.join(HERE, 'static/images', f'{s}_poster.jpg'), True, 40.0))

    manifest, total = [], 0
    for label, mapping, dst_of, poster_of, keep_audio, poster_at in jobs:
        print(f'\n=== {label} ===')
        for slug, rel in mapping.items():
            src = os.path.join(SRC, rel)
            if not os.path.exists(src):
                print(f'  MISSING  {slug:30s} <- {rel}')
                continue
            m = probe(src)
            dst, pos = dst_of(slug), poster_of(slug)
            how = convert(src, dst, m, keep_audio=keep_audio, dry=dry)
            poster(dst, pos, at=poster_at, dry=dry)
            out_size = 0 if dry else os.path.getsize(dst)
            total += out_size
            print(f'  {how:6s}   {slug:30s} {m["w"]}x{m["h"]} {m["pix_fmt"]:8s} '
                  f'{m["dur"]:6.1f}s  {out_size / 1e6:5.2f} MB')
            manifest.append(dict(group=label, slug=slug, src=rel,
                                 out=os.path.relpath(dst, HERE),
                                 poster=os.path.relpath(pos, HERE),
                                 how=how, w=m['w'], h=m['h'],
                                 pix_fmt=m['pix_fmt'], dur=round(m['dur'], 2),
                                 bytes=out_size))

    print(f'\n{len(manifest)} clips, {total / 1e6:.1f} MB')
    if not dry:
        out = os.path.join(HERE, 'static/videos/IMPORTED_MANIFEST.json')
        with open(out, 'w') as f:
            json.dump(dict(source_page=SRC,
                           note='All clips are BridgeVLA (NeurIPS 2025) base-model '
                                'recordings, not BridgeVLA++.',
                           clips=manifest), f, indent=1)
        print('manifest ->', out)


if __name__ == '__main__':
    main()
