// App shell: hash router, auth guard, navigation.
import { api, DEMO } from './db.js';
import { h, icon, toast } from './ui.js';

const ROUTES = {
  login: { load: () => import('./views/login.js'), public: true, title: 'লগইন' },
  dashboard: { load: () => import('./views/dashboard.js'), title: 'ড্যাশবোর্ড', icon: 'home', nav: 'ড্যাশবোর্ড', tab: 'হোম' },
  search: { load: () => import('./views/browse.js'), title: 'বায়োডাটা খুঁজুন', icon: 'search', nav: 'বায়োডাটা খুঁজুন', tab: 'খুঁজুন' },
  b: { load: () => import('./views/browse.js'), title: 'বায়োডাটা' },
  edit: { load: () => import('./views/edit.js'), title: 'আমার বায়োডাটা', icon: 'edit', nav: 'আমার বায়োডাটা' },
  likes: { load: () => import('./views/lists.js'), title: 'পছন্দের তালিকা', icon: 'heart', nav: 'পছন্দের তালিকা', tab: 'পছন্দ' },
  dislikes: { load: () => import('./views/lists.js'), title: 'অপছন্দের তালিকা', icon: 'x', nav: 'অপছন্দের তালিকা' },
  requests: { load: () => import('./views/lists.js'), title: 'প্রস্তাবসমূহ', icon: 'inbox', nav: 'প্রস্তাবসমূহ', tab: 'প্রস্তাব' },
  support: { load: () => import('./views/account.js'), title: 'সাপোর্ট ও রিপোর্ট', icon: 'help', nav: 'সাপোর্ট ও রিপোর্ট' },
  settings: { load: () => import('./views/account.js'), title: 'সেটিংস', icon: 'gear', nav: 'সেটিংস', tab: 'আরও' },
  admin: { load: () => import('./views/admin.js'), title: 'অ্যাডমিন', icon: 'shield', nav: 'অ্যাডমিন প্যানেল', admin: true },
};

const state = { session: null, admin: false };
const $ = (id) => document.getElementById(id);

export const go = (path) => { location.hash = `#/${path}`; };
const parse = () => {
  const [name = 'dashboard', ...rest] = location.hash.replace(/^#\/?/, '').split('/');
  return { name: ROUTES[name] ? name : 'dashboard', param: decodeURIComponent(rest.join('/')) };
};

function renderNav(active) {
  const visible = Object.entries(ROUTES).filter(([, r]) => r.nav && (!r.admin || state.admin));
  $('sidenav').innerHTML = h`
    <ul>${visible.map(([k, r]) => h`<li><a href="#/${k}" class="${k === active ? 'active' : ''}" ${k === active ? h`aria-current="page"` : ''}>${icon(r.icon)}<span>${r.nav}</span></a></li>`)}
      <li><button type="button" data-signout>${icon('out')}<span>লগআউট</span></button></li>
    </ul>`;
  const tabs = Object.entries(ROUTES).filter(([, r]) => r.tab);
  $('tabbar').innerHTML = h`${tabs.map(([k, r]) => h`<a href="#/${k}" class="${k === active || (k === 'settings' && ['support', 'edit', 'dislikes', 'admin'].includes(active)) ? 'active' : ''}">${icon(r.icon)}<span>${r.tab}</span></a>`)}`;
  $('header-actions').innerHTML = h`
    <a class="btn btn-sm btn-ghost hide-sm" href="#/search">${icon('search')} খুঁজুন</a>
    <span class="avatar-chip" title="${state.session.user.email}">${icon('user')}</span>`;
  $('sidenav').hidden = false;
  $('tabbar').hidden = false;
}

function clearNav() {
  $('sidenav').hidden = true;
  $('tabbar').hidden = true;
  $('header-actions').innerHTML = h`<a class="btn btn-sm btn-ghost" href="index.html">← হোম</a>`;
}

let renderSeq = 0;
async function render() {
  const seq = ++renderSeq;
  const { name, param } = parse();
  const route = ROUTES[name];
  if (!route.public && !state.session) return go('login');
  if (name === 'login' && state.session) return go('dashboard');
  if (route.admin && !state.admin) return go('dashboard');

  if (state.session) renderNav(name); else clearNav();
  document.title = `${route.title} — Deenijora`;
  const view = $('view');
  view.classList.add('is-loading');
  try {
    const mod = await route.load();
    if (seq !== renderSeq) return;
    await mod.render(view, { name, param, state, go, refresh: render });
  } catch (err) {
    console.error(err);
    view.innerHTML = h`<div class="empty"><h2>পেজটি লোড করা যায়নি</h2><p>ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।</p><button class="btn" type="button" onclick="location.reload()">আবার চেষ্টা করুন</button></div>`;
  } finally {
    view.classList.remove('is-loading');
  }
  if (seq === renderSeq) { view.focus({ preventScroll: true }); scrollTo({ top: 0 }); }
}

async function syncSession(session) {
  state.session = session;
  state.admin = session ? await api.isAdmin().catch(() => false) : false;
}

document.addEventListener('click', async (e) => {
  if (!e.target.closest('[data-signout]')) return;
  await api.signOut();
  toast('লগআউট হয়েছে');
});

async function boot() {
  $('demo-banner').hidden = !DEMO;
  await syncSession(await api.session());
  api.onAuth(async (s) => {
    const changed = Boolean(s) !== Boolean(state.session);
    await syncSession(s);
    if (changed) render();
  });
  addEventListener('hashchange', render);
  render();
}
boot();
