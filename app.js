// ====================================================================
// the squad — mile hi pickleball — creator portal
// Loads data.json and renders all sections in the official brand system:
// Magnolia + Navy + Denim + Burnt Orange / Butterscotch / Aqua, with
// Fredoka (display) + Anton (impact labels) + DM Sans (body).
// Belle updates data.json via chat; the site re-renders on next load.
// ====================================================================

const $ = (sel) => document.querySelector(sel);
const fmt = (n) => new Intl.NumberFormat('en-US').format(n);

const fmtCompact = (n) => {
  if (n >= 1000000) return (n/1000000).toFixed(1).replace('.0','') + 'M';
  if (n >= 1000) return (n/1000).toFixed(1).replace('.0','') + 'K';
  return String(n);
};

const tierOf = (likes) => {
  if (likes >= 10000) return 'Viral';
  if (likes >= 1000)  return 'Hit';
  if (likes >= 250)   return 'Solid';
  if (likes >= 50)    return 'Low';
  return 'Flop';
};

// pick a brand color for the "anchor label" given a trend tag color string
const anchorClassOf = (color) => {
  switch ((color || '').toLowerCase()) {
    case 'burnt':
    case 'orange':
    case 'lime':       return 'anchor-burnt';
    case 'butter':
    case 'butterscotch': return 'anchor-butter';
    case 'aqua':
    case 'court':      return 'anchor-aqua';
    case 'denim':
    case 'blue':       return 'anchor-denim';
    case 'navy':       return 'anchor-navy';
    default:           return 'anchor-burnt';
  }
};

// rotating gradients for photo placeholders (deterministic by creator index)
const PLACEHOLDER_GRADIENTS = [
  ['#003C78', '#F05D38'], // navy → burnt
  ['#096994', '#1982A6'], // denim → aqua
  ['#F05D38', '#F39D34'], // burnt → butter
  ['#1982A6', '#003C78'], // aqua → navy
  ['#F39D34', '#F05D38'], // butter → burnt
  ['#003C78', '#1982A6'], // navy → aqua
  ['#096994', '#F39D34'], // denim → butter
  ['#F05D38', '#1982A6'], // burnt → aqua
  ['#1982A6', '#F39D34']  // aqua → butter
];

const initialsOf = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const placeholderPhoto = (c, idx) => {
  const [c1, c2] = PLACEHOLDER_GRADIENTS[idx % PLACEHOLDER_GRADIENTS.length];
  const initials = initialsOf(c.name);
  return `
    <div class="w-full h-full grid place-content-center" style="background: linear-gradient(135deg, ${c1} 0%, ${c2} 100%);">
      <div class="font-display font-semibold text-magnolia text-[28vw] sm:text-[18vw] md:text-[10rem] leading-none lowercase">${initials.toLowerCase()}</div>
    </div>`;
};

let DATA = null;

async function boot() {
  try {
    const res = await fetch('data.json', { cache: 'no-cache' });
    DATA = await res.json();
  } catch (err) {
    console.error('Failed to load data.json', err);
    return;
  }

  renderHeader();
  renderWeeklyReport();
  renderTrends();
  renderBelleComments();
  renderCreators();
  renderCharts();
  renderLeaderboard();
  renderTopVideos();
  bindModal();
}

