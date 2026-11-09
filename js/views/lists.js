// Likes / dislikes (#/likes, #/dislikes) and interest requests (#/requests).
import { api } from '../db.js';
import { h, bn, age, label, act } from '../ui.js';
import { card } from './browse.js';

async function renderFavs(el, kind) {
  const rows = await api.myFavs(kind);
  const title = kind === 'like' ? 'পছন্দের তালিকা' : 'অপছন্দের তালিকা';
  el.innerHTML = h`
    <header class="view-head">
      <p class="kicker">${bn(rows.length)}টি বায়োডাটা</p>
      <h1>${title}</h1>
      <p class="muted">${kind === 'like' ? 'যে বায়োডাটাগুলো পরে আবার দেখতে চান। অপর পক্ষ শুধু মোট সংখ্যা জানতে পারেন, আপনার পরিচয় নয়।' : 'এই বায়োডাটাগুলো খোঁজার ফলাফলে আর দেখাবে না।'}</p>
    </header>
    ${rows.length ? h`<div class="bgrid">${rows.map(card)}</div>`
      : h`<div class="empty"><h2>তালিকা খালি</h2><p>বায়োডাটার পেজে ${kind === 'like' ? '♡' : '✕'} বোতাম চাপলে এখানে জমা হবে।</p><a class="btn" href="#/search">বায়োডাটা খুঁজুন</a></div>`}`;
}

const STATUS_CLASS = { pending: 'wait', accepted: 'good', introduced: 'good', declined: 'bad', cancelled: 'bad' };
const pill = (s) => h`<span class="pill pill-${STATUS_CLASS[s]}">${label('request', s)}</span>`;
const when = (iso) => new Date(iso).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });

async function renderRequests(el, refresh) {
  const { sent, received } = await api.myRequests();
  const pendingIn = received.filter((r) => r.status === 'pending').length;

  el.innerHTML = h`
    <header class="view-head">
      <p class="kicker">প্রস্তাবসমূহ</p>
      <h1>আগ্রহ ও সম্মতি</h1>
      <p class="muted">দুই পক্ষ সম্মতি দিলে Deenijora উভয় অভিভাবকের সাথে ফোনে কথা বলে পরিচয়ের ব্যবস্থা করে। এর আগে কারও যোগাযোগের তথ্য দেওয়া হয় না।</p>
    </header>
    <div class="tabs" role="tablist">
      <button role="tab" type="button" class="tab active" aria-selected="true" data-tab="in">পেয়েছি ${pendingIn ? h`<span class="badge">${bn(pendingIn)}</span>` : ''}</button>
      <button role="tab" type="button" class="tab" aria-selected="false" data-tab="out">পাঠিয়েছি</button>
    </div>
    <section data-panel="in" class="req-list">
      ${received.length ? received.map((r) => h`
        <article class="req">
          <div class="req-main">
            <p class="req-title"><a href="#/b/${r.sender_code ?? ''}">${r.sender_code ?? 'বায়োডাটা সরানো হয়েছে'}</a> আপনার প্রতি আগ্রহ জানিয়েছেন ${pill(r.status)}</p>
            ${r.message ? h`<blockquote>${r.message}</blockquote>` : ''}
            <p class="fine">${when(r.created_at)}</p>
          </div>
          ${r.status === 'pending' ? h`<div class="req-actions">
            <button class="btn btn-sm" type="button" data-accept="${r.id}">সম্মতি দিন</button>
            <button class="btn btn-sm btn-ghost" type="button" data-decline="${r.id}">আগ্রহী নই</button>
          </div>` : ''}
          ${r.status === 'accepted' ? h`<p class="req-next">✓ আপনি সম্মতি দিয়েছেন। আমরা শিগগিরই আপনার অভিভাবকের সাথে যোগাযোগ করব, ইনশাআল্লাহ।</p>` : ''}
        </article>`) : h`<div class="empty sm"><p>এখনো কোনো প্রস্তাব আসেনি। বায়োডাটা পূর্ণ ও প্রকাশিত থাকলে সম্ভাবনা বাড়ে।</p></div>`}
    </section>
    <section data-panel="out" class="req-list" hidden>
      ${sent.length ? sent.map((r) => h`
        <article class="req">
          <div class="req-main">
            <p class="req-title">${r.biodata ? h`<a href="#/b/${r.biodata.code}">${r.biodata.code}</a> · ${label('gender', r.biodata.gender)}, ${bn(age(r.biodata.birth_year))} বছর, ${r.biodata.district}` : 'বায়োডাটা সরানো হয়েছে'} ${pill(r.status)}</p>
            ${r.message ? h`<blockquote>${r.message}</blockquote>` : ''}
            <p class="fine">${when(r.created_at)}</p>
          </div>
          ${r.status === 'pending' ? h`<div class="req-actions"><button class="btn btn-sm btn-ghost" type="button" data-cancel="${r.id}">প্রত্যাহার</button></div>` : ''}
          ${r.status === 'accepted' ? h`<p class="req-next">✓ অপর পক্ষ সম্মতি দিয়েছেন। আমরা দুই পরিবারের সাথে কথা বলে পরিচয় করিয়ে দেব।</p>` : ''}
        </article>`) : h`<div class="empty sm"><p>আপনি এখনো কাউকে আগ্রহ জানাননি।</p><a class="btn btn-sm" href="#/search">বায়োডাটা খুঁজুন</a></div>`}
    </section>`;

  el.querySelectorAll('[data-tab]').forEach((t) => t.addEventListener('click', () => {
    el.querySelectorAll('[data-tab]').forEach((x) => { const on = x === t; x.classList.toggle('active', on); x.setAttribute('aria-selected', String(on)); });
    el.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== t.dataset.tab; });
  }));
  const bind = (attr, fn, ok) => el.querySelectorAll(`[${attr}]`).forEach((b) => b.addEventListener('click', async () => {
    if (await act(b, () => fn(b.getAttribute(attr)).then(() => true), ok)) refresh();
  }));
  bind('data-accept', (id) => api.respondInterest(id, true), 'সম্মতি জানানো হয়েছে');
  bind('data-decline', (id) => api.respondInterest(id, false), 'উত্তর জানানো হয়েছে');
  bind('data-cancel', (id) => api.cancelInterest(id), 'প্রস্তাব প্রত্যাহার করা হয়েছে');
}

export async function render(el, { name, refresh }) {
  if (name === 'likes') return renderFavs(el, 'like');
  if (name === 'dislikes') return renderFavs(el, 'dislike');
  return renderRequests(el, refresh);
}
