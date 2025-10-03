// Главная страница — рекомендации/ленты. Все изображения = указанная ссылка.
const LS = 'mini_shop_state_v1';
const IMG = 'https://papik.pro/uploads/posts/2023-01/1674137322_papik-pro-p-pisyun-risunok-10.jpg';

const initialState = () => ({
  categories: [
    { id:'cat-1', name:'Категория A', image: IMG, slugEn:'a' },
    { id:'cat-2', name:'Категория B', image: IMG, slugEn:'b' },
    { id:'cat-3', name:'Категория C', image: IMG, slugEn:'c' },
    { id:'cat-4', name:'Категория D', image: IMG, slugEn:'d' },
  ],
  products: [
    { id:'p-1', sku:'1001', name:'Товар 1', price:1100, oldPrice:2000, image: IMG, stock:12, bestOfWeek:true },
    { id:'p-2', sku:'1002', name:'Товар 2', price:2000, oldPrice:3000, image: IMG, stock:7 },
    { id:'p-3', sku:'1003', name:'Товар 3', price:1500, image: IMG, stock:10 },
    { id:'p-4', sku:'1004', name:'Товар 4', price:999,  oldPrice:1500, image: IMG, stock:0 },
    { id:'p-5', sku:'1005', name:'Товар 5', price:2500, oldPrice:2800, image: IMG, stock:3 },
    { id:'p-6', sku:'1006', name:'Товар 6', price:1200, image: IMG, stock:9 },
  ],
  cart: [], favorites: [], orders: [], profile:{name:'',avatar:''}, reviews:[]
});

// State
let state = loadState();
function loadState(){
  try{ const raw = localStorage.getItem(LS); if(!raw) return initialState(); const parsed = JSON.parse(raw);
    // гарантируем единый IMG на всё
    (parsed.categories||[]).forEach(c=>c.image=IMG);
    (parsed.products||[]).forEach(p=>p.image=IMG);
    return { ...initialState(), ...parsed };
  }catch(e){ return initialState(); }
}
function saveState(){ localStorage.setItem(LS, JSON.stringify(state)); }

// Utils
const byId = id => document.getElementById(id);
const fmt = n => `${Number(n||0).toLocaleString('ru-RU')} ₽`;
const hasDiscount = p => typeof p.oldPrice === 'number' && p.oldPrice > (p.price||0);
const discPct = p => hasDiscount(p) ? Math.max(1, Math.round(100 - (p.price/p.oldPrice)*100)) : 0;

// Cart + favorites
function cartCount(){ return state.cart.reduce((s,i)=>s+i.qty,0); }
function updateCartBadges(){
  const count = cartCount();
  const badge = byId('cartBadge'); const hdrBadge = byId('hdrCartBadge');
  [badge,hdrBadge].forEach(b=>{
    if(!b) return;
    if(count>0){ b.textContent = String(count); b.hidden = false; } else { b.hidden = true; }
  });
}
function addToCart(productId){
  const p = state.products.find(x=>x.id===productId || x.sku===productId);
  if(!p || (p.stock||0)<=0) return;
  const item = state.cart.find(i=>i.productId===productId);
  if(item) item.qty+=1; else state.cart.push({productId, qty:1});
  saveState(); updateCartBadges(); toastAdded();
}
function toggleFavorite(productId){
  const i = state.favorites.indexOf(productId);
  if(i>-1) state.favorites.splice(i,1); else state.favorites.push(productId);
  saveState();
}

// Render: hero
function renderHero(){
  const rail = byId('heroRail'); if(!rail) return;
  const items = state.products.filter(p=>p.bestOfWeek).slice(0,1);
  const extra = state.products.slice(0,2);
  const list = items.concat(extra);
  rail.innerHTML = list.map(p => `
    <div class="hero-card">
      <img src="${IMG}" alt="Лучший" loading="eager">
      <div class="overlay">
        <a class="btn" href="product.html?sku=${encodeURIComponent(p.sku||p.id)}">Открыть</a>
        <button class="btn" data-add="${p.id}">В корзину</button>
      </div>
    </div>
  `).join('');
  rail.querySelectorAll('[data-add]').forEach(btn => btn.addEventListener('click', ()=> addToCart(btn.getAttribute('data-add'))));
}

// Render: products rail (generic)
function productCardHTML(p){
  return `
    <div class="product-card">
      ${hasDiscount(p)?`<div class="disc-badge">-${discPct(p)}%</div>`:''}
      <div class="top-actions">
        <button class="btn-icon favorite-btn ${state.favorites.includes(p.id)?'active':''}" data-fav="${p.id}" aria-label="Избранное">
          <svg viewBox="0 0 24 24"><path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.27 2 8.5C2 5.41 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.08C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.41 22 8.5C22 12.27 18.6 15.36 13.45 20.03L12 21.35Z" fill="currentColor"/></svg>
        </button>
      </div>
      <a class="link-card" href="product.html?sku=${encodeURIComponent(p.sku||p.id)}">
        <img class="thumb" src="${IMG}" alt="${p.name}" loading="lazy">
      </a>
      <div class="body">
        <div class="title">${p.name}</div>
        <div class="row">
          <div class="price-chip">${fmt(p.price)}${hasDiscount(p)?`<span class="old-mini">${fmt(p.oldPrice)}</span>`:''}</div>
          <button class="btn" data-add="${p.id}" ${p.stock>0?'':'disabled'}>${p.stock>0?'+':'Нет'}</button>
        </div>
      </div>
    </div>
  `;
}
function renderDeals(){
  const rail = byId('dealRail'); if(!rail) return;
  const list = state.products.filter(hasDiscount);
  rail.innerHTML = list.map(productCardHTML).join('');
  bindProductRail(rail);
}
function renderRecs(){
  const rail = byId('recRail'); if(!rail) return;
  const list = [...state.products].sort((a,b)=> (hasDiscount(b)-hasDiscount(a)) || (b.stock>0)-(a.stock>0) || b.price-a.price);
  rail.innerHTML = list.map(productCardHTML).join('');
  bindProductRail(rail);
}
function bindProductRail(rail){
  rail.querySelectorAll('[data-add]').forEach(btn => btn.addEventListener('click', ()=> addToCart(btn.getAttribute('data-add'))));
  rail.querySelectorAll('[data-fav]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const id = btn.getAttribute('data-fav');
      toggleFavorite(id);
      btn.classList.toggle('active', state.favorites.includes(id));
    });
  });
}

