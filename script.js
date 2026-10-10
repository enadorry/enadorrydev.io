(() => {
  const pet = document.getElementById('pet');
  const canvas = document.getElementById('pet-canvas');
  const ctx = canvas.getContext('2d');
  const sheet = new Image();
  sheet.src = '/assets/shizuku.png';
  let x = window.innerWidth - 145, y = window.innerHeight - 140;
  let targetX = x, targetY = y, lastX = x, moveUntil = 0;
  let frame = 0, lastFrame = 0, facing = 1;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)');
  const heroButton = document.getElementById('hero-interact');
  const reaction = document.getElementById('hero-reaction');
  const lines = ['やっほー！', '一緒につくろう！', '今日もいいひらめき！'];
  let reactionIndex = 0, reactionTimer;
  heroButton.addEventListener('click', () => {
    reaction.textContent = lines[reactionIndex++ % lines.length];
    heroButton.classList.remove('is-reacting');
    // Restart the response even if clicked repeatedly.
    void heroButton.offsetWidth;
    heroButton.classList.add('is-reacting');
    clearTimeout(reactionTimer);
    reactionTimer = setTimeout(() => heroButton.classList.remove('is-reacting'), 1900);
  });
  function blink() {
    heroButton.classList.add('is-blinking');
    setTimeout(() => {
      heroButton.classList.remove('is-blinking');
      setTimeout(blink, 2600 + Math.random() * 2700);
    }, 150);
  }
  if (!reduceMotion.matches) setTimeout(blink, 1700);
  function placeDock() { if (coarse.matches) { targetX = window.innerWidth - 100; targetY = window.innerHeight - 115; } }
  placeDock();
  window.addEventListener('resize', placeDock);
  window.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    targetX = Math.max(0, Math.min(window.innerWidth - 90, e.clientX + 17));
    targetY = Math.max(0, Math.min(window.innerHeight - 105, e.clientY + 14));
    if (Math.abs(targetX - lastX) > 3) facing = targetX < lastX ? -1 : 1;
    lastX = targetX;
    moveUntil = performance.now() + 240;
  }, { passive:true });
  function animate(now) {
    const moving = !coarse.matches && !reduceMotion.matches && now < moveUntil;
    const ease = reduceMotion.matches ? 1 : .13;
    x += (targetX - x) * ease; y += (targetY - y) * ease;
    pet.style.transform = `translate3d(${x}px,${y}px,0)`;
    if (sheet.complete && sheet.naturalWidth) {
      if (now - lastFrame > (moving ? 85 : 240)) { frame++; lastFrame = now; }
      ctx.clearRect(0,0,192,208);
      // The ChatGPT pet sprite sheet uses 192×208 cells (8 columns, 11 rows).
      const row = moving ? (facing < 0 ? 2 : 1) : 0;
      const count = moving ? 8 : 6;
      ctx.drawImage(sheet,(frame % count)*192,row*208,192,208,0,0,192,208);
    }
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();

// Every shelf companion has a shuffle bag covering the complete pet atlas.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const actions = [
    {key:'idle', durations:[280,110,110,140,140,320], line:'ふぅ、ひとやすみ。'},
    {key:'walk-right', durations:[120,120,120,120,120,120,120,220], line:'ちょっとおさんぽ！'},
    {key:'walk-left', durations:[120,120,120,120,120,120,120,220], line:'ただいまー！'},
    {key:'greet', durations:[140,140,140,280], line:'やっほー！'},
    {key:'jump', durations:[140,140,140,140,280], line:'ぴょんっ！'},
    {key:'failed', durations:[140,140,140,140,140,140,140,240], line:'むぅ…もう一回！'},
    {key:'waiting', durations:[150,150,150,150,150,260], line:'次は何をつくる？'},
    {key:'working', durations:[120,120,120,120,120,220], line:'まかせて、作業中！'},
    {key:'review', durations:[150,150,150,150,150,280], line:'ふむふむ、確認中…。'},
    {key:'look', durations:Array(16).fill(230), line:'きょろきょろ…見つけた！'}
  ];
  actions.forEach(action => action.period = action.durations.reduce((sum, ms) => sum + ms, 0));
  const message = document.createElement('div');
  message.className = 'pet-message';message.setAttribute('role', 'status');document.body.append(message);
  let messageTimer;
  window.addEventListener('scroll', () => message.classList.remove('is-visible'), {passive:true});
  const images = new Map();
  function sharedImage(src) {
    if (!images.has(src)) {const image = new Image();image.src = src;images.set(src, image);}
    return images.get(src);
  }
  function chooseAction(item) {
    if (!item.bag.length) {
      item.bag = actions.slice();
      for (let i = item.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [item.bag[i], item.bag[j]] = [item.bag[j], item.bag[i]];
      }
      // Avoid consecutive repeats at the boundary between two full bags.
      if (item.bag[item.bag.length-1].key === item.previous || (!item.previous && item.bag[item.bag.length-1].key === 'idle')) {
        [item.bag[0], item.bag[item.bag.length-1]] = [item.bag[item.bag.length-1], item.bag[0]];
      }
    }
    const action = item.bag.pop();item.previous = action.key;return action;
  }
  const companions = [...document.querySelectorAll('.room-pet')].map((button, index) => {
    const image = sharedImage(`/assets/room/${button.dataset.character}-${button.dataset.pose}.webp`);
    const item = {button, image, ctx:button.querySelector('canvas').getContext('2d'), frames:Number(button.dataset.frames), offset:index*173, startedAt:0, bag:[], previous:null, action:null, timer:null};
    button.addEventListener('click', () => {
      item.action = chooseAction(item);
      item.reactionImage = sharedImage(`/assets/room/${button.dataset.character}-${item.action.key}.webp`);
      item.startedAt = performance.now();
      const bubbleDuration = 2400;
      button.dataset.reaction = item.action.key;
      button.querySelector('.room-pet-speech').textContent = item.action.line;
      button.classList.add('is-chatting');
      message.textContent = item.action.line;
      const bounds = button.getBoundingClientRect();
      message.style.left = `${Math.max(8, Math.min(innerWidth-168, bounds.left+bounds.width/2-70))}px`;
      message.style.top = `${Math.max(8, bounds.top-65)}px`;
      message.classList.add('is-visible');
      clearTimeout(messageTimer);messageTimer = setTimeout(() => message.classList.remove('is-visible'), bubbleDuration);
      clearTimeout(item.timer);item.timer = setTimeout(() => button.classList.remove('is-chatting'), bubbleDuration);
    });
    return item;
  });
  const visible = new Set();
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) visible.add(entry.target);else visible.delete(entry.target);
  }), {rootMargin:'100px'});
  companions.forEach(item => observer.observe(item.button));
  let last = 0;
  function render(now) {
    if (!document.hidden && now-last >= 50) {
      last = now;
      for (const item of companions) {
        if (!visible.has(item.button)) continue;
        const reacting = item.action !== null;
        let image = reacting ? item.reactionImage : item.image;
        // An uncached animation keeps the portrait visible while its image loads.
        const ready = image && image.complete && image.naturalWidth;
        if (!ready) image = item.image;
        if (!image.complete || !image.naturalWidth) continue;
        let frame;
        if (reacting && ready) {
          frame = 0;
          if (!reduced.matches) {
            let elapsed = (now-item.startedAt) % item.action.period;
            while (frame < item.action.durations.length-1 && elapsed >= item.action.durations[frame]) {
              elapsed -= item.action.durations[frame];frame++;
            }
          }
        } else {
          const watching = item.button.matches(':hover, :focus-visible');
          frame = reduced.matches || !watching ? Number(item.button.dataset.stillFrame || 0) % item.frames : Math.floor((now+item.offset)/260) % item.frames;
        }
        item.ctx.clearRect(0,0,192,208);
        item.ctx.drawImage(image,frame*192,0,192,208,0,0,192,208);
      }
    }
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
})();
