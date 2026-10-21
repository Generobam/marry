export function startAlbum(items) {
  const grid = document.querySelector('#album-grid');
  const dialog = document.querySelector('#album-dialog');
  const viewport = document.querySelector('#album-viewport');
  const previous = document.querySelector('#album-prev');
  const next = document.querySelector('#album-next');
  const zoom = document.querySelector('#album-zoom');
  const caption = document.querySelector('#album-caption');
  const count = document.querySelector('#album-count');
  const feedback = document.querySelector('#album-feedback');
  const entries = items.filter(item => ['image', 'video'].includes(item.type) && item.src);
  let active = 0; let generation = 0; let opener; let scrollPosition = 0; let touchStart = null;
  grid.dataset.count = String(entries.length);
  document.querySelector('#album-empty').hidden = entries.length > 0;

  function stopMedia() {
    viewport.querySelectorAll('video').forEach(video => {
      video.pause(); video.removeAttribute('src'); video.load();
    });
    viewport.replaceChildren();
  }
  function setZoom(enabled) {
    viewport.classList.toggle('is-zoomed', enabled);
    zoom.setAttribute('aria-pressed', String(enabled));
    zoom.textContent = enabled ? '축소 −' : '확대 ＋';
    viewport.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }
  function show(index) {
    active = (index + entries.length) % entries.length;
    const item = entries[active];
    const version = ++generation;
    stopMedia(); setZoom(false); feedback.hidden = true;
    previous.disabled = next.disabled = entries.length < 2;
    count.textContent = `${active + 1} / ${entries.length}`;
    caption.textContent = item.caption || (item.type === 'video' ? '우리의 영상' : '우리의 사진');
    zoom.hidden = item.type === 'video'; zoom.disabled = true;
    const media = document.createElement(item.type === 'video' ? 'video' : 'img');
    media.className = item.type === 'video' ? 'lightbox-video' : 'lightbox-image';
    const fail = () => {
      if (version !== generation) return;
      feedback.textContent = '이 순간을 불러오지 못했어요. 잠시 후 다시 열어 주세요.';
      feedback.hidden = false; zoom.disabled = true;
    };
    media.addEventListener('error', fail);
    if (item.type === 'video') {
      media.controls = true; media.playsInline = true; media.preload = 'metadata';
      media.setAttribute('aria-label', item.caption || '웨딩 영상');
      if (item.poster) media.poster = item.poster;
      if (item.captions) {
        const track = document.createElement('track'); track.kind = 'captions'; track.src = item.captions;
        track.srclang = 'ko'; track.label = '한국어'; track.default = true; media.append(track);
      }
    } else {
      media.alt = item.alt || item.caption || '두 사람의 사진';
      media.addEventListener('load', () => { if (version === generation) zoom.disabled = false; });
      media.addEventListener('click', () => { if (!zoom.disabled) setZoom(!viewport.classList.contains('is-zoomed')); });
    }
    media.src = item.src; viewport.append(media);
  }
  function open(index, button) {
    opener = button; scrollPosition = window.scrollY;
    document.body.style.setProperty('--album-scroll-top', `${-scrollPosition}px`);
    document.body.classList.add('album-open');
    show(index); dialog.showModal();
    document.querySelector('#album-close').focus({ preventScroll: true });
  }
  function navigate(delta) { if (entries.length > 1) show(active + delta); }
  entries.forEach((item, index) => {
    const button = document.createElement('button');
    button.className = 'album-item'; button.type = 'button';
    button.setAttribute('aria-label', `${index + 1}번째 ${item.type === 'video' ? '영상' : '사진'} 크게 보기: ${item.caption || item.alt || ''}`);
    const preview = document.createElement(item.type === 'video' && !item.poster ? 'video' : 'img');
    if (preview.tagName === 'VIDEO') {
      preview.muted = true; preview.playsInline = true; preview.preload = 'metadata';
      preview.setAttribute('aria-hidden', 'true');
    } else { preview.alt = item.alt || item.caption || ''; preview.loading = 'lazy'; preview.decoding = 'async'; }
    preview.src = item.poster || item.src;
    preview.addEventListener('error', () => { preview.hidden = true; button.classList.add('media-unavailable'); });
    const label = document.createElement('span'); label.className = 'album-item-caption';
    label.textContent = item.caption || '우리의 순간';
    const badge = document.createElement('span'); badge.className = 'album-item-badge'; badge.setAttribute('aria-hidden', 'true');
    badge.textContent = item.type === 'video' ? '▷ 영상' : '＋ 크게 보기';
    button.append(preview, label, badge); button.addEventListener('click', () => open(index, button)); grid.append(button);
  });
  previous.addEventListener('click', () => navigate(-1)); next.addEventListener('click', () => navigate(1));
  zoom.addEventListener('click', () => setZoom(!viewport.classList.contains('is-zoomed')));
  document.querySelector('#album-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    generation += 1; stopMedia(); setZoom(false);
    document.body.classList.remove('album-open'); document.body.style.removeProperty('--album-scroll-top');
    window.scrollTo({ top: scrollPosition, behavior: 'instant' });
    opener?.focus({ preventScroll: true });
  });
  dialog.addEventListener('keydown', event => {
    if (event.target.closest('video') || viewport.classList.contains('is-zoomed')) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); navigate(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  viewport.addEventListener('touchstart', event => {
    touchStart = event.touches.length === 1 && event.target.tagName === 'IMG' && !viewport.classList.contains('is-zoomed')
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  viewport.addEventListener('touchmove', event => { if (event.touches.length !== 1) touchStart = null; }, { passive: true });
  viewport.addEventListener('touchcancel', () => { touchStart = null; });
  viewport.addEventListener('touchend', event => {
    if (!touchStart || !event.changedTouches.length) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y; touchStart = null;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.3) navigate(dx < 0 ? 1 : -1);
  }, { passive: true });
}