// -------------------- WEEKLY REPORT BANNER --------------------
function renderWeeklyReport() {
  const r = DATA.weeklyReport;
  const section = $('#weeklyReport');
  if (!r) { section.classList.add('hidden'); return; }
  section.classList.remove('hidden');

  if (r.weekOf) $('#reportWeek').textContent = (r.weekOf || '').toLowerCase();
  if (r.generatedAt) {
    try {
      const d = new Date(r.generatedAt);
      $('#reportGenerated').textContent = 'generated ' + d.toUTCString().replace(' GMT', ' UTC');
    } catch (_) {}
  }

  const blocks = [];
  if (r.summary) {
    blocks.push(`
      <div>
        <div class="font-mono text-[10px] uppercase tracking-[0.18em] text-butter mb-2">overview</div>
        <p class="font-display text-base md:text-lg leading-snug">${r.summary}</p>
      </div>`);
  }
  if (r.topVideo) {
    const tv = r.topVideo;
    const linkOpen = tv.tiktokUrl ? `<a href="${tv.tiktokUrl}" target="_blank" rel="noopener" class="uline">` : '';
    const linkClose = tv.tiktokUrl ? `</a>` : '';
    blocks.push(`
      <div>
        <div class="font-mono text-[10px] uppercase tracking-[0.18em] text-butter mb-2">top video</div>
        <p class="phrase text-2xl md:text-3xl text-magnolia leading-tight">${linkOpen}${(tv.title || '').toLowerCase()}${linkClose}</p>
        <p class="font-mono text-[10px] uppercase tracking-[0.18em] text-magnolia/60 mt-1">${tv.creatorName || ''} · ${fmtCompact(tv.likes || 0)} likes</p>
      </div>`);
  }
  if (r.topCreator) {
    const tc = r.topCreator;
    blocks.push(`
      <div>
        <div class="font-mono text-[10px] uppercase tracking-[0.18em] text-butter mb-2">top creator</div>
        <p class="phrase text-2xl md:text-3xl text-magnolia leading-tight">${(tc.name || '').toLowerCase()}</p>
        <p class="font-mono text-[10px] uppercase tracking-[0.18em] text-magnolia/60 mt-1">${tc.reason || ''}</p>
      </div>`);
  }
  if (r.watchOuts && r.watchOuts.length) {
    blocks.push(`
      <div>
        <div class="font-mono text-[10px] uppercase tracking-[0.18em] text-burnt mb-2">watch out</div>
        <ul class="space-y-1">
          ${r.watchOuts.map(w => `<li class="font-mono text-xs text-magnolia/80">↗ ${w}</li>`).join('')}
        </ul>
      </div>`);
  }
  $('#reportBody').innerHTML = blocks.join('');
}

// -------------------- CHARTS (Production + Performance) --------------------
function renderCharts() {
  const creators = DATA.creators;
  if (!creators || creators.length === 0) return;

  // ---- Production: videoCount ----
  const prodMax = Math.max(...creators.map(c => c.stats?.videoCount || 0), 1);
  const prodSorted = [...creators].sort((a, b) => (b.stats?.videoCount || 0) - (a.stats?.videoCount || 0));

  $('#chartProduction').innerHTML = prodSorted.map((c, i) => {
    const value = c.stats?.videoCount || 0;
    const pct = Math.max(2, Math.round((value / prodMax) * 100));
    const isTop = i === 0;
    return `
    <li class="cursor-pointer group" data-creator="${c.id}">
      <div class="flex items-baseline justify-between mb-1 gap-3">
        <span class="font-display font-medium text-base md:text-lg text-navy lowercase truncate">${c.name}</span>
        <span class="font-impact text-2xl md:text-3xl text-navy tabular-nums leading-none">${value}</span>
      </div>
      <div class="h-5 bg-navy/10 rounded-sm overflow-hidden">
        <div class="h-full ${isTop ? 'bg-burnt' : 'bg-aqua'} transition-all duration-700 group-hover:brightness-110" style="width:${pct}%"></div>
      </div>
    </li>`;
  }).join('');

  // ---- Performance: bestVideo (peak likes) ----
  const perfMax = Math.max(...creators.map(c => c.stats?.bestVideo || 0), 1);
  const perfSorted = [...creators].sort((a, b) => (b.stats?.bestVideo || 0) - (a.stats?.bestVideo || 0));

  $('#chartPerformance').innerHTML = perfSorted.map((c, i) => {
    const value = c.stats?.bestVideo || 0;
    const pct = Math.max(2, Math.round((value / perfMax) * 100));
    const isTop = i === 0;
    return `
    <li class="cursor-pointer group" data-creator="${c.id}">
      <div class="flex items-baseline justify-between mb-1 gap-3">
        <span class="font-display font-medium text-base md:text-lg text-navy lowercase truncate">${c.name}</span>
        <span class="font-impact text-2xl md:text-3xl text-navy tabular-nums leading-none">${fmtCompact(value)}</span>
      </div>
      <div class="h-5 bg-navy/10 rounded-sm overflow-hidden">
        <div class="h-full ${isTop ? 'bg-burnt' : 'bg-denim'} transition-all duration-700 group-hover:brightness-110" style="width:${pct}%"></div>
      </div>
    </li>`;
  }).join('');

  // bind clicks to open creator modal
  document.querySelectorAll('#chartProduction li, #chartPerformance li').forEach(el => {
    el.addEventListener('click', () => openCreator(el.dataset.creator));
  });
}

