// Admin panel (#/admin). Access is enforced by RLS (is_admin()); this view only hides the UI from others.
import { api } from '../db.js';
import { h, bn, age, label, act } from '../ui.js';

const TABS = [
  ['pending', 'যাচাইয়ের অপেক্ষায়'],
  ['accepted', 'পরিচয় করাতে হবে'],
  ['reports', 'রিপোর্ট'],
  ['needs_changes', 'সংশোধনে পাঠানো'],
  ['approved', 'প্রকাশিত'],
];

const tel = (n) => (n ? h`<a href="tel:${n}">${n}</a>` : '—');

const contact = (p, title) => h`
  <div class="contact-box">
    <p class="fine">${title}</p>
    ${p ? h`<p><strong>${p.full_name}</strong> · ${tel(p.phone)}</p><p>অভিভাবক: ${p.guardian_name} · ${tel(p.guardian_phone)}</p>` : h`<p class="muted">তথ্য নেই</p>`}
  </div>`;

function biodataItem(b) {
  return h`
    <article class="admin-item">
      <header><a href="#/b/${b.code}"><strong>${b.code}</strong></a> · ${label('gender', b.gender)}, ${bn(age(b.birth_year))} বছর, ${b.district} · ${label('marital_status', b.marital_status)}</header>
      <p>${b.education} · ${b.occupation} · নামাজ: ${label('salah', b.salah)}</p>
      ${contact(b.private, `যাচাইয়ের জন্য ফোন করুন (অভিভাবক: ${b.guardian_relation})`)}
      ${b.review_note ? h`<p class="review-note">${b.review_note}</p>` : ''}
      <label class="field"><span>নোট (ব্যবহারকারী দেখবেন)</span><input data-note="${b.id}" maxlength="300" placeholder="যেমন: অভিভাবকের নম্বর বন্ধ পাওয়া গেছে"></label>
      <div class="req-actions">
        ${b.status !== 'approved' ? h`<button class="btn btn-sm" type="button" data-set="${b.id}" data-status="approved">যাচাই সম্পন্ন — প্রকাশ করুন</button>` : ''}
        ${b.status !== 'needs_changes' ? h`<button class="btn btn-sm btn-ghost" type="button" data-set="${b.id}" data-status="needs_changes">সংশোধনে পাঠান</button>` : ''}
        ${b.status === 'approved' ? h`<button class="btn btn-sm btn-ghost" type="button" data-set="${b.id}" data-status="hidden">লুকান</button>` : ''}
      </div>
    </article>`;
}

function requestItem(r) {
  return h`
    <article class="admin-item">
      <header><strong>${r.from?.code ?? '?'}</strong> → <strong>${r.to?.code ?? '?'}</strong> · দুই পক্ষ সম্মত</header>
      ${r.message ? h`<blockquote>${r.message}</blockquote>` : ''}
      <div class="grid-2">${contact(r.from?.private, 'আগ্রহ জানিয়েছেন')}${contact(r.to?.private, 'সম্মতি দিয়েছেন')}</div>
      <p class="fine">দুই অভিভাবকের সাথে আলাদা কথা বলে সম্মতি নিশ্চিত করার পর পরিচয় করিয়ে দিন।</p>
      <label class="field"><span>নোট</span><input data-note="${r.id}" maxlength="300"></label>
      <div class="req-actions">
        <button class="btn btn-sm" type="button" data-req="${r.id}" data-status="introduced">পরিচয় করানো হয়েছে</button>
        <button class="btn btn-sm btn-ghost" type="button" data-req="${r.id}" data-status="cancelled">বাতিল</button>
      </div>
    </article>`;
}

const reportItem = (r) => h`
  <article class="admin-item">
    <header>${r.biodata?.code ? h`<a href="#/b/${r.biodata.code}">${r.biodata.code}</a> নিয়ে অভিযোগ` : 'সাপোর্ট বার্তা'}</header>
    <p>${r.message}</p>
    <div class="req-actions"><button class="btn btn-sm" type="button" data-resolve="${r.id}">সমাধান হয়েছে</button></div>
  </article>`;

async function load(tab) {
  if (tab === 'accepted') return (await api.adminRequests('accepted')).map(requestItem);
  if (tab === 'reports') return (await api.adminReports()).map(reportItem);
  return (await api.adminQueue(tab)).map(biodataItem);
}

export async function render(el, { param }) {
  const tab = TABS.some(([k]) => k === param) ? param : 'pending';
  const items = await load(tab);
  el.innerHTML = h`
    <header class="view-head"><p class="kicker">অ্যাডমিন</p><h1>অ্যাডমিন প্যানেল</h1></header>
    <nav class="tabs scroll" aria-label="অ্যাডমিন বিভাগ">${TABS.map(([k, t]) => h`<a class="tab ${k === tab ? 'active' : ''}" href="#/admin/${k}" ${k === tab ? h`aria-current="page"` : ''}>${t}</a>`)}</nav>
    <p class="result-count">${bn(items.length)}টি</p>
    <div class="admin-list">${items.length ? items : h`<div class="empty sm"><p>এখানে কিছু নেই, আলহামদুলিল্লাহ।</p></div>`}</div>`;

  const note = (id) => el.querySelector(`[data-note="${id}"]`)?.value.trim();
  const rerender = () => render(el, { param: tab });
  el.querySelectorAll('[data-set]').forEach((b) => b.addEventListener('click', async () => {
    if (await act(b, () => api.adminSetStatus(b.dataset.set, b.dataset.status, note(b.dataset.set)).then(() => true), 'আপডেট হয়েছে')) rerender();
  }));
  el.querySelectorAll('[data-req]').forEach((b) => b.addEventListener('click', async () => {
    if (await act(b, () => api.adminSetRequest(b.dataset.req, b.dataset.status, note(b.dataset.req)).then(() => true), 'আপডেট হয়েছে')) rerender();
  }));
  el.querySelectorAll('[data-resolve]').forEach((b) => b.addEventListener('click', async () => {
    if (await act(b, () => api.adminResolveReport(b.dataset.resolve).then(() => true), 'সমাধান চিহ্নিত')) rerender();
  }));
}