// Render: categories rail
function renderCats(){
  const rail = byId('catRail'); if(!rail) return;
  rail.innerHTML = state.categories.map(c => `
    <a class="category-card" href="category.html?cat=${encodeURIComponent(c.slugEn||c.id)}" title="${c.name}">
      <img src="${IMG}" alt="${c.name}" loading="lazy">
      <div class="title">${c.name}</div>
    </a>
  `).join('');
}

// Actions
function toastAdded(){
  let bar = document.getElementById('cartSnack');
  if(!bar){
    bar = document.createElement('div');
    bar.id='cartSnack';
    Object.assign(bar.style,{
      position:'fixed',left:'50%',bottom:'16px',transform:'translateX(-50%) translateY(8px)',zIndex:'100',
      background:'linear-gradient(180deg, var(--bg-soft), var(--bg-elev))',
      border:'1px solid var(--border)',borderRadius:'12px',padding:'10px 14px',boxShadow:'var(--shadow)',color:'var(--text)',
      opacity:'0',transition:'opacity .25s ease, transform .25s ease'
    });
    bar.textContent='Добавлено в корзину';
    document.body.appendChild(bar);
  }
  requestAnimationFrame(()=>{
    bar.style.opacity='1'; bar.style.transform='translateX(-50%) translateY(0)';
    setTimeout(()=>{ bar.style.opacity='0'; bar.style.transform='translateX(-50%) translateY(8px)'; }, 1200);
  });
}

// Background network (легкий)
(function bg(){
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.getElementById('bgCanvas'); if(!canvas || reduced) return;
  const ctx = canvas.getContext('2d'); let w=0,h=0,dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));
  function resize(){ w=innerWidth; h=innerHeight; canvas.width=w*dpr; canvas.height=h*dpr; canvas.style.width=w+'px'; canvas.style.height=h+'px'; ctx.setTransform(dpr,0,0,dpr,0,0); }
  resize(); addEventListener('resize',resize);
  const N = 80; const pts = Array.from({length:N},()=>({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.25,vy:(Math.random()-.5)*.25,r:1+Math.random()*1.2}));
  let mouse={x:-9999,y:-9999}; addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY}); addEventListener('mouseout',()=>{mouse.x=-9999;mouse.y=-9999});
  function step(p){ p.x+=p.vx; p.y+=p.vy; if(p.x<-20)p.x=w+20; if(p.x>w+20)p.x=-20; if(p.y<-20)p.y=h+20; if(p.y>h+20)p.y=-20;
    const dx=p.x-mouse.x, dy=p.y-mouse.y, d2=dx*dx+dy*dy; if(d2<12000){ p.vx+=dx*-0.00001; p.vy+=dy*-0.00001 } p.vx*=.999; p.vy*=.999; }
  function draw(){
    ctx.clearRect(0,0,w,h); ctx.lineWidth=1; ctx.strokeStyle='rgba(200,200,210,.12)';
    for(let i=0;i<N;i++){ for(let j=i+1;j<N;j++){ const a=pts[i],b=pts[j]; const dx=a.x-b.x, dy=a.y-b.y, d2=dx*dx+dy*dy; if(d2<14000){ const apha=.18*(1-d2/14000); ctx.globalAlpha=apha; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); } } }
    ctx.globalAlpha=1; ctx.fillStyle='rgba(230,230,240,.9)'; pts.forEach(p=>{ ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); });
  }
  (function loop(){ pts.forEach(step); draw(); requestAnimationFrame(loop); })();
})();

// Init
function init(){
  // normalize + принудительно задать IMG везде
  state.categories.forEach(c=>c.image=IMG);
  state.products.forEach(p=>p.image=IMG);
  saveState();

  renderHero();
  renderDeals();
  renderCats();
  renderRecs();
  updateCartBadges();

  const seeAllDeals = byId('seeAllDeals');
  if(seeAllDeals) seeAllDeals.addEventListener('click', ()=> {
    document.querySelector('#recRail')?.scrollIntoView({behavior:'smooth', block:'start'});
  });

  // Telegram Mini App (опционально)
  if(window.Telegram && window.Telegram.WebApp){
    const tg = window.Telegram.WebApp;
    const user = tg.initDataUnsafe?.user;
    if(user){
      state.profile = { name: user.first_name + (user.last_name?' '+user.last_name:''), avatar: user.photo_url||'' };
      saveState();
    }
  }

  // Обновление из "админки"
  window.addEventListener('adminStateChanged', ()=>{
    state = loadState();
    renderHero(); renderDeals(); renderCats(); renderRecs(); updateCartBadges();
  });
}

if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init) } else { init(); }