// -------------------- HEADER --------------------
function renderHeader() {
  $('#seasonLabel').textContent = DATA.brand.season || '';
  $('#footerSeason').textContent = (DATA.brand.season || '').toLowerCase();
  if (DATA.brand.weekLabel) {
    $('#weekLabel').textContent = DATA.brand.weekLabel.toLowerCase();
  }
}

// -------------------- BELLE COMMENTS (coaching notes) --------------------
function renderBelleComments() {
  const section = $('#belleComments');
  const list = $('#belleCommentsList');
  const comments = (DATA.belleComments || []);
  if (!list) return;
  if (!comments.length) { if (section) section.classList.add('hidden'); return; }
  if (section) section.classList.remove('hidden');

  // newest first
  const sorted = [...comments].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  list.innerHTML = sorted.map(c => {
    const sourceClass = (c.source || '').toLowerCase() === 'tricia' ? 'anchor-burnt'
                      : (c.source || '').toLowerCase() === 'belle'   ? 'anchor-denim'
                      : 'anchor-navy';
    const sourceLabel = (c.source || 'BELLE').toUpperCase();
    const creatorName = c.creatorName || (c.creatorId ? (DATA.creators.find(x => x.id === c.creatorId) || {}).name : 'All') || 'All';
    const isAll = (creatorName || '').toLowerCase() === 'all' || creatorName === '*';

    return `
    <li class="bg-magnolia border-2 border-navy/15 rounded-lg p-5 md:p-7 hover:border-burnt transition-colors">
      <div class="flex flex-wrap items-center gap-3 mb-3">
        <span class="anchor ${sourceClass}">${sourceLabel}</span>
        <span class="font-mono text-[10px] uppercase tracking-[0.2em] text-navy/60">${(c.date || '').toLowerCase()}</span>
        <span class="font-mono text-[10px] uppercase tracking-[0.2em] text-navy/50">·</span>
        <span class="font-mono text-[10px] uppercase tracking-[0.2em] text-navy/60">${(c.week || '').toLowerCase()}</span>
        ${isAll
          ? `<span class="anchor anchor-butter ml-auto">FOR EVERYONE</span>`
          : `<span class="anchor anchor-navy ml-auto">FOR ${(creatorName || '').toUpperCase()}</span>`}
      </div>
      <p class="font-display text-lg md:text-xl leading-snug text-navy">${c.comment}</p>
    </li>`;
  }).join('');
}

// -------------------- TRENDS --------------------
function renderTrends() {
  const html = DATA.thisWeek.map((t) => {
    const assignedNames = (t.assignedTo || [])
      .map(id => DATA.creators.find(c => c.id === id))
      .filter(Boolean)
      .map(c => c.name)
      .join(' · ');

    const anchorClass = anchorClassOf(t.tagColor);
    // turn the title into lowercase "main phrase" with the last word in burnt orange
    const words = (t.title || '').toLowerCase().split(' ');
    const hot = words.length > 1 ? words.pop() : null;
    const phrase = hot
      ? `${words.join(' ')} <span class="hot">${hot}</span>`
      : (t.title || '').toLowerCase();

    return `
    <article class="bg-magnolia text-navy p-6 md:p-8 rounded-lg border-2 border-magnolia hover:border-burnt transition-colors">
      <div class="flex items-center justify-between mb-5">
        <span class="anchor ${anchorClass}">${(t.tag || '').toUpperCase()}</span>
        <span class="font-mono text-[10px] uppercase tracking-[0.18em] text-navy/60">${t.startDate} → ${t.endDate}</span>
      </div>

      <h3 class="phrase text-4xl md:text-5xl mb-5">${phrase}</h3>

      <p class="text-navy/80 leading-relaxed mb-6 max-w-prose">${t.brief}</p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <div class="font-mono text-[10px] uppercase tracking-[0.18em] text-burnt mb-2">examples</div>
          <ul class="space-y-1">
            ${(t.examples || []).map((url, i) => `
              <li><a href="${url}" target="_blank" rel="noopener" class="uline text-sm font-mono break-all text-navy">↗ example ${i+1}</a></li>
            `).join('')}
          </ul>
        </div>
        <div>
          <div class="font-mono text-[10px] uppercase tracking-[0.18em] text-burnt mb-2">drop folder</div>
          <a href="${t.dropFolder}" target="_blank" rel="noopener" class="uline text-sm font-mono break-all text-navy">↗ upload here</a>
          <div class="font-mono text-[10px] uppercase tracking-[0.18em] text-burnt mt-5 mb-2">assigned</div>
          <div class="text-sm text-navy/80">${assignedNames || '—'}</div>
        </div>
      </div>
    </article>`;
  }).join('');

  $('#trends').innerHTML = html;
}

