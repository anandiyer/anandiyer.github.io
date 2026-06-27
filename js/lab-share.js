/* canonical.cc — Lab share widget
 *
 * Drop-in, dependency-free social-share UI for any /labs/* page.
 *
 * How to use on a lab page:
 *   1. (Optional) place a mount point inside the hero:
 *        <div data-lab-share data-github-path="labs/lookalike"></div>
 *      This renders the inline share strip (X / LinkedIn / Substack + "View source on GitHub").
 *   2. Load this script. It automatically appends a floating share button (FAB)
 *      to the bottom-right corner of every lab page (opt out with
 *      <body data-lab-share-no-fab>).
 *   3. (Lookalike only) call window.canonicalShare.showLookalikeModal() after
 *      the first successful result. The widget guards on sessionStorage so it
 *      only fires once per session.
 *
 * All pre-populated copy is derived from the page's existing meta tags:
 *   og:title → share text
 *   link[rel=canonical] → shared URL
 * That way the share strip stays in sync whenever the page meta changes.
 */
(function () {
  if (window.__canonicalShareLoaded) return;
  window.__canonicalShareLoaded = true;

  var REPO_TREE = 'https://github.com/anandiyer/anandiyer.github.io/tree/master/';
  var TWITTER_HANDLE = 'canonicalcc';

  function metaContent(name) {
    var el = document.querySelector(
      'meta[property="' + name + '"], meta[name="' + name + '"]'
    );
    return el ? (el.getAttribute('content') || '') : '';
  }

  function pageTitle() {
    return metaContent('og:title') || document.title || 'Canonical Labs';
  }

  function pageDescription() {
    return metaContent('og:description') || metaContent('description') || '';
  }

  function pageUrl() {
    var link = document.querySelector('link[rel="canonical"]');
    if (link && link.href) return link.href;
    return location.origin + location.pathname;
  }

  function githubPath() {
    var bodyPath = document.body && document.body.getAttribute('data-share-github-path');
    if (bodyPath) return bodyPath;
    var mount = document.querySelector('[data-lab-share][data-github-path]');
    if (mount) return mount.getAttribute('data-github-path');
    return '';
  }

  function githubUrl() {
    var p = githubPath();
    return p ? REPO_TREE + p : '';
  }

  function shareUrls() {
    var url = pageUrl();
    var title = pageTitle();
    var noteText = title + ' — ' + url;
    return {
      x:
        'https://twitter.com/intent/tweet?text=' +
        encodeURIComponent(title) +
        '&url=' +
        encodeURIComponent(url) +
        '&via=' +
        TWITTER_HANDLE,
      linkedin:
        'https://www.linkedin.com/sharing/share-offsite/?url=' +
        encodeURIComponent(url),
      // Substack Notes composer. Requires the user to be logged in to Substack;
      // we accept that tradeoff since there's no public, login-free intent URL.
      substack:
        'https://substack.com/note/new?text=' + encodeURIComponent(noteText),
    };
  }

  // ─── SVG icons (inline, currentColor-driven) ──────────────────────────
  function iconX() {
    return (
      '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">' +
      '<path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>' +
      '</svg>'
    );
  }
  function iconLinkedIn() {
    return (
      '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">' +
      '<path fill="currentColor" d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.86-3.04-1.87 0-2.16 1.46-2.16 2.96v5.65H9.34V9h3.4v1.56h.05c.47-.9 1.63-1.86 3.36-1.86 3.59 0 4.25 2.36 4.25 5.42v6.33ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.55V9h3.57v11.45ZM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0Z"/>' +
      '</svg>'
    );
  }
  function iconSubstack() {
    return (
      '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">' +
      '<path fill="currentColor" d="M22.539 8.242H1.46V5.406h21.08v2.836ZM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46ZM22.54 0H1.46v2.836h21.08V0Z"/>' +
      '</svg>'
    );
  }
  function iconGitHub() {
    return (
      '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">' +
      '<path fill="currentColor" d="M12 .5C5.65.5.5 5.66.5 12.02c0 5.09 3.29 9.4 7.86 10.93.58.11.79-.25.79-.55v-2.12c-3.2.7-3.87-1.36-3.87-1.36-.52-1.34-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.26.74-1.55-2.56-.29-5.26-1.28-5.26-5.71 0-1.26.45-2.29 1.2-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.06 11.06 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.75.81 1.2 1.84 1.2 3.1 0 4.44-2.7 5.41-5.27 5.7.42.36.79 1.07.79 2.16v3.21c0 .31.21.67.79.55A11.53 11.53 0 0 0 23.5 12.02C23.5 5.66 18.35.5 12 .5Z"/>' +
      '</svg>'
    );
  }
  function iconShare() {
    return (
      '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">' +
      '<path fill="currentColor" d="M18 16.08a2.92 2.92 0 0 0-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11A2.93 2.93 0 0 0 18 8c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81A2.93 2.93 0 0 0 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92S20.92 19.61 20.92 18s-1.31-1.92-2.92-1.92Z"/>' +
      '</svg>'
    );
  }

  // ─── Inline share strip (mounts into <div data-lab-share>) ────────────
  function buildStrip(mount) {
    if (mount.dataset.labShareReady) return;
    mount.dataset.labShareReady = '1';

    var path = mount.getAttribute('data-github-path') || githubPath();
    var u = shareUrls();
    var gh = path ? REPO_TREE + path : '';

    mount.classList.add('lab-share-strip');
    mount.innerHTML =
      '<div class="lab-share-strip-inner">' +
      '<div class="lab-share-group">' +
      '<span class="lab-share-label">Share</span>' +
      '<a class="lab-share-btn" href="' +
      u.x +
      '" target="_blank" rel="noopener noreferrer" aria-label="Share on X" data-share="x">' +
      iconX() +
      '</a>' +
      '<a class="lab-share-btn" href="' +
      u.linkedin +
      '" target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn" data-share="linkedin">' +
      iconLinkedIn() +
      '</a>' +
      '<a class="lab-share-btn" href="' +
      u.substack +
      '" target="_blank" rel="noopener noreferrer" aria-label="Share on Substack" data-share="substack">' +
      iconSubstack() +
      '</a>' +
      '</div>' +
      (gh
        ? '<a class="lab-share-source" href="' +
          gh +
          '" target="_blank" rel="noopener noreferrer">' +
          iconGitHub() +
          '<span>View source on GitHub →</span></a>'
        : '') +
      '</div>';
  }

  // ─── Floating action button ───────────────────────────────────────────
  function buildFab() {
    if (document.body.hasAttribute('data-lab-share-no-fab')) return;
    if (document.querySelector('.lab-share-fab-root')) return;

    var u = shareUrls();
    var gh = githubUrl();
    var root = document.createElement('div');
    root.className = 'lab-share-fab-root';
    root.innerHTML =
      '<button class="lab-share-fab" type="button" aria-label="Share this lab" aria-expanded="false" aria-controls="lab-share-fab-menu">' +
      iconShare() +
      '</button>' +
      '<div class="lab-share-fab-menu" id="lab-share-fab-menu" role="menu" hidden>' +
      '<a role="menuitem" href="' +
      u.x +
      '" target="_blank" rel="noopener noreferrer" data-share="x">' +
      iconX() +
      '<span>Share on X</span></a>' +
      '<a role="menuitem" href="' +
      u.linkedin +
      '" target="_blank" rel="noopener noreferrer" data-share="linkedin">' +
      iconLinkedIn() +
      '<span>Share on LinkedIn</span></a>' +
      '<a role="menuitem" href="' +
      u.substack +
      '" target="_blank" rel="noopener noreferrer" data-share="substack">' +
      iconSubstack() +
      '<span>Share on Substack</span></a>' +
      (gh
        ? '<a role="menuitem" class="lab-share-fab-source" href="' +
          gh +
          '" target="_blank" rel="noopener noreferrer">' +
          iconGitHub() +
          '<span>View source</span></a>'
        : '') +
      '</div>';

    document.body.appendChild(root);
    var btn = root.querySelector('.lab-share-fab');
    var menu = root.querySelector('.lab-share-fab-menu');
    var closeMenu = function () {
      menu.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', 'false');
      root.classList.remove('is-open');
    };
    var openMenu = function () {
      menu.removeAttribute('hidden');
      btn.setAttribute('aria-expanded', 'true');
      root.classList.add('is-open');
    };
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (menu.hasAttribute('hidden')) openMenu();
      else closeMenu();
    });
    document.addEventListener('click', function (e) {
      if (!root.contains(e.target)) closeMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }

  // ─── Lookalike "share this" modal ─────────────────────────────────────
  // Fires once per session, after the first successful results render.
  function showLookalikeModal() {
    var KEY = 'canonical:lookalikeShareModalShown';
    try {
      if (sessionStorage.getItem(KEY) === '1') return;
      sessionStorage.setItem(KEY, '1');
    } catch (_) {
      /* sessionStorage blocked → still show, fine */
    }

    var u = shareUrls();
    var overlay = document.createElement('div');
    overlay.className = 'lab-share-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'lab-share-modal-title');
    overlay.innerHTML =
      '<div class="lab-share-modal-card">' +
      '<button class="lab-share-modal-close" type="button" aria-label="Close">✕</button>' +
      '<h2 id="lab-share-modal-title">If you\u2019ve found this useful, share it.</h2>' +
      '<p class="modal-sub">Lookalike Finder uses career-arc matching across the open web. Pass it on to a recruiter, founder, or VC who\u2019d find it useful.</p>' +
      '<div class="lab-share-modal-actions">' +
      '<a class="lab-share-modal-btn lab-share-modal-x" href="' +
      u.x +
      '" target="_blank" rel="noopener noreferrer">' +
      iconX() +
      '<span>Share on X</span></a>' +
      '<a class="lab-share-modal-btn lab-share-modal-li" href="' +
      u.linkedin +
      '" target="_blank" rel="noopener noreferrer">' +
      iconLinkedIn() +
      '<span>Share on LinkedIn</span></a>' +
      '<a class="lab-share-modal-btn lab-share-modal-ss" href="' +
      u.substack +
      '" target="_blank" rel="noopener noreferrer">' +
      iconSubstack() +
      '<span>Share on Substack</span></a>' +
      '</div>' +
      '<button type="button" class="lab-share-modal-dismiss">Maybe later</button>' +
      '</div>';

    document.body.appendChild(overlay);
    // Trigger transition on next frame
    requestAnimationFrame(function () {
      overlay.classList.add('is-visible');
    });

    function close() {
      overlay.classList.remove('is-visible');
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 220);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) {
      if (e.key === 'Escape') close();
    }
    overlay.querySelector('.lab-share-modal-close').addEventListener('click', close);
    overlay
      .querySelector('.lab-share-modal-dismiss')
      .addEventListener('click', close);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener('keydown', onKey);
  }

  // ─── Auto-mount: locate a hero and append the strip if no explicit mount ──
  // Selector order matters — first hit wins. Each lab uses a different hero
  // class, so we try the most specific first then fall back to the generic.
  var HERO_SELECTORS = [
    '[data-lab-hero]',
    '.lab-hero-content',
    '.sem-hero-content',
    '.pai-hero-content',
    '.lab-hero',
    '.sem-hero',
    '.pai-hero',
    'header.hero',
  ];

  function findHero() {
    for (var i = 0; i < HERO_SELECTORS.length; i++) {
      var el = document.querySelector(HERO_SELECTORS[i]);
      if (el) return el;
    }
    return null;
  }

  function autoMountStrip() {
    // If an explicit mount already exists (manual placement), respect it.
    if (document.querySelector('[data-lab-share]')) return false;
    var hero = findHero();
    if (!hero) return false;
    var mount = document.createElement('div');
    mount.setAttribute('data-lab-share', '');
    hero.appendChild(mount);
    buildStrip(mount);
    return true;
  }

  // For SPAs (capital-call-planner is React/Vite) the hero may not exist at
  // DOMContentLoaded. Watch for it briefly, then give up — the FAB still
  // provides share affordance even if we never find a hero.
  function watchForHero(timeoutMs) {
    if (autoMountStrip()) return;
    var done = false;
    var obs = new MutationObserver(function () {
      if (done) return;
      if (autoMountStrip()) {
        done = true;
        obs.disconnect();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () {
      done = true;
      obs.disconnect();
    }, timeoutMs);
  }

  function init() {
    try {
      // 1) Explicit mounts placed by lab pages.
      var mounts = document.querySelectorAll('[data-lab-share]');
      for (var i = 0; i < mounts.length; i++) buildStrip(mounts[i]);
      // 2) If none, auto-mount or wait for a hero (handles SPAs).
      if (mounts.length === 0) watchForHero(5000);
      // 3) FAB always mounts to <body> immediately.
      buildFab();
    } catch (err) {
      // Surface widget errors in the console — silent failures are the worst
      // kind of bug in a "share button doesn't appear" scenario.
      console.error('[canonical-share] init failed:', err);
    }
  }

  window.canonicalShare = {
    showLookalikeModal: showLookalikeModal,
    refresh: init,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
