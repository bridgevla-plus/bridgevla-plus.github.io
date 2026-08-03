/* ============================================================================
   BridgeVLA++ project page — behaviour
   1. graceful placeholders for media that has not been dropped in yet
   2. lazy play/pause of videos as they enter/leave the viewport
   3. carousels
   4. scroll-spy for the sticky section nav
   5. reveal-on-scroll + BibTeX copy
   ========================================================================== */
(function () {
  'use strict';

  // Opt the reveal-on-scroll animation in only once the script is running, so a
  // script failure can never leave sections stranded at opacity 0.
  document.documentElement.classList.add('js-reveal');

  /* ------------------------------------------------------ reveal on scroll */
  /* Registered first, before anything that could throw: an exception further
     down this file must never leave the whole page stuck at opacity 0. */

  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  var revealAll = function () { reveals.forEach(function (el) { el.classList.add('is-in'); }); };

  if ('IntersectionObserver' in window && reveals.length) {
    // rootMargin lets an element start fading in slightly before it is on
    // screen; threshold 0 fires even for blocks taller than the viewport.
    var rev = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { rev.observe(el); });
    // Safety net: whatever happens, nothing stays invisible.
    setTimeout(revealAll, 6000);
  } else {
    revealAll();
  }

  /* ---------------------------------------------------- missing-media stubs */

  function markMissing(slot, path, kind) {
    if (!slot || slot.classList.contains('is-missing')) return;
    slot.classList.add('is-missing');
    var box = document.createElement('div');
    box.className = 'media-placeholder';

    var icon = document.createElement('span');
    icon.className = 'ph-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = kind === 'image' ? '▦' : '▶';

    var title = document.createElement('span');
    title.className = 'ph-title';
    title.textContent = kind === 'image' ? 'Figure coming soon' : 'Video coming soon';

    var code = document.createElement('code');
    code.className = 'ph-path';
    code.textContent = path || 'asset not provided yet';

    box.appendChild(icon);
    box.appendChild(title);
    box.appendChild(code);
    slot.appendChild(box);
  }

  var slotVideos = Array.prototype.slice.call(document.querySelectorAll('.media-slot video'));

  function videoPath(video) {
    var s = video.querySelector('source');
    return s ? s.getAttribute('src') : '';
  }

  // A media element whose every candidate source failed ends up in
  // NETWORK_NO_SOURCE. This script is deferred, so for a 404 the failure has
  // very often already happened before any listener could be attached — poll
  // the state as well as listening, otherwise the placeholder never appears.
  function sweep() {
    slotVideos.forEach(function (video) {
      if (video.networkState === 3 /* NETWORK_NO_SOURCE */) {
        markMissing(video.closest('.media-slot'), videoPath(video), 'video');
      }
    });
  }

  slotVideos.forEach(function (video) {
    // <source> fires its own error, which does not bubble — listen directly.
    var s = video.querySelector('source');
    if (s) {
      s.addEventListener('error', function () {
        markMissing(video.closest('.media-slot'), videoPath(video), 'video');
      });
    }
    video.addEventListener('error', function () {
      markMissing(video.closest('.media-slot'), videoPath(video), 'video');
    });
  });

  sweep();
  window.addEventListener('load', sweep);
  setTimeout(sweep, 2500);

  document.querySelectorAll('.media-slot img, .figure img').forEach(function (img) {
    var fail = function () {
      var slot = img.closest('.media-slot');
      if (slot) {
        markMissing(slot, img.getAttribute('src'), 'image');
      } else {
        img.style.display = 'none';
      }
    };
    if (img.complete && img.naturalWidth === 0) fail();
    img.addEventListener('error', fail);
  });

  /* ------------------------------------------- play only what is on screen */

  var videos = Array.prototype.slice.call(document.querySelectorAll('.media-slot video'));
  if ('IntersectionObserver' in window && videos.length) {
    var playObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var v = entry.target;
        if (entry.isIntersecting) {
          var p = v.play();
          if (p && typeof p.catch === 'function') p.catch(function () { /* autoplay blocked */ });
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.25 });
    videos.forEach(function (v) { playObserver.observe(v); });
  }

  /* ---------------------------------------------------------- tab switchers */
  /* Benchmark tabs (simulation) and platform tabs (real robot): buttons with
     [data-tab] drive same-explorer panels with [data-panel]. Panels other
     than the first start with the `hidden` attribute in the markup, so a
     script failure leaves the default panel visible rather than nothing. */

  document.querySelectorAll('.bench-explorer, .platform-explorer').forEach(function (box) {
    var tabs = Array.prototype.slice.call(box.querySelectorAll('[role="tablist"] [data-tab]'));
    var panels = Array.prototype.slice.call(box.children).filter(function (el) {
      return el.hasAttribute('data-panel');
    });
    if (!tabs.length || !panels.length) return;

    // A tab strip may be duplicated inside every panel (the rollout browser
    // carries its platform switch in both cards), so a tab is reachable only
    // while its own panel is the visible one.
    function isLive(t) {
      var p = t.closest('[data-panel]');
      return !p || !p.hidden;
    }

    function activate(id, focusTab) {
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-tab') === id;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (p) {
        var show = p.getAttribute('data-panel') === id;
        p.hidden = !show;
        if (show) {
          // While hidden, these elements could never intersect the reveal
          // observer — show them all at once; the panel plays one fade.
          Array.prototype.forEach.call(p.querySelectorAll('.reveal'), function (el) {
            el.classList.add('is-in');
          });
        } else {
          Array.prototype.forEach.call(p.querySelectorAll('video'), function (v) { v.pause(); });
        }
      });
      // Focus only after the panels have been swapped, and only the copy that
      // ended up visible — focusing one inside a just-hidden panel loses it.
      if (focusTab) {
        tabs.some(function (t) {
          if (t.getAttribute('data-tab') !== id || !isLive(t)) return false;
          t.focus();
          return true;
        });
      }
      // Tables inside a hidden panel measured 0 wide at load — remeasure.
      measureTables();
    }

    tabs.forEach(function (t) {
      t.addEventListener('click', function () { activate(t.getAttribute('data-tab'), false); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : (e.key === 'ArrowLeft' ? -1 : 0);
        if (!d) return;
        e.preventDefault();
        // Step within the strip this tab belongs to: a flat index over every
        // copy would walk into the hidden panel's duplicate.
        var strip = Array.prototype.slice.call(
          t.closest('[role="tablist"]').querySelectorAll('[data-tab]'));
        var j = strip.indexOf(t);
        var n = strip[(j + d + strip.length) % strip.length];
        activate(n.getAttribute('data-tab'), true);
      });
    });
  });

  /* ------------------------------------------------------ figure tab picker */
  /* Chip-picked figures in a fixed-height viewport — uniform height no
     matter each figure's aspect ratio (replaces the centred-arrow carousel,
     whose buttons jumped around as slide heights changed). */

  document.querySelectorAll('.fig-tabs').forEach(function (box) {
    var btns = Array.prototype.slice.call(box.querySelectorAll('[data-fig]'));
    var figs = Array.prototype.slice.call(box.querySelectorAll('.fig-tab-stage > figure'));
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var i = parseInt(b.getAttribute('data-fig'), 10);
        btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        figs.forEach(function (f, j) { f.classList.toggle('is-active', j === i); });
      });
    });
  });

  /* -------------------------------------------------------- speed controls */
  /* Explicit 1×/2×/4× playback-rate switch for the real-robot players and
     the RMBench rollout grid. Both playbackRate and defaultPlaybackRate are
     set: the explorers call load() on every clip swap, which resets the
     former to the latter, so the chosen speed must live in both. */

  var SPEED_RATES = [1, 2, 4];
  var SPEED_DEFAULT = 2;

  function makeSpeedControl(getVideos, overlay, defaultRate) {
    var wrap = document.createElement('div');
    wrap.className = 'speed-control' + (overlay ? ' speed-control--overlay' : '');
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Playback speed');

    var label = document.createElement('span');
    label.className = 'sc-label';
    label.textContent = 'Speed';
    wrap.appendChild(label);

    var seg = document.createElement('span');
    seg.className = 'sc-seg';
    wrap.appendChild(seg);

    var buttons = SPEED_RATES.map(function (rate) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = rate + '×';
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-label', 'Play at ' + rate + '× speed');
      b.addEventListener('click', function () { wrap.applyRate(rate); });
      seg.appendChild(b);
      return { rate: rate, el: b };
    });

    function highlight(rate) {
      buttons.forEach(function (b) {
        b.el.setAttribute('aria-pressed', b.rate === rate ? 'true' : 'false');
      });
    }

    wrap.applyRate = function (rate) {
      highlight(rate);
      getVideos().forEach(function (v) {
        v.defaultPlaybackRate = rate;
        v.playbackRate = rate;
      });
    };

    // Keep the highlight honest if the rate is changed through the native
    // player menu instead of these buttons.
    wrap.watch = function (video) {
      video.addEventListener('ratechange', function () {
        highlight(video.playbackRate);
      });
    };

    wrap.applyRate(defaultRate || SPEED_DEFAULT);
    return wrap;
  }

  // Free-standing bars: one control drives every <video> inside the element
  // that data-speed-for points at (RMBench grid, Franka failure grid).
  document.querySelectorAll('[data-speed-for]').forEach(function (bar) {
    var target = document.querySelector(bar.getAttribute('data-speed-for'));
    if (!target) return;
    var vids = Array.prototype.slice.call(target.querySelectorAll('video'));
    if (!vids.length) return;
    var def = parseFloat(bar.getAttribute('data-speed-default')) || 0;
    bar.appendChild(makeSpeedControl(function () { return vids; }, false, def));
  });

  /* --------------------------------------------------------- demo explorer */
  /* Task × setting picker over the real-robot rollouts. A single <video>
     whose src is swapped on selection, so only the clip on screen is ever
     fetched — the alternative (35 inline players) would pull ~44 MB up front. */

  (function initDemoExplorer() {
    var root = document.getElementById('dobot-explorer');
    var dataEl = document.getElementById('dobot-demo-data');
    if (!root || !dataEl) return;

    var data;
    try { data = JSON.parse(dataEl.textContent); } catch (e) { return; }
    if (!data || !data.tasks || !data.settings) return;

    var VIDEO_ROOT = root.getAttribute('data-video-root');
    var POSTER_ROOT = root.getAttribute('data-poster-root');
    var KF_ROOT = root.getAttribute('data-keyframe-root');

    var video = root.querySelector('[data-demo-video]');
    var badge = root.querySelector('[data-demo-badge]');
    var family = root.querySelector('[data-demo-family]');
    var instruction = root.querySelector('[data-demo-instruction]');
    var note = root.querySelector('[data-demo-note]');
    var scores = root.querySelector('[data-demo-scores]');
    var keyframes = root.querySelector('[data-demo-keyframes]');
    var missingNote = root.querySelector('[data-demo-missing-note]');
    var settingRow = root.querySelector('[data-setting-row]');
    var overview = root.querySelector('[data-demo-overview]');

    var state = { task: data.tasks[0].id, setting: data.settings[0].id, trial: 0 };
    var taskButtons = {};
    var settingButtons = {};

    function taskById(id) {
      for (var i = 0; i < data.tasks.length; i++) if (data.tasks[i].id === id) return data.tasks[i];
      return null;
    }
    function settingById(id) {
      for (var i = 0; i < data.settings.length; i++) if (data.settings[i].id === id) return data.settings[i];
      return null;
    }
    function isMissing(task, settingId) {
      return !!(task.missing && task.missing.indexOf(settingId) !== -1);
    }
    function hasAlt(taskId, settingId) {
      return !!(data.alts && data.alts[taskId] && data.alts[taskId].indexOf(settingId) !== -1);
    }

    // ---- build the pickers -------------------------------------------------

    ['memory', 'free'].forEach(function (group) {
      var row = root.querySelector('[data-task-group="' + group + '"]');
      if (!row) return;
      data.tasks.filter(function (t) { return t.group === group; }).forEach(function (t) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'picker-chip';
        b.setAttribute('aria-pressed', 'false');
        b.innerHTML = t.sub
          ? t.label + ' <span class="chip-sub">· ' + t.sub + '</span>'
          : t.label;
        b.addEventListener('click', function () { select(t.id, state.setting); });
        row.appendChild(b);
        taskButtons[t.id] = b;
      });
    });

    data.settings.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'picker-chip';
      b.setAttribute('aria-pressed', 'false');
      b.textContent = s.label;
      b.addEventListener('click', function () { select(state.task, s.id); });
      settingRow.appendChild(b);
      settingButtons[s.id] = b;
    });

    // Trial switch, only shown when a (task, setting) pair has a second episode.
    var trialWrap = document.createElement('div');
    trialWrap.className = 'demo-trials';
    trialWrap.style.cssText = 'display:none;gap:.25rem;';
    var trialButtons = [0, 1].map(function (i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'Trial ' + (i + 1);
      b.style.cssText =
        'font:inherit;font-size:.68rem;font-weight:700;letter-spacing:.04em;' +
        'padding:.2rem .55rem;border-radius:999px;cursor:pointer;' +
        'border:1px solid rgba(255,255,255,.25);background:rgba(23,20,15,.55);color:#faf9f7;' +
        'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);';
      b.addEventListener('click', function () {
        state.trial = i;
        render();
      });
      trialWrap.appendChild(b);
      return b;
    });
    var stageControls = document.createElement('div');
    stageControls.className = 'stage-controls';
    var speedCtl = makeSpeedControl(function () { return [video]; }, true);
    speedCtl.watch(video);
    stageControls.appendChild(speedCtl);
    stageControls.appendChild(trialWrap);
    root.querySelector('.demo-video').appendChild(stageControls);

    // ---- render ------------------------------------------------------------

    function select(taskId, settingId) {
      var task = taskById(taskId);
      if (!task) return;
      // Keep the setting when possible; fall back to Basic if this task has no
      // recording for it, so a click never lands on an empty stage.
      if (isMissing(task, settingId)) settingId = data.settings[0].id;
      state.task = taskId;
      state.setting = settingId;
      state.trial = 0;
      render();
    }

    function render() {
      var task = taskById(state.task);
      var setting = settingById(state.setting);
      if (!task || !setting) return;

      Object.keys(taskButtons).forEach(function (id) {
        taskButtons[id].setAttribute('aria-pressed', id === state.task ? 'true' : 'false');
      });
      Object.keys(settingButtons).forEach(function (id) {
        var b = settingButtons[id];
        b.setAttribute('aria-pressed', id === state.setting ? 'true' : 'false');
        b.disabled = isMissing(task, id);
        b.title = b.disabled ? 'No recording for this task under ' + settingById(id).label : '';
      });

      var missing = isMissing(task, state.setting);
      root.classList.toggle('is-unavailable', missing);
      if (missingNote) {
        missingNote.textContent = missing
          ? task.label + ' was not recorded under ' + setting.label + '.'
          : '';
      }

      var showTrials = hasAlt(state.task, state.setting) && !missing;
      trialWrap.style.display = showTrials ? 'flex' : 'none';
      trialButtons.forEach(function (b, i) {
        b.style.background = (i === state.trial) ? 'rgba(210,98,14,.92)' : 'rgba(23,20,15,.55)';
      });

      var stem = state.setting + (showTrials && state.trial === 1 ? '_alt' : '');
      var src = VIDEO_ROOT + '/' + task.id + '/' + stem + '.mp4';
      if (!missing && video.getAttribute('src') !== src) {
        video.setAttribute('poster', POSTER_ROOT + '/' + task.id + '__' + stem + '.jpg');
        video.setAttribute('src', src);
        video.load();
        var p = video.play();
        if (p && typeof p.catch === 'function') p.catch(function () { /* autoplay blocked */ });
      }

      badge.textContent = setting.label;
      family.textContent = task.family || 'Memory-free';
      family.classList.toggle('is-free', task.group !== 'memory');
      instruction.textContent = '“' + task.instruction + '”';
      note.innerHTML = '<b>' + setting.label + '.</b> ' + setting.note +
        (task.why ? ' <span style="opacity:.85">' + task.why + '</span>' : '');

      var row = (task.scores && task.scores[state.setting]) || [];
      scores.innerHTML = '';
      (data.methods || []).forEach(function (m, i) {
        var n = row[i];
        if (typeof n !== 'number') return;
        var div = document.createElement('div');
        div.className = 'score-row' + (i === 0 ? ' is-ours' : '');
        div.innerHTML =
          '<span class="name">' + m + '</span>' +
          '<span class="bar"><i style="width:' + (n * 10) + '%"></i></span>' +
          '<span class="val">' + n + ' / 10</span>';
        scores.appendChild(div);
      });

      if (overview) {
        overview.innerHTML = '';
        data.settings.forEach(function (s) {
          var n = (task.scores && task.scores[s.id] && task.scores[s.id][0]);
          var b = document.createElement('button');
          b.type = 'button';
          b.disabled = isMissing(task, s.id);
          b.setAttribute('aria-pressed', s.id === state.setting ? 'true' : 'false');
          b.setAttribute('aria-label', s.label + ': ' + (typeof n === 'number' ? n : '–') + ' of 10');
          // The success rate exists for every cell; only the recording may be
          // absent, so say so rather than leaving a greyed bar unexplained.
          b.title = b.disabled
            ? s.label + ': ' + n + '/10 in the paper — no video recorded for this combination'
            : s.label + ': ' + n + '/10';
          b.innerHTML =
            '<span class="n">' + (typeof n === 'number' ? n : '–') + '</span>' +
            '<span class="col"><i style="height:' + (typeof n === 'number' ? n * 10 : 0) + '%"></i></span>' +
            '<span class="t">' + (s.short || s.label) + '</span>';
          b.addEventListener('click', function () { if (!b.disabled) select(state.task, s.id); });
          overview.appendChild(b);
        });
      }

      keyframes.innerHTML = '';
      (task.keyframes || []).forEach(function (step, i, arr) {
        var fig = document.createElement('figure');
        var label = i === 0 ? 'Start' : (i === arr.length - 1 ? 'Final' : 'Step ' + step);
        fig.innerHTML =
          '<img src="' + KF_ROOT + '/' + task.id + '/k' + (i + 1) + '.jpg" loading="lazy"' +
          ' alt="' + task.label + ', keyframe ' + (i + 1) + '">' +
          '<figcaption>' + label + '</figcaption>';
        keyframes.appendChild(fig);
      });
    }

    video.addEventListener('error', function () {
      root.classList.add('is-unavailable');
      if (missingNote) missingNote.textContent = 'Could not load ' + video.getAttribute('src');
    });

    render();

    // Pause when scrolled away; resume when back in view.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (root.classList.contains('is-unavailable')) return;
          if (e.isIntersecting) {
            var p = video.play();
            if (p && typeof p.catch === 'function') p.catch(function () {});
          } else {
            video.pause();
          }
        });
      }, { threshold: 0.2 }).observe(root.querySelector('.demo-video'));
    }
  })();

  /* --------------------------------------------------------- Franka explorer */
  /* Same stage pattern as the DOBOT explorer, but only the six generalization
     settings — the basic tasks were never recorded and never will be, so they
     are not listed. Each item's `clips` array holds one rollout per entry (a
     setting was recorded on three different tasks) and gets a rollout switch
     over the stage; the path is `<group>/<clip.id>.mp4`. */

  (function initFrankaExplorer() {
    var root = document.getElementById('franka-explorer');
    var dataEl = document.getElementById('franka-demo-data');
    if (!root || !dataEl) return;

    var data;
    try { data = JSON.parse(dataEl.textContent); } catch (e) { return; }
    if (!data || !data.items || !data.groups) return;

    var VIDEO_ROOT = root.getAttribute('data-video-root');
    var POSTER_ROOT = root.getAttribute('data-poster-root');

    var video = root.querySelector('[data-fr-video]');
    var badge = root.querySelector('[data-fr-badge]');
    var family = root.querySelector('[data-fr-family]');
    var instruction = root.querySelector('[data-fr-instruction]');
    var note = root.querySelector('[data-fr-note]');
    var scores = root.querySelector('[data-fr-scores]');
    var scoreBlock = root.querySelector('[data-fr-scoreblock]');
    var missingNote = root.querySelector('[data-fr-missing-note]');

    var buttons = {};
    var state = { item: data.items[0].id, clip: 0 };

    // Widest `clips` array on the page decides how many switch buttons exist;
    // render() shows only as many as the selected item actually has.
    var MAX_CLIPS = data.items.reduce(function (n, t) {
      return Math.max(n, (t.clips || []).length);
    }, 0);

    function itemById(id) {
      for (var i = 0; i < data.items.length; i++) if (data.items[i].id === id) return data.items[i];
      return null;
    }
    function groupById(id) {
      for (var i = 0; i < data.groups.length; i++) if (data.groups[i].id === id) return data.groups[i];
      return null;
    }

    data.groups.forEach(function (g) {
      var row = root.querySelector('[data-fr-group="' + g.id + '"]');
      if (!row) return;
      data.items.filter(function (t) { return t.group === g.id; }).forEach(function (t) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'picker-chip';
        b.setAttribute('aria-pressed', 'false');
        b.innerHTML = t.sub
          ? t.label + ' <span class="chip-sub">· ' + t.sub + '</span>'
          : t.label;
        b.addEventListener('click', function () {
          state.item = t.id;
          state.clip = 0;
          render();
        });
        row.appendChild(b);
        buttons[t.id] = b;
      });
    });

    // Rollout switch, mirroring the DOBOT trial switch: absolutely positioned
    // over the stage, hidden for items with a single clip.
    var clipWrap = document.createElement('div');
    clipWrap.className = 'demo-trials';
    clipWrap.style.cssText = 'display:none;gap:.25rem;';
    var clipButtons = [];
    for (var ci = 0; ci < MAX_CLIPS; ci++) {
      clipButtons.push((function (i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = 'Rollout ' + (i + 1);
        b.style.cssText =
          'font:inherit;font-size:.68rem;font-weight:700;letter-spacing:.04em;' +
          'padding:.2rem .55rem;border-radius:999px;cursor:pointer;' +
          'border:1px solid rgba(255,255,255,.25);background:rgba(23,20,15,.55);color:#faf9f7;' +
          'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);';
        b.addEventListener('click', function () {
          state.clip = i;
          render();
        });
        clipWrap.appendChild(b);
        return b;
      })(ci));
    }
    var stageControls = document.createElement('div');
    stageControls.className = 'stage-controls';
    // The Franka clips are already encoded at 6× real time, so start at 1×.
    var speedCtl = makeSpeedControl(function () { return [video]; }, true, 1);
    speedCtl.watch(video);
    stageControls.appendChild(speedCtl);
    if (MAX_CLIPS > 1) stageControls.appendChild(clipWrap);
    root.querySelector('.demo-video').appendChild(stageControls);

    function render() {
      var item = itemById(state.item);
      if (!item) return;
      var group = groupById(item.group);
      var clips = item.clips || [];
      if (state.clip >= clips.length) state.clip = 0;
      var clip = clips[state.clip] || null;

      Object.keys(buttons).forEach(function (id) {
        buttons[id].setAttribute('aria-pressed', id === state.item ? 'true' : 'false');
      });

      clipWrap.style.display = clips.length > 1 ? 'flex' : 'none';
      clipButtons.forEach(function (b, i) {
        b.style.display = i < clips.length ? '' : 'none';
        b.style.background = (i === state.clip) ? 'rgba(210,98,14,.92)' : 'rgba(23,20,15,.55)';
        b.title = clips[i] ? clips[i].instruction : '';
      });

      var stem = clip ? clip.id : item.id;
      var src = VIDEO_ROOT + '/' + item.group + '/' + stem + '.mp4';
      if (missingNote) missingNote.textContent = src;
      if (video.getAttribute('src') !== src) {
        // Only a real source change clears the overlay — the error listener
        // re-adds it if the new clip is missing too. Re-clicking the active
        // chip must not hide the overlay over a video that never loaded.
        root.classList.remove('is-unavailable');
        video.setAttribute('poster', POSTER_ROOT + '/' + item.group + '__' + stem + '.jpg');
        video.setAttribute('src', src);
        video.load();
        var p = video.play();
        if (p && typeof p.catch === 'function') p.catch(function () { /* autoplay blocked */ });
      }

      badge.textContent = group ? group.label : '';
      family.textContent = group ? group.label : '';
      family.classList.toggle('is-free', item.group !== 'basic');
      var instr = (clip && clip.instruction) || item.instruction;
      instruction.textContent = instr
        ? '“' + instr + '”'
        : item.label + ' setting';
      var noteText = item.note || (group && group.note) || '';
      if (!item.scores) {
        noteText += ' Aggregate success over the 13 tasks is charted in Figure 4 in the narrative below — BridgeVLA leads RVT-2 in every setting.';
      }
      note.textContent = noteText;

      if (scoreBlock) scoreBlock.hidden = !item.scores;
      if (scores) {
        scores.innerHTML = '';
        (item.scores && data.methods ? data.methods : []).forEach(function (m, i) {
          var n = item.scores[i];
          if (typeof n !== 'number') return;
          var div = document.createElement('div');
          div.className = 'score-row' + (i === 0 ? ' is-ours' : '');
          div.innerHTML =
            '<span class="name">' + m + '</span>' +
            '<span class="bar"><i style="width:' + (n * 10) + '%"></i></span>' +
            '<span class="val">' + n + ' / 10</span>';
          scores.appendChild(div);
        });
      }
    }

    video.addEventListener('error', function () {
      root.classList.add('is-unavailable');
    });

    render();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (root.classList.contains('is-unavailable')) return;
          if (e.isIntersecting) {
            var p = video.play();
            if (p && typeof p.catch === 'function') p.catch(function () {});
          } else {
            video.pause();
          }
        });
      }, { threshold: 0.2 }).observe(root.querySelector('.demo-video'));
    }
  })();

  /* -------------------------------------------------------------- scrollspy */

  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.docnav a[href^="#"]:not(.nav-brand)'));
  var targets = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean)
    // document order, whatever order the nav lists them in
    .sort(function (a, b) {
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

  // A section anchor is a short banner, so an IntersectionObserver over the
  // anchors alone only fires while that banner is on screen — scrolling back up
  // leaves the nav on the section below until the previous banner reappears.
  // Instead treat each anchor as the *start* of a region and pick the last
  // region whose start is above a fixed reading line. Symmetric in both
  // directions, and every scroll position maps to exactly one section.
  if (targets.length) {
    var spyTicking = false;
    var syncSpy = function () {
      spyTicking = false;
      var line = window.pageYOffset + window.innerHeight * 0.35;
      var current = targets[0];
      for (var i = 0; i < targets.length; i++) {
        if (targets[i].getBoundingClientRect().top + window.pageYOffset > line) break;
        current = targets[i];
      }
      // the last section is usually too short to ever reach the reading line
      var doc = document.documentElement;
      if (window.innerHeight + window.pageYOffset >= doc.scrollHeight - 2) {
        current = targets[targets.length - 1];
      }
      navLinks.forEach(function (a) {
        a.classList.toggle('is-active', a.getAttribute('href') === '#' + current.id);
      });
    };
    var queueSpy = function () {
      if (spyTicking) return;
      spyTicking = true;
      window.requestAnimationFrame(syncSpy);
    };
    window.addEventListener('scroll', queueSpy, { passive: true });
    window.addEventListener('resize', queueSpy);
    window.addEventListener('load', syncSpy);
    syncSpy();
  }

  /* ------------------------------------------- horizontal-scroll affordance */

  var tableCards = Array.prototype.slice.call(document.querySelectorAll('.table-card'));
  function measureTables() {
    tableCards.forEach(function (card) {
      var box = card.querySelector('.table-scroll');
      if (!box) return;
      var overflows = box.scrollWidth - box.clientWidth > 4;
      card.classList.toggle('can-scroll', overflows);
      card.style.setProperty('--scroll-h', box.clientHeight + 'px');
      if (overflows && !card.querySelector('.scroll-hint')) {
        var hint = document.createElement('p');
        hint.className = 'scroll-hint';
        hint.textContent = 'Scroll sideways for the remaining columns →';
        box.insertAdjacentElement('afterend', hint);
      }
    });
  }
  measureTables();
  window.addEventListener('load', measureTables);
  window.addEventListener('resize', measureTables);

  /* -------------------------------------------------- touch-friendly dropdown */

  document.querySelectorAll('.more-research').forEach(function (wrap) {
    var trigger = wrap.querySelector('button');
    if (!trigger) return;

    function setOpen(open) {
      wrap.classList.toggle('is-open', open);
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    // Hover-open and click-to-toggle cannot both be bound: the hover fires
    // first, so the click would immediately close a menu the user just opened.
    // Pick one per input type.
    var canHover = !window.matchMedia || window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (canHover) {
      wrap.addEventListener('mouseenter', function () { setOpen(true); });
      wrap.addEventListener('mouseleave', function () { setOpen(false); });
      // Keyboard equivalent of hover — desktop only, since on a touch device
      // the tap focuses the button before the click and would invert the toggle.
      wrap.addEventListener('focusin', function () { setOpen(true); });
    } else {
      trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        setOpen(!wrap.classList.contains('is-open'));
      });
    }
    wrap.addEventListener('focusout', function (e) {
      if (!wrap.contains(e.relatedTarget)) setOpen(false);
    });
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && wrap.classList.contains('is-open')) {
        setOpen(false);
        trigger.focus();
      }
    });
  });

  /* ------------------------------------------------------------ copy bibtex */

  document.querySelectorAll('.copy-btn[data-copy-target]').forEach(function (btn) {
    // Capture the original label once: reading it inside the handler means a
    // second click within the 1.6 s window records "Copied!" as the label and
    // the button never recovers its real text.
    var label = btn.querySelector('span');
    var original = label ? label.textContent : '';
    var timer = null;

    btn.addEventListener('click', function () {
      var src = document.querySelector(btn.getAttribute('data-copy-target'));
      if (!src || !label) return;
      var text = src.textContent.trim();
      var done = function () {
        label.textContent = 'Copied!';
        clearTimeout(timer);
        timer = setTimeout(function () { label.textContent = original; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {});
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { /* noop */ }
        document.body.removeChild(ta);
      }
    });
  });
})();