// -------------------- CREATORS GRID --------------------
function renderCreators() {
  const html = DATA.creators.map((c, i) => {
    const num = String(i + 1).padStart(2, '0');
    // alternate anchor colors so the grid feels brandy
    const anchorPalette = ['anchor-burnt', 'anchor-denim', 'anchor-navy'];
    const anchorClass = anchorPalette[i % anchorPalette.length];

    // turn name into "first last" lowercase with last name highlighted
    const parts = (c.name || '').split(' ');
    const first = parts.slice(0, -1).join(' ').toLowerCase() || (c.name || '').toLowerCase();
    const last  = parts.length > 1 ? parts.slice(-1)[0].toLowerCase() : '';

    const photoMarkup = c.photo
      ? `<img src="${c.photo}" alt="${c.name}" loading="lazy" class="w-full h-full object-cover">`
      : placeholderPhoto(c, i);

    const editedCount = c.stats?.editedVideos ?? 0;
    const igPosts = c.stats?.igPosts;
    const igLabel = (igPosts === null || igPosts === undefined) ? 'IG —' : `IG ${fmtCompact(igPosts)}`;

    return `
    <article class="creator-card group" data-creator="${c.id}">
      <div class="relative photo-wrap aspect-[4/5] rounded-lg">
        ${photoMarkup}

        <!-- top anchor label -->
        <div class="absolute top-4 left-4">
          <span class="anchor ${anchorClass}">№ ${num}</span>
        </div>

        <!-- bottom name overlay -->
        <div class="absolute inset-x-0 bottom-0 p-4 md:p-5 bg-gradient-to-t from-navy/85 via-navy/40 to-transparent">
          <h3 class="phrase knockout text-4xl md:text-5xl">
            ${first}${last ? ' <span class="hot">' + last + '</span>' : ''}
          </h3>
          <div class="flex items-center justify-between mt-2">
            <span class="font-mono text-[10px] uppercase tracking-[0.18em] text-magnolia/80">${c.tiktokHandle || c.instagramHandle || ''}</span>
            <span class="anchor anchor-butter text-[10px] py-1 px-2">VIEW →</span>
          </div>
        </div>
      </div>

      <div class="mt-3">
        <div class="font-mono text-[10px] uppercase tracking-[0.18em] text-navy/70 truncate">${c.vibe || ''}</div>
        <div class="mt-1 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em]">
          <span class="text-burnt">${editedCount} <span class="text-navy/60">uploaded</span></span>
          <span class="text-navy/80">${igLabel}</span>
        </div>
      </div>
    </article>`;
  }).join('');

  $('#creators').innerHTML = html;

  document.querySelectorAll('.creator-card').forEach(el => {
    el.addEventListener('click', () => openCreator(el.dataset.creator));
  });
}

