// Простая админка с паролем 123123q. Работает с тем же localStorage, что и магазин.

const PASSWORD = '123123q';
const LS_KEYS = { state: 'mini_shop_state_v1' };

function loadState() {
    try {
        const raw = localStorage.getItem(LS_KEYS.state);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function saveState(s) {
    localStorage.setItem(LS_KEYS.state, JSON.stringify(s));
    // Уведомляем основное приложение об изменениях
    window.dispatchEvent(new CustomEvent('adminStateChanged'));
}

let state = loadState() || {
    categories: [],
    products: [],
    cart: [],
    orders: [],
    profile: { name: '' },
    favorites: [],
};

const byId = (id) => document.getElementById(id);
const fmt = (n) => `${n.toLocaleString('ru-RU')} ₽`;
const genId = (p) => `${p}-${Math.random().toString(36).slice(2, 9)}`;
const genSku = () => String(Math.floor(10000000 + Math.random() * 90000000));

function showPanel() {
    byId('loginCard').style.display = 'none';
    byId('adminPanel').style.display = 'flex';
    renderAdmin();
}

function renderAdmin() {
    const catList = byId('categoriesList');
    const catSelect = byId('newProductCategory');
    catList.innerHTML = '';
    catSelect.innerHTML = '';
    state.categories.forEach((c) => {
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML = `
            <div>${c.name}${c.slugEn ? ' <span class=\"muted\">['+c.slugEn+']</span>' : ''}${c.image ? ' <span class=\"muted\">(с картинкой)</span>' : ''}</div>
            <button class=\"btn danger\" data-id=\"${c.id}\">Удалить</button>
        `;
        row.querySelector('button').addEventListener('click', () => deleteCategory(c.id));
        catList.appendChild(row);

        const opt = document.createElement('option');
        opt.value = c.id; opt.textContent = c.name; catSelect.appendChild(opt);
    });

    const productsList = byId('productsList');
    productsList.innerHTML = '';
    state.products.forEach((p) => {
        const cat = state.categories.find((c) => c.id === p.categoryId);
        const colors = Array.isArray(p.colors) ? p.colors.join('/') : '';
        const sizes = Array.isArray(p.sizes) ? p.sizes.join('/') : '';
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML = `
            <div>
                <div>${p.name}</div>
                <div class=\"muted\">${fmt(p.price)} · ${cat ? cat.name : '—'} ${p.image ? '· с картинкой' : ''} ${p.sku ? '· SKU ' + p.sku : ''} ${colors? '· ' + colors : ''} ${sizes? '· ' + sizes : ''} ${p.description ? '· с описанием' : ''} ${p.stock ? '· в наличии: ' + p.stock : '· нет в наличии'}</div>
            </div>
            <button class=\"btn danger\" data-id=\"${p.id}\">Удалить</button>
        `;
        row.querySelector('button').addEventListener('click', () => deleteProduct(p.id));
        productsList.appendChild(row);
    });

    // Заказы
    const ordersList = byId('ordersAdminList');
    if (ordersList) {
        ordersList.innerHTML = '';
        if ((state.orders||[]).length === 0) {
            ordersList.innerHTML = '<div class="empty">Пока нет заказов</div>';
        } else {
            state.orders.forEach((o) => {
                const row = document.createElement('div');
                row.className = 'row';
                const customer = o.customerName || 'Без имени';
                const status = o.status || 'new';
                row.innerHTML = `
                    <div>
                        <div>Заказ ${o.id}</div>
                        <div class="muted">${new Date(o.date).toLocaleString('ru-RU')} · ${customer} · ${fmt(o.total||0)} · статус: ${status}</div>
                    </div>
                    <div class="row" style="gap:.35rem;">
                        <button class="btn" data-act="picked">Забрал</button>
                        <button class="btn danger" data-act="rejected">Отказался</button>
                    </div>`;
                row.querySelector('[data-act="picked"]').addEventListener('click', () => { o.status = 'picked'; saveState(state); renderAdmin(); });
                row.querySelector('[data-act="rejected"]').addEventListener('click', () => { o.status = 'rejected'; saveState(state); renderAdmin(); });
                ordersList.appendChild(row);
            });
        }
    }
}

// Генерация сетки остатков по вариантам при вводе цветов/размеров
document.addEventListener('input', (e) => {
    if (e.target && (e.target.id === 'newProductColors' || e.target.id === 'newProductSizes')) {
        const colors = (byId('newProductColors')?.value || '').split(',').map(s=>s.trim()).filter(Boolean);
        const sizes = (byId('newProductSizes')?.value || '').split(',').map(s=>s.trim()).filter(Boolean);
        const wrap = byId('stockByOptions');
        const grid = byId('stockByOptionsGrid');
        if (!wrap || !grid) return;
        grid.innerHTML = '';
        if (colors.length === 0 && sizes.length === 0) { wrap.style.display = 'none'; return; }
        wrap.style.display = '';
        const pairs = (colors.length?colors:['']).flatMap(c => (sizes.length?sizes:['']).map(s => ({c,s})));
        const sumToTotal = () => {
            let sum = 0; Array.from(grid.querySelectorAll('input[data-key]')).forEach(inp => { sum += parseInt(inp.value||'0',10)||0; });
            const total = byId('newProductStock'); if (total) total.value = String(sum);
        };
        pairs.forEach(({c,s}) => {
            const row = document.createElement('div');
            row.className = 'row';
            row.innerHTML = `<div>${[c,s].filter(Boolean).join(' / ')||'без варианта'}</div><input type="number" min="0" value="0" data-key="${(c||'')+'|'+(s||'')}">`;
            grid.appendChild(row);
            row.querySelector('input').addEventListener('input', sumToTotal);
        });
        sumToTotal();
    }
});

function addCategory() {
    const name = byId('newCategoryName').value.trim();
    const slugEn = byId('newCategorySlug').value.trim();
    const image = byId('newCategoryImage').value.trim();
    if (!name) return alert('Введите название категории');
    state.categories.push({ id: genId('cat'), name, image, slugEn });
    saveState(state);
    byId('newCategoryName').value = '';
    byId('newCategorySlug').value = '';
    byId('newCategoryImage').value = '';
    renderAdmin();
}

function deleteCategory(id) {
    state.products = state.products.filter((p) => p.categoryId !== id);
    state.categories = state.categories.filter((c) => c.id !== id);
    saveState(state);
    renderAdmin();
}

function addProduct() {
    const name = byId('newProductName').value.trim();
    const price = parseInt(byId('newProductPrice').value, 10);
    const categoryId = byId('newProductCategory').value;
    const image = byId('newProductImage').value.trim();
    let sku = (byId('newProductSku')?.value || '').trim();
    const colors = (byId('newProductColors')?.value || '').split(',').map(s=>s.trim()).filter(Boolean);
    const sizes = (byId('newProductSizes')?.value || '').split(',').map(s=>s.trim()).filter(Boolean);
    const stock = parseInt(byId('newProductStock')?.value || '0', 10) || 0;
    // Собираем остатки по вариантам, если заданы
    const grid = byId('stockByOptionsGrid');
    let stockByOptions = undefined;
    if (grid && grid.children.length > 0) {
        stockByOptions = {};
        Array.from(grid.querySelectorAll('input[data-key]')).forEach(inp => {
            const key = inp.getAttribute('data-key');
            const val = parseInt(inp.value || '0', 10) || 0;
            stockByOptions[key] = val;
        });
    }
    const description = (byId('newProductDescription')?.value || '').trim();
    if (!name || isNaN(price) || price < 0 || !categoryId) {
        return alert('Проверьте имя, цену и категорию');
    }
    if (!/^\d{8}$/.test(sku)) sku = genSku();
    if (state.products.some((p) => p.sku === sku)) {
        return alert('Такой артикул уже существует. Сгенерируйте другой.');
    }
    const prod = { id: genId('p'), categoryId, name, price, image, sku, colors, sizes, stock, description };
    if (stockByOptions) prod.stockByOptions = stockByOptions;
    state.products.push(prod);
    saveState(state);
    byId('newProductName').value = '';
    byId('newProductPrice').value = '';
    byId('newProductImage').value = '';
    if (byId('newProductSku')) byId('newProductSku').value = '';
    if (byId('newProductColors')) byId('newProductColors').value = '';
    if (byId('newProductSizes')) byId('newProductSizes').value = '';
    if (byId('newProductStock')) byId('newProductStock').value = '';
    if (byId('newProductDescription')) byId('newProductDescription').value = '';
    renderAdmin();
}

function deleteProduct(id) {
    state.products = state.products.filter((p) => p.id !== id);
    saveState(state);
    renderAdmin();
}

function tryLogin() {
    const pass = byId('adminPassword').value;
    if (pass === PASSWORD) {
        sessionStorage.setItem('mini_shop_admin_authed', '1');
        showPanel();
    } else {
        alert('Неверный пароль');
    }
}

function init() {
    byId('loginBtn').addEventListener('click', tryLogin);
    byId('addCategoryBtn').addEventListener('click', addCategory);
    byId('addProductBtn').addEventListener('click', addProduct);
    const genBtn = byId('genSkuBtn');
    if (genBtn) genBtn.addEventListener('click', (e) => { e.preventDefault(); const f = byId('newProductSku'); if (f) f.value = genSku(); });
    if (sessionStorage.getItem('mini_shop_admin_authed') === '1') showPanel();
}

document.addEventListener('DOMContentLoaded', init);


