(() => {
  'use strict';

  const toast = document.getElementById('toast');
  let toastTimer = null;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1800);
  }

  /* Copy buttons */

  document.querySelectorAll('pre.copyable').forEach((pre) => {
    const code = pre.querySelector('code');
    if (!code) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-btn';
    button.textContent = 'Copy';
    button.setAttribute('aria-label', 'Copy this text');

    button.addEventListener('click', async () => {
      const text = code.textContent || '';

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          const field = document.createElement('textarea');
          field.value = text;
          field.setAttribute('readonly', '');
          field.style.position = 'fixed';
          field.style.opacity = '0';
          document.body.appendChild(field);
          field.select();
          document.execCommand('copy');
          field.remove();
        }

        button.textContent = 'Copied';
        button.classList.add('copied');
        showToast('Copied to clipboard');
        window.setTimeout(() => {
          button.textContent = 'Copy';
          button.classList.remove('copied');
        }, 1600);
      } catch {
        showToast('Could not copy — select the text manually');
      }
    });

    pre.appendChild(button);
  });

  /* Reading progress */

  const progressBar = document.getElementById('reading-progress');
  let frame = null;

  function updateProgress() {
    frame = null;

    if (progressBar) {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      progressBar.style.width = `${(ratio * 100).toFixed(2)}%`;
    }

    const links = Array.from(document.querySelectorAll('.page-nav a'));
    let current = null;

    for (const link of links) {
      const target = document.querySelector(link.getAttribute('href'));
      if (target && target.getBoundingClientRect().top <= 150) current = link;
    }

    for (const link of links) {
      link.classList.toggle('active', link === current);
      if (link === current) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    }
  }

  function scheduleUpdate() {
    if (frame !== null) return;
    frame = window.requestAnimationFrame(updateProgress);
  }

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  scheduleUpdate();

  /* Launch checklist */

  const boxes = Array.from(document.querySelectorAll('[data-check]'));
  const count = document.getElementById('checklist-count');
  const meter = document.querySelector('#checklist-progress span');
  const progress = document.getElementById('checklist-progress');
  const reset = document.getElementById('checklist-reset');
  const storageKey = 'zen-bot-list-checklist-v1';
  const total = boxes.length;

  if (boxes.length > 0) {
    let saved = {};

    try {
      saved = JSON.parse(window.localStorage.getItem(storageKey) || '{}') || {};
    } catch {
      saved = {};
    }

    boxes.forEach((box) => {
      box.checked = Boolean(saved[box.dataset.check]);
    });

    if (progress) {
      progress.setAttribute('aria-valuemax', String(total));
    }

    function updateChecklist(persist) {
      const done = boxes.filter((box) => box.checked).length;
      const percent = total > 0 ? (done / total) * 100 : 0;

      if (count) count.textContent = `${done} of ${total} complete`;
      if (meter) meter.style.width = `${percent}%`;
      if (progress) progress.setAttribute('aria-valuenow', String(done));

      if (persist) {
        const state = {};
        boxes.forEach((box) => {
          if (box.checked) state[box.dataset.check] = true;
        });

        try {
          window.localStorage.setItem(storageKey, JSON.stringify(state));
        } catch {
          /* Private browsing or a full quota should not block the checklist. */
        }
      }
    }

    boxes.forEach((box) => {
      box.addEventListener('change', () => updateChecklist(true));
    });

    if (reset) {
      reset.addEventListener('click', () => {
        boxes.forEach((box) => {
          box.checked = false;
        });
        updateChecklist(true);
        showToast('Checklist reset');
      });
    }

    updateChecklist(false);
  }
})();