// -------------------- LEADERBOARD --------------------
function renderLeaderboard() {
  const ranked = [...DATA.creators]
    .sort((a, b) => (b.stats?.totalLikes || 0) - (a.stats?.totalLikes || 0));

  const html = ranked.map((c, i) => {
    const num = String(i + 1).padStart(2, '0');
    const isTop = i === 0;
    return `
    <li class="border-b-2 border-navy/20 grid grid-cols-12 gap-x-4 items-center py-5 md:py-7 cursor-pointer group hover:bg-navy hover:text-magnolia transition-colors" data-creator="${c.id}">
      <div class="col-span-2 md:col-span-1 rank-num text-5xl md:text-7xl ${isTop ? 'text-burnt' : 'text-navy group-hover:text-magnolia'}">${num}</div>
      <div class="col-span-10 md:col-span-5">
        <div class="font-display font-semibold text-2xl md:text-4xl leading-tight lowercase">${c.name}</div>
        <div class="font-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 group-hover:text-magnolia/60 mt-1">${c.tiktokHandle || ''}</div>
      </div>
      <div class="col-span-6 md:col-span-2 font-mono mt-3 md:mt-0">
        <div class="text-[10px] uppercase tracking-[0.18em] text-burnt">total likes</div>
        <div class="font-impact text-3xl md:text-4xl tabular-nums">${fmtCompact(c.stats?.totalLikes || 0)}</div>
      </div>
      <div class="col-span-6 md:col-span-2 font-mono mt-3 md:mt-0">
        <div class="text-[10px] uppercase tracking-[0.18em] text-burnt">best video</div>
        <div class="font-impact text-3xl md:text-4xl tabular-nums">${fmtCompact(c.stats?.bestVideo || 0)}</div>
      </div>
      <div class="col-span-12 md:col-span-2 font-mono mt-3 md:mt-0 md:text-right">
        <div class="text-[10px] uppercase tracking-[0.18em] text-burnt">videos</div>
        <div class="font-impact text-3xl md:text-4xl tabular-nums">${c.stats?.videoCount || 0}</div>
      </div>
    </li>`;
  }).join('');

  const ol = $('#leaderboard');
  ol.innerHTML = html;
  ol.querySelectorAll('li').forEach(el => {
    el.addEventListener('click', () => openCreator(el.dataset.creator));
  });
}

// -------------------- TOP VIDEOS --------------------
function renderTopVideos() {
  if (!DATA.topVideos || DATA.topVideos.length === 0) {
    $('#topVideos').innerHTML = `
      <div class="col-span-full bg-magnolia/10 border-2 border-magnolia/20 rounded-lg p-10 md:p-14 text-center">
        <div class="font-mono text-[11px] uppercase tracking-[0.28em] text-butter mb-3">first numbers monday</div>
        <h3 class="phrase text-magnolia text-4xl md:text-5xl mb-3">
          the squad is <span class="hot">filming</span>.
        </h3>
        <p class="font-display text-lg md:text-xl text-magnolia/75 max-w-xl mx-auto">
          Posts go live this week. Top videos + leaderboard update here as soon as the first TikToks drop.
        </p>
      </div>`;
    return;
  }

  const sorted = [...DATA.topVideos].sort((a, b) => b.likes - a.likes);

  const html = sorted.map((v) => {
    const creator = DATA.creators.find(c => c.id === v.creatorId);
    const trend = DATA.thisWeek.find(t => t.id === v.trendId);
    const tier = v.tier || tierOf(v.likes);
    const eng = v.views ? ((v.likes / v.views) * 100).toFixed(1) : '—';

    // title to lowercase phrase, last word in orange
    const words = (v.title || '').toLowerCase().split(' ');
    const hot = words.length > 1 ? words.pop() : null;
    const phrase = hot ? `${words.join(' ')} <span class="hot">${hot}</span>` : (v.title || '').toLowerCase();

    return `
    <a href="${v.url}" target="_blank" rel="noopener" class="block group">
      <div class="aspect-[3/4] bg-navy overflow-hidden relative rounded-lg">
        <img src="${v.thumbnail}" alt="${v.title}" loading="lazy" class="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105">
        <div class="absolute top-3 left-3 tier tier-${tier}">${tier.toUpperCase()}</div>
        <div class="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <span class="anchor anchor-navy text-[10px] py-1 px-2">${v.postedDate}</span>
          <span class="anchor anchor-burnt text-[10px] py-1 px-2">${fmtCompact(v.likes)} ♥</span>
        </div>
      </div>
      <div class="mt-4">
        <h4 class="phrase text-3xl md:text-4xl text-magnolia">${phrase}</h4>
        <div class="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-magnolia/60">
          <span>${creator ? creator.name.toLowerCase() : ''}</span>
          <span>${trend ? trend.title.toLowerCase() : ''}</span>
        </div>
        <div class="mt-4 grid grid-cols-3 gap-3 font-mono">
          <div>
            <div class="text-[9px] uppercase tracking-[0.18em] text-butter">likes</div>
            <div class="font-impact text-2xl text-magnolia tabular-nums">${fmt(v.likes)}</div>
          </div>
          <div>
            <div class="text-[9px] uppercase tracking-[0.18em] text-butter">views</div>
            <div class="font-impact text-2xl text-magnolia tabular-nums">${fmtCompact(v.views || 0)}</div>
          </div>
          <div>
            <div class="text-[9px] uppercase tracking-[0.18em] text-butter">eng.</div>
            <div class="font-impact text-2xl text-magnolia tabular-nums">${eng}%</div>
          </div>
        </div>
      </div>
    </a>`;
  }).join('');

  $('#topVideos').innerHTML = html;
}

