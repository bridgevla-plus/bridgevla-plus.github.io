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
        // Slides that are hidden inside an inactive carousel panel stay paused.
        if (v.closest('.slide') && !v.closest('.slide').classList.contains('is-active')) return;
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

  /* -------------------------------------------------------------- carousels */

  document.querySelectorAll('.carousel').forEach(function (carousel) {
    var slides = Array.prototype.slice.call(carousel.querySelectorAll('.slide'));
    if (slides.length < 2) {
      var solo = carousel.querySelector('.carousel-prev');
      var soloNext = carousel.querySelector('.carousel-next');
      var soloDots = carousel.querySelector('.dots');
      if (solo) solo.style.display = 'none';
      if (soloNext) soloNext.style.display = 'none';
      if (soloDots) soloDots.style.display = 'none';
      return;
    }

    var dotWrap = carousel.querySelector('.dots');
    var dots = [];
    if (dotWrap) {
      dotWrap.innerHTML = '';
      slides.forEach(function (_, i) {
        var d = document.createElement('button');
        d.type = 'button';
        d.className = 'dot' + (i === 0 ? ' is-active' : '');
        d.setAttribute('aria-label', 'Go to item ' + (i + 1));
        d.addEventListener('click', function () { show(i); });
        dotWrap.appendChild(d);
        dots.push(d);
      });
    }

    var current = 0;
    function show(n) {
      var prevVideo = slides[current].querySelector('video');
      if (prevVideo) prevVideo.pause();
      slides[current].classList.remove('is-active');
      if (dots[current]) dots[current].classList.remove('is-active');

      current = ((n % slides.length) + slides.length) % slides.length;

      slides[current].classList.add('is-active');
      if (dots[current]) dots[current].classList.add('is-active');
      var v = slides[current].querySelector('video');
      if (v) {
        v.currentTime = 0;
        var p = v.play();
        if (p && typeof p.catch === 'function') p.catch(function () {});
      }
    }

    var prev = carousel.querySelector('.carousel-prev');
    var next = carousel.querySelector('.carousel-next');
    if (prev) prev.addEventListener('click', function (e) { e.stopPropagation(); show(current - 1); });
    if (next) next.addEventListener('click', function (e) { e.stopPropagation(); show(current + 1); });
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
    trialWrap.style.cssText =
      'position:absolute;top:.6rem;right:.6rem;z-index:2;display:none;gap:.25rem;';
    var trialButtons = [0, 1].map(function (i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'Trial ' + (i + 1);
      b.style.cssText =
        'font:inherit;font-size:.68rem;font-weight:700;letter-spacing:.04em;' +
        'padding:.2rem .55rem;border-radius:999px;cursor:pointer;' +
        'border:1px solid rgba(255,255,255,.22);background:rgba(12,18,38,.55);color:#eef3ff;' +
        'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);';
      b.addEventListener('click', function () {
        state.trial = i;
        render();
      });
      trialWrap.appendChild(b);
      return b;
    });
    root.querySelector('.demo-video').appendChild(trialWrap);

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
        b.style.background = (i === state.trial) ? 'rgba(79,96,203,.85)' : 'rgba(12,18,38,.55)';
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

  /* -------------------------------------------------------------- scrollspy */

  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.docnav a[href^="#"]'));
  var targets = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && targets.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    targets.forEach(function (t) { spy.observe(t); });
  }

  /* ------------------------------------------------------ reveal on scroll */

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
        hint.textContent = 'Scroll the table sideways for the remaining columns →';
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
