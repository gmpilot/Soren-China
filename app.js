(() => {
  'use strict';
  const products = window.SOREN_PRODUCTS || [];
  const byCode = new Map(products.map(item => [item.code, item]));
  const labels = { all: 'All products', fragrances: 'Fragrances', babywear: 'Babywear', coffee: 'Coffee machines' };
  const pages = { fragrances: 'Soren Fragrances', babywear: 'Soren Babywear', coffee: 'Soren Coffee Machines' };
  const slides = [
    { key: 'fragrances', title: 'The Fragrance', italic: 'Atlas.', desc: 'Pocket sprays, statement bottles and gourmand scents. Explore the fragrance collection for wholesale buyers.', action: 'Explore fragrances', alt: 'An amber fragrance bottle on stone with orange peel and iris' },
    { key: 'babywear', title: 'The Little', italic: 'Wardrobe.', desc: 'From printed shorties to hooded pramsuits, browse babywear by style, colour and order quantity.', action: 'Explore babywear', alt: 'Cocoa and cream bear-ear pramsuits laid out on linen' },
    { key: 'coffee', title: 'The Espresso', italic: 'Collection.', desc: 'Compare home and semi-automatic espresso machines. Choose a configuration and request a model-specific quote.', action: 'Explore coffee machines', alt: 'Cream espresso machine pouring espresso into two cups' }
  ];
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  const icon = name => '<svg aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
  const money = p => p.price != null ? 'USD ' + p.price + ' / piece' : p.range ? 'USD ' + p.range + ' · collection range' : 'Price on enquiry';
  const pageSize = 12;
  const state = { category:'all', family:'', query:'', sort:'featured', page:1 };
  const featureCodes = ['SR-202','LW-01','HE-01','SR-303','LW-07','SE-02','SR-204','LW-52','HE-05','SR-305','LW-14','SE-05'];
  const first = featureCodes.map(code => byCode.get(code)).filter(Boolean);
  const featured = [...first, ...products.filter(item => !featureCodes.includes(item.code))];
  let slide = 0;
  let detailCode = '';
  let returnHash = '';
  let saved = {};
  const storeKey = 'soren.trade.enquiry.v1';
  try {
    const previous = JSON.parse(localStorage.getItem(storeKey) || '{}');
    for (const [code, qty] of Object.entries(previous || {})) {
      if (byCode.has(code) && Number.isSafeInteger(qty) && qty > 0) saved[code] = qty;
    }
  } catch { /* Private browsing can disable local storage. */ }

  function setSlide(number) {
    slide = (number + slides.length) % slides.length;
    const item = slides[slide];
    document.querySelector('.hero').dataset.category = item.key;
    $('hero-title').innerHTML = esc(item.title) + '<br><em>' + esc(item.italic) + '</em>';
    $('hero-desc').textContent = item.desc;
    $('hero-cta').textContent = item.action;
    $('hero-cta').href = '#catalogue/' + item.key;
    $('hero-picture').querySelector('source').srcset = 'assets/hero/' + item.key + '-small.webp';
    $('hero-img').src = 'assets/hero/' + item.key + '.webp';
    $('hero-img').alt = item.alt;
    $('slide-index').textContent = '0' + (slide + 1) + ' / 03';
    document.querySelectorAll('[data-slide]').forEach((b,i) => b.setAttribute('aria-pressed', String(i === slide)));
  }

  function syncSaved() {
    try { localStorage.setItem(storeKey, JSON.stringify(saved)); } catch { /* Keep this session in memory. */ }
    const keys = Object.keys(saved);
    document.querySelectorAll('.count').forEach(b => { b.textContent = keys.length; b.hidden = !keys.length; });
    document.querySelectorAll('[data-add]').forEach(b => {
      const item = byCode.get(b.dataset.add);
      if (!item) return;
      const included = Object.hasOwn(saved, item.code);
      b.setAttribute('aria-pressed', String(included));
      b.setAttribute('aria-label', (included ? 'Remove ' : 'Add ') + item.name + (included ? ' from enquiry list' : ' to enquiry list'));
      b.title = b.getAttribute('aria-label');
      b.innerHTML = icon(included ? 'check' : 'plus') + (b.classList.contains('detail-add') ? (included ? 'Added to enquiry list' : 'Add to enquiry list') : '');
    });
  }

  function setCategory(category) {
    state.category = Object.hasOwn(labels, category) ? category : 'all';
    state.family = ''; state.query = ''; state.page = 1; state.sort = 'featured';
    $('search').value = ''; $('sort').value = state.sort;
    const available = products.filter(p => state.category === 'all' || p.category === state.category);
    const families = [...new Set(available.map(p=>p.family))].sort();
    $('family').innerHTML = '<option value="">All families</option>' + families.map(s=>'<option>' + esc(s) + '</option>').join('');
    renderCatalogue();
  }

  function renderCatalogue() {
    const terms = state.query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    let found = featured.filter(p => (state.category === 'all' || p.category === state.category) &&
      (!state.family || p.family === state.family) &&
      terms.every(term => [p.name,p.code,p.family,labels[p.category],p.description].join(' ').toLowerCase().includes(term)));
    if (state.sort !== 'featured') found = [...found].sort((a,b)=>a[state.sort].localeCompare(b[state.sort],'en',{numeric:true}));
    const last = Math.ceil(found.length / pageSize);
    state.page = Math.max(1,Math.min(state.page,last));
    const offset = (state.page - 1) * pageSize;
    const subset = found.slice(offset,offset + pageSize);
    $('tabs').innerHTML = Object.entries(labels).map(([key,label]) => {
      const count = key === 'all' ? products.length : products.filter(p=>p.category===key).length;
      return '<button data-cat="' + key + '" aria-pressed="' + (state.category===key) + '">' + esc(label) + '<small>' + count + '</small></button>';
    }).join('');
    $('results').textContent = found.length ? 'Showing ' + (offset+1) + '–' + (offset+subset.length) + ' of ' + found.length + ' products' : '0 matching products';
    $('cards').innerHTML = subset.map(p => {
      const link = '#product/' + p.code;
      return '<article class="card"><a class="thumb" href="'+link+'" aria-label="View '+esc(p.name)+'"><img loading="lazy" width="720" height="800" src="'+esc(p.image)+'" alt="'+esc(p.name)+'"></a>'
      +'<button class="add-item" data-add="'+p.code+'"></button><div class="card-meta"><span>'+esc(labels[p.category])+'</span><span>'+esc(p.code)+'</span></div><h3><a href="'+link+'">'+esc(p.name)+'</a></h3><p class="card-price">'+esc(money(p))+'</p></article>';
    }).join('');
    $('empty').hidden = found.length > 0;
    $('pager').innerHTML = '';
    if (last > 1) {
      for (let i=0;i<=last+1;i++) {
        const b = document.createElement('button');
        const edge = i===0 || i===last+1;
        const target = i===0 ? state.page-1 : i===last+1 ? state.page+1 : i;
        b.dataset.page = target;
        b.disabled = target < 1 || target > last;
        b.setAttribute('aria-label',i===0?'Previous results':i===last+1?'Next results':'Show results page '+i);
        if (!edge && state.page===i) b.setAttribute('aria-current','page');
        if (edge) b.innerHTML = icon(i===0?'prev':'next'); else b.textContent = i;
        $('pager').append(b);
      }
    }
    syncSaved();
  }

  function lockBody() { document.body.classList.toggle('locked', !!document.querySelector('dialog[open]')); }

  function productDetail(p) {
    detailCode = p.code;
    const terms = [
      ['Product code',p.code], ['Collection',p.family],
      [p.range ? 'Collection range' : 'Unit price',p.range ? 'USD '+p.range+' / machine' : money(p)],
      ['Minimum order',p.moq ? p.moq+' pieces' : 'Ask for a quote']
    ];
    $('detail-body').innerHTML = '<div class="detail-grid"><img class="detail-image" src="'+esc(p.image)+'" alt="'+esc(p.name)+'"><div class="detail-copy"><p class="eyebrow">'+esc(labels[p.category])+'</p>'
      +'<h2 id="detail-title">'+esc(p.name)+'</h2><p>'+esc(p.description)+'</p><dl>'+terms.map(([k,v])=>'<div><dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd></div>').join('')+'</dl>'
      +(p.range ? '<p>Request an exact quote for this model.</p>' : p.category==='fragrances' ? '<p>Discounts are available for larger orders.</p>' : '')
      +'<button class="btn primary" id="ask-product">'+icon('wa')+'Enquire about this product</button><button class="btn outline detail-add" data-add="'+p.code+'"></button></div></div>';
    if (!$('detail').open) $('detail').showModal();
    lockBody(); syncSaved();
    document.title = p.name + ' | Soren';
  }

  function dismissDetail() {
    if ($('detail').open) $('detail').close();
    if (location.hash.startsWith('#product/')) history.replaceState(null,'',location.pathname + location.search + (returnHash || '#catalogue'));
    detailCode = ''; document.title = 'Soren | Wholesale Collections'; lockBody();
  }

  function contents() { return Object.keys(saved).map(code => byCode.get(code)).filter(Boolean); }
  function defaultMessage() {
    const items = contents();
    if (!items.length) return 'Hello Soren Guo, I would like to enquire about your wholesale collections. Please share pricing and order details.';
    const lines = items.map(p => p.code+' — '+p.name+' ('+saved[p.code]+' pieces)');
    return 'Hello Soren Guo, please send me a wholesale quote for:\n\n'+lines.join('\n')+'\n\nPlease confirm availability, minimum order and shipping options.';
  }
  function linkMessage() {
    const text = $('message').value.trim();
    $('contact-link').href = 'https://wa.me/'+window.SOREN_WHATSAPP+(text ? '?text='+encodeURIComponent(text) : '');
    $('copy-status').textContent = '';
  }
  let previousMessage = '';
  let previousLines = [];
  function updateEnquiry() {
    $('enquiry-items').innerHTML = contents().map(p => '<div class="enquiry-item"><img src="'+esc(p.image)+'" alt=""><div class="item-label">'+esc(p.name)+'<small>'+p.code+'</small></div>'
      +'<label class="qty-label"><span aria-hidden="true">Qty</span><span class="sr-only">Quantity for '+esc(p.name)+'</span><input class="quantity" data-qty="'+p.code+'" type="number" min="1" step="1" value="'+saved[p.code]+'"></label>'
      +'<button class="remove" data-remove="'+p.code+'" aria-label="Remove '+esc(p.name)+'">'+icon('close')+'</button></div>').join('');
    const next = defaultMessage();
    const lines = contents().map(p => p.code+' — '+p.name+' ('+saved[p.code]+' pieces)');
    const input = $('message');
    if (input.value === previousMessage || !input.value.trim()) {
      input.value = next;
    } else if (lines.join('\n') !== previousLines.join('\n')) {
      // Keep the buyer's note when their selection or a quantity changes.
      const priorCodes = new Set(previousLines.map(line => line.split(' — ')[0]));
      const note = input.value.split('\n').filter(line => !priorCodes.has(line.split(' — ')[0])).join('\n').trim();
      input.value = [note, lines.join('\n')].filter(Boolean).join('\n\n');
    }
    previousMessage = next; previousLines = lines; linkMessage(); syncSaved();
  }
  function openEnquiry() {
    if ($('detail').open) dismissDetail();
    updateEnquiry();
    if (!$('enquiry').open) $('enquiry').showModal(); lockBody();
  }
  function route(initial=false) {
    const hash = location.hash;
    if (hash.startsWith('#product/')) {
      const product = byCode.get(hash.slice(9));
      if (product) { if ($('enquiry').open) $('enquiry').close(); productDetail(product); return; }
      history.replaceState(null,'',location.pathname+location.search+'#catalogue');
    }
    if ($('detail').open) dismissDetail();
    if (location.hash.startsWith('#catalogue')) {
      setCategory(location.hash.split('/')[1] || 'all');
      $('catalogue').scrollIntoView({behavior:'instant'});
    } else if (initial) setCategory('all');
  }

  $('prev').addEventListener('click',()=>setSlide(slide-1));
  $('next').addEventListener('click',()=>setSlide(slide+1));
  $('slide-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-slide]');if(b)setSlide(Number(b.dataset.slide));});
  function closeMenus() {
    [['collections-trigger','collection-menu'],['mobile-trigger','mobile-menu']].forEach(([b,m])=>{$(m).hidden=true;$(b).setAttribute('aria-expanded','false');});
  }
  [['collections-trigger','collection-menu'],['mobile-trigger','mobile-menu']].forEach(([button,menu])=>$(button).addEventListener('click',()=>{
    const wasHidden = $(menu).hidden; closeMenus(); $(menu).hidden=!wasHidden; $(button).setAttribute('aria-expanded',String(wasHidden));
  }));
  $('filter-trigger').addEventListener('click',()=>{const f=$('filters');f.hidden=!f.hidden;$('filter-trigger').setAttribute('aria-expanded',String(!f.hidden));});
  $('search').addEventListener('input',()=>{state.query=$('search').value;state.page=1;renderCatalogue();});
  $('family').addEventListener('change',()=>{state.family=$('family').value;state.page=1;renderCatalogue();});
  $('sort').addEventListener('change',()=>{state.sort=$('sort').value;state.page=1;renderCatalogue();});
  $('clear').addEventListener('click',()=>setCategory(state.category));
  $('reset-empty').addEventListener('click',()=>{history.replaceState(null,'','#catalogue');setCategory('all');});
  $('pager').addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b){state.page=Number(b.dataset.page);renderCatalogue();$('catalogue').scrollIntoView({behavior:'instant'});$('catalogue-title').setAttribute('tabindex','-1');$('catalogue-title').focus({preventScroll:true});}});
  $('tabs').addEventListener('click',e=>{const b=e.target.closest('[data-cat]');if(b){const key=b.dataset.cat;history.replaceState(null,'',key==='all'?'#catalogue':'#catalogue/'+key);setCategory(key);$('tabs').querySelector('[aria-pressed="true"]').focus({preventScroll:true});}});
  $('enquiry-items').addEventListener('change',e=>{
    const i=e.target.closest('[data-qty]');if(!i)return;
    const qty=Number(i.value);if(Number.isSafeInteger(qty)&&qty>0)saved[i.dataset.qty]=qty;
    updateEnquiry();
  });
  $('message').addEventListener('input',linkMessage);
  $('copy').addEventListener('click',async()=>{
    const t=$('message');
    try { if(!navigator.clipboard)throw Error();await navigator.clipboard.writeText(t.value);$('copy-status').textContent='Message copied.'; }
    catch { t.focus();t.select(); let copied=false; try{copied=document.execCommand('copy');}catch{} $('copy-status').textContent=copied?'Message copied.':'Message selected. Use your device’s Copy command.'; }
  });
  document.addEventListener('click',e=>{
    const b=e.target.closest('a,button');
    if (!e.target.closest('.nav-collections, #mobile-trigger, #mobile-menu') || b?.closest('nav')&&b.matches('a')) closeMenus();
    if (!b) return;
    if (b.matches('[data-enquiry]')) { openEnquiry(); return; }
    if (b.matches('[data-close]')) { const d=b.closest('dialog'); if(d.id==='detail')dismissDetail();else d.close();return; }
    if (b.matches('[data-add]')) { const p=byCode.get(b.dataset.add); if(saved[p.code])delete saved[p.code];else saved[p.code]=p.moq||1;syncSaved();return; }
    if (b.matches('[data-remove]')) {delete saved[b.dataset.remove];updateEnquiry();return;}
    if (b.id==='ask-product'&&detailCode) {const p=byCode.get(detailCode);saved[p.code] ||= p.moq||1;openEnquiry();return;}
    if (b.matches('a[href^="#product/"]')) returnHash=location.hash;
    if (b.matches('a[href^="#catalogue"]')&&b.hash===location.hash) route();
  });
  for (const d of document.querySelectorAll('dialog')) {
    d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){if(d.id==='detail')dismissDetail();else d.close();}}});
    d.addEventListener('close',()=>{if(d.id==='detail'&&detailCode)dismissDetail();lockBody();});
  }
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenus();});
  window.addEventListener('hashchange',()=>route());
  document.querySelectorAll('[data-wa]').forEach(a=>{
    const number=window.SOREN_WHATSAPP;
    a.href='https://wa.me/'+number;
    a.querySelector('span').textContent = /^86\d{11}$/.test(number)
      ? '+'+number.replace(/^(86)(\d{3})(\d{4})(\d{4})$/,'$1 $2 $3 $4') : '+'+number;
  });
  $('social').innerHTML=Object.entries(pages).map(([key,name])=>'<a href="'+esc(window.SOREN_CONTACTS[key])+'" target="_blank" rel="noopener noreferrer">'+esc(name)+'</a>').join('');
  setSlide(0); setCategory('all'); route(true);
})();