// -------------------- MODAL --------------------
function bindModal() {
  $('#modalMask').addEventListener('click', closeModal);
  $('#modalClose').addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
}

function openCreator(id) {
  const c = DATA.creators.find(x => x.id === id);
  if (!c) return;

  const assignedTrends = DATA.thisWeek.filter(t => (t.assignedTo || []).includes(id));

  const trendsHtml = assignedTrends.length
    ? assignedTrends.map(t => {
        const words = (t.title || '').toLowerCase().split(' ');
        const hot = words.length > 1 ? words.pop() : null;
        const phrase = hot ? `${words.join(' ')} <span class="hot">${hot}</span>` : (t.title || '').toLowerCase();
        return `
        <article class="border-t-2 border-navy/15 py-5">
          <div class="flex items-center justify-between mb-3">
            <span class="anchor ${anchorClassOf(t.tagColor)}">${(t.tag || '').toUpperCase()}</span>
            <span class="font-mono text-[10px] uppercase tracking-[0.18em] text-navy/60">${t.startDate} → ${t.endDate}</span>
          </div>
          <h4 class="phrase text-3xl text-navy mb-3">${phrase}</h4>
          <p class="text-navy/80 leading-relaxed">${t.brief}</p>

          <div class="mt-4 space-y-1">
            ${(t.examples || []).map((url, i) => `
              <div><a href="${url}" target="_blank" rel="noopener" class="uline text-sm font-mono break-all text-navy">↗ example ${i+1}</a></div>
            `).join('')}
          </div>
          <div class="mt-4">
            <a href="${t.dropFolder}" target="_blank" rel="noopener" class="anchor anchor-burnt">
              UPLOAD HERE ↗
            </a>
          </div>
        </article>`;
      }).join('')
    : `<p class="text-navy/70 mt-4 font-display text-xl">No trends assigned this week. Stand by — Belle is cooking something.</p>`;

  // name phrase
  const parts = (c.name || '').split(' ');
  const first = parts.slice(0, -1).join(' ').toLowerCase() || (c.name || '').toLowerCase();
  const last  = parts.length > 1 ? parts.slice(-1)[0].toLowerCase() : '';
  const namePhrase = last ? `${first} <span class="hot">${last}</span>` : first;

  const idx = DATA.creators.findIndex(x => x.id === id);
  const photoMarkup = c.photo
    ? `<img src="${c.photo}" alt="${c.name}" class="w-full h-full object-cover">`
    : placeholderPhoto(c, idx);

  $('#modalContent').innerHTML = `
    <div class="aspect-[4/5] -mx-5 md:-mx-10 mb-6 overflow-hidden bg-navy">
      ${photoMarkup}
    </div>

    <div class="font-mono text-[10px] uppercase tracking-[0.2em] text-burnt mb-2">${c.vibe || ''}</div>
    <h2 class="phrase text-6xl md:text-7xl text-navy">${namePhrase}</h2>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
      <div class="bg-magnolia border-2 border-burnt p-3 rounded">
        <div class="font-mono text-[9px] uppercase tracking-[0.18em] text-burnt">uploaded</div>
        <div class="font-impact text-2xl text-navy tabular-nums">${c.stats?.editedVideos ?? 0}</div>
        <div class="font-mono text-[8px] uppercase tracking-[0.18em] text-navy/50 mt-1">edited videos</div>
      </div>
      <div class="bg-magnolia border-2 border-navy/15 p-3 rounded">
        <div class="font-mono text-[9px] uppercase tracking-[0.18em] text-burnt">ig posts</div>
        <div class="font-impact text-2xl text-navy tabular-nums">${(c.stats?.igPosts === null || c.stats?.igPosts === undefined) ? '—' : fmtCompact(c.stats.igPosts)}</div>
        <div class="font-mono text-[8px] uppercase tracking-[0.18em] text-navy/50 mt-1">grid total</div>
      </div>
      <div class="bg-magnolia border-2 border-navy/15 p-3 rounded">
        <div class="font-mono text-[9px] uppercase tracking-[0.18em] text-burnt">ig followers</div>
        <div class="font-impact text-2xl text-navy tabular-nums">${(c.stats?.igFollowers === null || c.stats?.igFollowers === undefined) ? '—' : fmtCompact(c.stats.igFollowers)}</div>
        <div class="font-mono text-[8px] uppercase tracking-[0.18em] text-navy/50 mt-1">on instagram</div>
      </div>
      <div class="bg-magnolia border-2 border-navy/15 p-3 rounded">
        <div class="font-mono text-[9px] uppercase tracking-[0.18em] text-burnt">likes</div>
        <div class="font-impact text-2xl text-navy tabular-nums">${fmtCompact(c.stats?.totalLikes || 0)}</div>
        <div class="font-mono text-[8px] uppercase tracking-[0.18em] text-navy/50 mt-1">tiktok total</div>
      </div>
    </div>

    <div class="mt-8 space-y-3">
      ${(c.instagram && c.instagramHandle) ? `<a href="${c.instagram}" target="_blank" rel="noopener" class="flex items-center justify-between border-b-2 border-navy/15 pb-3 hover:border-burnt"><span class="font-mono text-[10px] uppercase tracking-[0.18em] text-burnt">instagram</span><span class="font-display font-semibold text-xl lowercase">${c.instagramHandle} ↗</span></a>` : ''}
      ${(c.tiktok && c.tiktokHandle) ? `<a href="${c.tiktok}" target="_blank" rel="noopener" class="flex items-center justify-between border-b-2 border-navy/15 pb-3 hover:border-burnt"><span class="font-mono text-[10px] uppercase tracking-[0.18em] text-burnt">tiktok</span><span class="font-display font-semibold text-xl lowercase">${c.tiktokHandle} ↗</span></a>` : ''}
      ${c.driveFolder ? `<a href="${c.driveFolder}" target="_blank" rel="noopener" class="flex items-center justify-between border-b-2 border-navy/15 pb-3 hover:border-burnt"><span class="font-mono text-[10px] uppercase tracking-[0.18em] text-burnt">drive folder</span><span class="font-display font-semibold text-xl lowercase">all content ↗</span></a>` : ''}
      ${c.editedFolder ? `<a href="${c.editedFolder}" target="_blank" rel="noopener" class="flex items-center justify-between border-b-2 border-navy/15 pb-3 hover:border-burnt"><span class="font-mono text-[10px] uppercase tracking-[0.18em] text-burnt">edited (post-ready)</span><span class="font-display font-semibold text-xl lowercase">open ↗</span></a>` : ''}
      ${c.email ? `<a href="mailto:${c.email}" class="flex items-center justify-between border-b-2 border-navy/15 pb-3 hover:border-burnt"><span class="font-mono text-[10px] uppercase tracking-[0.18em] text-burnt">email</span><span class="font-mono text-sm">${c.email}</span></a>` : ''}
      ${c.phone ? `<a href="tel:${c.phone.replace(/[^0-9+]/g,'')}" class="flex items-center justify-between border-b-2 border-navy/15 pb-3 hover:border-burnt"><span class="font-mono text-[10px] uppercase tracking-[0.18em] text-burnt">phone</span><span class="font-mono text-sm">${c.phone}</span></a>` : ''}
    </div>

    <div class="mt-10">
      <div class="font-mono text-[10px] uppercase tracking-[0.2em] text-burnt mb-2">this week's assignment</div>
      ${trendsHtml}
    </div>
  `;

  $('#modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  $('#modal').classList.add('hidden');
  document.body.style.overflow = '';
}

boot();
