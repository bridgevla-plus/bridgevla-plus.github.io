#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pull one successful simulation rollout per task out of the training logs.

The eval runs write videos in three different conventions, and success is
recorded differently in each:

  RLBench   logs/train/<run>/eval/**/visualize/<task>/videos/
            episode_<i>_<instruction>_(success|fail)_<n>.mp4      -> name says it
  RMBench   logs/train_rmbench/<run>/eval/rmbench/<task>/<variant>/<model>/<ts>/
            episode<i>.mp4  +  _result.txt                        -> `_result.txt` says it
  MemoryBench logs/train_memorybench/<run>/eval/memorybench_viz/<model>/<seed>/
            videos/<task>+<var>/<i>_SR<value>/global.mp4          -> dir name says it

Only *main-model* runs are eligible: any run whose name contains no_mem /
no_spatial_mem / no_temporal_mem is an ablation and must never be presented as
a BridgeVLA++ rollout.

Some RMBench evals only dumped one frame per predicted keypose (4-26 frames at
10 fps, i.e. a fraction of a second). Those are stretched to ~8 s so they read
as a keyframe walk-through instead of a flicker.  Full-motion clips are kept at
their own pace.

Usage:  python3 tools/build_sim_demos.py [--dry-run]
"""
from __future__ import annotations
import argparse, json, os, re, shutil, subprocess, sys

LOGS = '/DATA/disk1/zyz/projects/BridgeVLA_sam/data/bridgevla_data/logs'
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(HERE, 'static/videos/sim')
POSTERS = os.path.join(HERE, 'static/images/sim_posters')

NAMED = re.compile(r'episode_(\d+)_(.*)_(success|fail)_(\d+)\.mp4$')
ABLATION = ('no_mem', 'no_spatial_mem', 'no_temporal_mem')

# page slug -> log task directory
RLBENCH = {
    'close_jar':        'close_jar',
    'drag_stick':       'reach_and_drag',
    'insert_peg':       'insert_onto_square_peg',
    'meat_off_grill':   'meat_off_grill',
    'open_drawer':      'open_drawer',
    'place_cups':       'place_cups',
    'place_wine':       'place_wine_at_rack_location',
    'push_buttons':     'push_buttons',
    'put_in_cupboard':  'put_groceries_in_cupboard',
    'put_in_drawer':    'put_item_in_drawer',
    'put_in_safe':      'put_money_in_safe',
    'screw_bulb':       'light_bulb_in',
    'slide_block':      'slide_block_to_color_target',
    'sort_shape':       'place_shape_in_shape_sorter',
    'stack_blocks':     'stack_blocks',
    'stack_cups':       'stack_cups',
    'sweep_to_dustpan': 'sweep_to_dustpan_of_size',
    'turn_tap':         'turn_tap',
}
RMBENCH = {
    'observe_and_pick_up': 'observe_and_pickup',
    'rearrange_blocks':    'rearrange_blocks',
    'put_back_block':      'put_back_block',
    'swap_blocks':         'swap_blocks',
    'swap_t':              'swap_T',
    'battery_try':         'battery_try',
    'blocks_ranking_try':  'blocks_ranking_try',
    'cover_blocks':        'cover_blocks',
    'press_button':        'press_button',
}
MEMORYBENCH = {
    'reopen_drawer':   'reopen_drawer',
    'put_block_back':  'put_block_back',
    'rearrange_block': 'rearrange_block',
}

TARGET_SECONDS = 8.0          # stretch keyframe-only clips to about this long
TARGET_MOTION_SECONDS = 25.0  # preferred length of a full-motion rollout
KEYFRAME_MAX_FRAMES = 60      # fewer frames than this = keyframe dump, not motion


def is_ablation(run: str) -> bool:
    return any(k in run for k in ABLATION)


def probe(path: str):
    out = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
         'stream=width,height,nb_frames,codec_name:format=duration', '-of', 'json', path],
        capture_output=True, text=True).stdout
    d = json.loads(out)
    s = d['streams'][0]
    return dict(w=int(s['width']), h=int(s['height']),
                frames=int(s.get('nb_frames') or 0),
                codec=s['codec_name'],
                dur=float(d['format']['duration']))


def rmbench_results(d: str):
    """episodeN -> (ok, instruction) parsed from `_result.txt`."""
    out, p = {}, os.path.join(d, '_result.txt')
    if os.path.exists(p):
        for line in open(p, encoding='utf-8', errors='replace'):
            f = line.rstrip('\n').split('\t')
            if len(f) >= 2 and f[0].startswith('episode'):
                out[f[0]] = (f[1].strip() == 'success', f[3] if len(f) > 3 else '')
    return out


def collect():
    """All successful main-model clips, keyed by (bench, log task name)."""
    found: dict[tuple[str, str], list[dict]] = {}

    def add(bench, task, path, instr=''):
        found.setdefault((bench, task), []).append(dict(path=path, instr=instr))

    # ---- RLBench -------------------------------------------------------
    base = os.path.join(LOGS, 'train')
    for dirpath, _d, files in os.walk(base):
        rel = os.path.relpath(dirpath, base).split(os.sep)
        if is_ablation(rel[0]) or 'visualize' not in rel[:-1]:
            continue
        task = rel[rel.index('visualize') + 1]
        for f in files:
            m = NAMED.search(f)
            if m and m.group(3) == 'success':
                add('rlbench', task, os.path.join(dirpath, f), m.group(2))

    # ---- RMBench -------------------------------------------------------
    base = os.path.join(LOGS, 'train_rmbench')
    for dirpath, _d, files in os.walk(base):
        rel = os.path.relpath(dirpath, base).split(os.sep)
        if is_ablation(rel[0]) or 'rmbench' not in rel:
            continue
        eps = sorted(f for f in files if re.fullmatch(r'episode\d+\.mp4', f))
        if not eps:
            continue
        task = rel[rel.index('rmbench') + 1]
        res = rmbench_results(dirpath)
        for f in eps:
            ok, instr = res.get(f[:-4], (False, ''))
            if ok:
                add('rmbench', task, os.path.join(dirpath, f), instr)

    # ---- MemoryBench ---------------------------------------------------
    base = os.path.join(LOGS, 'train_memorybench')
    for dirpath, _d, files in os.walk(base):
        rel = os.path.relpath(dirpath, base).split(os.sep)
        if is_ablation(rel[0]) or 'global.mp4' not in files or len(rel) < 2:
            continue
        m = re.fullmatch(r'(\d+)_SR([0-9.]+)', rel[-1])
        if m and float(m.group(2)) >= 1.0:
            add('memorybench', rel[-2].split('+')[0], os.path.join(dirpath, 'global.mp4'))
    return found


def pick(cands):
    """A full-motion rollout always beats a keyframe dump.

    Among motion clips take the one closest to TARGET_MOTION_SECONDS rather than
    the longest — a few RMBench episodes run 80 s, which is more page weight than
    anyone will watch.  Ties break on the path so the choice is reproducible.
    """
    for c in cands:
        c['meta'] = probe(c['path'])
    motion = [c for c in cands if c['meta']['frames'] >= KEYFRAME_MAX_FRAMES]
    if motion:
        return min(motion, key=lambda c: (abs(c['meta']['dur'] - TARGET_MOTION_SECONDS),
                                          c['path']))
    return min(cands, key=lambda c: (-c['meta']['frames'], c['path']))


def transcode(src, dst, meta, dry=False):
    """H.264 / yuv420p / faststart so every browser can play it."""
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    vf = ['scale=trunc(iw/2)*2:trunc(ih/2)*2']
    if meta['frames'] and meta['frames'] < KEYFRAME_MAX_FRAMES and meta['dur'] > 0:
        factor = max(1.0, min(20.0, TARGET_SECONDS / meta['dur']))
        vf = [f'setpts={factor:.3f}*PTS'] + vf + ['fps=25']
    cmd = ['ffmpeg', '-y', '-v', 'error', '-i', src, '-vf', ','.join(vf),
           '-c:v', 'libx264', '-preset', 'slow', '-crf', '23',
           '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', dst]
    if dry:
        print('   would run:', ' '.join(cmd))
        return
    subprocess.run(cmd, check=True)


def poster(clip, dst, dry=False):
    """One frame ~15% in — a card should show the scene, not an empty gradient."""
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    dur = probe(clip)['dur']
    cmd = ['ffmpeg', '-y', '-v', 'error', '-ss', f'{dur * 0.15:.2f}', '-i', clip,
           '-frames:v', '1', '-q:v', '4', dst]
    if dry:
        print('   would run:', ' '.join(cmd))
        return
    subprocess.run(cmd, check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    if not shutil.which('ffmpeg'):
        sys.exit('ffmpeg not found')

    found = collect()
    manifest, missing = [], []
    for bench, mapping in (('rlbench', RLBENCH), ('rmbench', RMBENCH),
                           ('memorybench', MEMORYBENCH)):
        print(f'\n=== {bench} ===')
        for slug, task in mapping.items():
            cands = found.get((bench, task), [])
            if not cands:
                missing.append((bench, slug, task, 'no successful clip saved'))
                print(f'  MISSING  {slug:18s} ({task})')
                continue
            best = pick(cands)
            dst = os.path.join(OUT, bench, slug, 'trial_1.mp4')
            m = best['meta']
            kind = 'keyframes' if m['frames'] < KEYFRAME_MAX_FRAMES else 'motion'
            print(f'  OK       {slug:18s} {m["w"]}x{m["h"]} {m["frames"]:5d}f '
                  f'{m["dur"]:6.1f}s {kind:9s} <- {os.path.relpath(best["path"], LOGS)}')
            transcode(best['path'], dst, m, args.dry_run)
            pos = os.path.join(POSTERS, f'{bench}__{slug}.jpg')
            if not args.dry_run:
                poster(dst, pos)
            manifest.append(dict(bench=bench, slug=slug, task=task,
                                 src=os.path.relpath(best['path'], LOGS),
                                 out=os.path.relpath(dst, HERE),
                                 poster=os.path.relpath(pos, HERE),
                                 frames=m['frames'], dur=round(m['dur'], 2),
                                 kind=kind, instr=best.get('instr', '')))

    print(f'\n{len(manifest)} copied, {len(missing)} missing')
    for bench, slug, task, why in missing:
        print(f'  re-run needed: {bench}/{slug}  (log task `{task}`) — {why}')
    if not args.dry_run:
        with open(os.path.join(OUT, 'MANIFEST.json'), 'w') as f:
            json.dump(dict(clips=manifest, missing=missing), f, indent=1)
        print('manifest ->', os.path.join(OUT, 'MANIFEST.json'))


if __name__ == '__main__':
    main()
