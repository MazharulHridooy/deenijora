// Search list (#/search) and biodata detail (#/b/DJ-1001).
import { api, PAGE_SIZE } from '../db.js';
import { h, bn, age, icon, label, options, listOptions, LABELS, DISTRICTS, act, toast, formData } from '../ui.js';

const FILTER_KEY = 'deenijora-filters';
const loadFilters = () => { try { return JSON.parse(sessionStorage.getItem(FILTER_KEY)) || {}; } catch { return {}; } };
const saveFilters = (f) => { try { sessionStorage.setItem(FILTER_KEY, JSON.stringify(f)); } catch { /* ignore */ } };

export const card = (b) => h`
  <a class="bcard" href="#/b/${b.code}">
    <span class="bcard-top">
      <span class="bcard-avatar ${b.gender}" aria-hidden="true">${icon('user')}</span>
      <span>
        <span class="bcard-title">${label('gender', b.gender)} · ${bn(age(b.birth_year))} বছর</span>
        <span class="bcard-code">${b.code}</span>
      </span>
    </span>
    <dl class="bcard-facts">
      <div><dt>জেলা</dt><dd>${b.district}</dd></div>
      <div><dt>বৈবাহিক</dt><dd>${label('marital_status', b.marital_status)}</dd></div>
      <div><dt>শিক্ষা</dt><dd>${b.education}</dd></div>
      <div><dt>পেশা</dt><dd>${b.occupation}</dd></div>
    </dl>
    <span class="bcard-foot"><span class="verified">${icon('shield')} ফোনে যাচাইকৃত</span><span class="bcard-go">বিস্তারিত →</span></span>
  </a>`;

async function renderSearch(el) {
  const f = loadFilters();
  const page = Number(f.page || 0);
  const [{ rows, total }, disliked] = await Promise.all([api.search(f, page), api.myFavs('dislike')]);
  const hide = new Set(disliked.map((d) => d.id));
  // ponytail: disliked rows are filtered client-side, so a page can show < PAGE_SIZE; move to SQL if lists get long.
  const visible = rows.filter((r) => !hide.has(r.id));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  el.innerHTML = h`
    <header class="view-head">
      <p class="kicker">বায়োডাটা খুঁজুন</p>
      <h1>যাচাইকৃত বায়োডাটা</h1>
      <p class="muted">শুধু ফোনে যাচাই করা ও অভিভাবকের সম্মতিপ্রাপ্ত বায়োডাটা দেখানো হয়। কারও নাম বা ফোন নম্বর এখানে থাকে না।</p>
    </header>
    <form id="filters" class="filters">
      <label class="field"><span>খুঁজছি</span><select name="gender">${options({ female: 'পাত্রী', male: 'পাত্র' }, f.gender, 'সবাই')}</select></label>
      <label class="field"><span>জেলা</span><select name="district">${listOptions(DISTRICTS, f.district, 'সব জেলা')}</select></label>
      <label class="field"><span>বয়স (থেকে)</span><input name="age_min" type="number" min="18" max="80" inputmode="numeric" value="${f.age_min ?? ''}" placeholder="১৮"></label>
      <label class="field"><span>বয়স (পর্যন্ত)</span><input name="age_max" type="number" min="18" max="80" inputmode="numeric" value="${f.age_max ?? ''}" placeholder="৪০"></label>
      <label class="field"><span>বৈবাহিক অবস্থা</span><select name="marital_status">${options(LABELS.marital_status, f.marital_status, 'যেকোনো')}</select></label>
      <label class="field"><span>নামাজ</span><select name="salah">${options(LABELS.salah, f.salah, 'যেকোনো')}</select></label>
      <label class="field"><span>বায়োডাটা নং</span><input name="code" value="${f.code ?? ''}" placeholder="DJ-1001" maxlength="12"></label>
      <div class="filter-actions">
        <button class="btn" type="submit">${icon('search')} খুঁজুন</button>
        <button class="btn btn-ghost" type="button" id="reset">মুছুন</button>
      </div>
    </form>
    <p class="result-count" role="status">${bn(total)}টি বায়োডাটা পাওয়া গেছে</p>
    ${visible.length
      ? h`<div class="bgrid">${visible.map(card)}</div>`
      : h`<div class="empty"><h2>কোনো বায়োডাটা মেলেনি</h2><p>ফিল্টার কিছুটা শিথিল করে আবার খুঁজুন।</p></div>`}
    ${pages > 1 ? h`<nav class="pager" aria-label="পেজ">
      <button class="btn btn-ghost btn-sm" type="button" data-page="${page - 1}" ${page === 0 ? h`disabled` : ''}>← আগের</button>
      <span>${bn(page + 1)} / ${bn(pages)}</span>
      <button class="btn btn-ghost btn-sm" type="button" data-page="${page + 1}" ${page + 1 >= pages ? h`disabled` : ''}>পরের →</button>
    </nav>` : ''}`;

  const form = el.querySelector('#filters');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const next = Object.fromEntries(Object.entries(formData(form)).filter(([, v]) => v !== ''));
    saveFilters({ ...next, page: 0 });
    renderSearch(el);
  });
  el.querySelector('#reset').addEventListener('click', () => { saveFilters({}); renderSearch(el); });
  el.querySelectorAll('[data-page]').forEach((b) => b.addEventListener('click', () => { saveFilters({ ...f, page: Number(b.dataset.page) }); renderSearch(el).then(() => scrollTo({ top: 0 })); }));
}

const row = (k, v) => (v || v === 0 ? h`<div><dt>${k}</dt><dd>${v}</dd></div>` : '');
const heightText = (cm) => { if (!cm) return ''; const inch = Math.round(cm / 2.54); return `${bn(Math.floor(inch / 12))} ফুট ${bn(inch % 12)} ইঞ্চি`; };

async function renderDetail(el, code) {
  const b = await api.getBiodata(code);
  if (!b) {
    el.innerHTML = h`<div class="empty"><h2>বায়োডাটা পাওয়া যায়নি</h2><p>এটি সরিয়ে নেওয়া হয়েছে বা এখনো প্রকাশিত হয়নি।</p><a class="btn" href="#/search">খোঁজায় ফিরে যান</a></div>`;
    return;
  }
  if (!b.mine) api.recordView(b.id).catch(() => {});

  el.innerHTML = h`
    <a class="back" href="#/search">← খোঁজার ফলাফল</a>
    <article class="bio">
      <header class="bio-head">
        <span class="bcard-avatar lg ${b.gender}" aria-hidden="true">${icon('user')}</span>
        <div>
          <p class="kicker">${b.code}</p>
          <h1>${label('gender', b.gender)} · ${bn(age(b.birth_year))} বছর</h1>
          <p class="muted">${b.district}${b.current_location ? ` · এখন ${b.current_location}` : ''}</p>
          <span class="verified">${icon('shield')} ফোনে যাচাইকৃত · অভিভাবক: ${b.guardian_relation}</span>
        </div>
        ${b.mine ? h`<a class="btn btn-ghost btn-sm" href="#/edit">সম্পাদনা</a>` : h`
        <div class="bio-actions">
          <button class="btn" type="button" id="interest">${icon('send')} আগ্রহ জানান</button>
          <div class="fav-row">
            <button class="icon-btn ${b.fav === 'like' ? 'on' : ''}" type="button" data-fav="like" aria-pressed="${b.fav === 'like'}" aria-label="পছন্দের তালিকায় রাখুন">${icon('heart')}</button>
            <button class="icon-btn ${b.fav === 'dislike' ? 'on' : ''}" type="button" data-fav="dislike" aria-pressed="${b.fav === 'dislike'}" aria-label="অপছন্দের তালিকায় রাখুন">${icon('x')}</button>
          </div>
        </div>`}
      </header>

      <section class="bio-sec"><h2>প্রাথমিক তথ্য</h2><dl class="facts-dl">
        ${row('জন্মসাল', bn(b.birth_year))}${row('উচ্চতা', heightText(b.height_cm))}
        ${row('বৈবাহিক অবস্থা', label('marital_status', b.marital_status))}${row('স্থায়ী জেলা', b.district)}
      </dl></section>
      <section class="bio-sec"><h2>শিক্ষা ও পেশা</h2><dl class="facts-dl">${row('শিক্ষা', b.education)}${row('পেশা', b.occupation)}</dl></section>
      <section class="bio-sec"><h2>দ্বীনি জীবন</h2><dl class="facts-dl">
        ${row('নামাজ', label('salah', b.salah))}${row('কুরআন তিলাওয়াত', b.quran && label('quran', b.quran))}
      </dl>${b.religious_notes ? h`<p>${b.religious_notes}</p>` : ''}</section>
      ${b.family_notes ? h`<section class="bio-sec"><h2>পরিবার</h2><p>${b.family_notes}</p></section>` : ''}
      ${b.about ? h`<section class="bio-sec"><h2>নিজের সম্পর্কে</h2><p>${b.about}</p></section>` : ''}
      <section class="bio-sec"><h2>জীবনসঙ্গীর কাছে প্রত্যাশা</h2>
        ${b.partner_age_min ? h`<p class="muted">বয়স: ${bn(b.partner_age_min)}–${bn(b.partner_age_max ?? '')} বছর</p>` : ''}
        ${b.partner_expectations ? h`<p>${b.partner_expectations}</p>` : ''}
      </section>
      <aside class="bio-note">${icon('shield')}<p>যোগাযোগের তথ্য কখনো সরাসরি দেখানো হয় না। আপনি আগ্রহ জানালে এবং অপর পক্ষ সম্মতি দিলে, Deenijora দুই পরিবারের অভিভাবকের সাথে কথা বলে পরিচয়ের ব্যবস্থা করে। এর জন্য কোনো আগাম টাকা লাগে না।</p></aside>
      ${b.mine ? '' : h`<button class="linkish report-link" type="button" id="report">এই বায়োডাটা নিয়ে অভিযোগ জানান</button>`}
    </article>

    <dialog id="dlg-interest" class="dialog">
      <form method="dialog" id="f-interest" class="stack">
        <h2>আগ্রহ জানান — ${b.code}</h2>
        <p class="muted">অপর পক্ষ আপনার বায়োডাটা নম্বর ও এই বার্তা দেখবেন। নাম বা ফোন নম্বর লিখবেন না।</p>
        <label class="field"><span>ছোট বার্তা (ঐচ্ছিক)</span><textarea name="msg" maxlength="500" rows="4" placeholder="আসসালামু আলাইকুম..."></textarea></label>
        <div class="form-actions"><button class="btn btn-ghost" value="cancel" formnovalidate>বাতিল</button><button class="btn" value="send">পাঠান</button></div>
      </form>
    </dialog>
    <dialog id="dlg-report" class="dialog">
      <form method="dialog" id="f-report" class="stack">
        <h2>অভিযোগ — ${b.code}</h2>
        <label class="field"><span>কী সমস্যা?</span><textarea name="msg" required minlength="5" maxlength="1500" rows="4"></textarea></label>
        <div class="form-actions"><button class="btn btn-ghost" value="cancel" formnovalidate>বাতিল</button><button class="btn" value="send">জমা দিন</button></div>
      </form>
    </dialog>`;

  if (b.mine) return;
  let fav = b.fav;
  el.querySelectorAll('[data-fav]').forEach((btn) => btn.addEventListener('click', () => act(btn, async () => {
    const kind = fav === btn.dataset.fav ? null : btn.dataset.fav;
    await api.setFav(b.id, kind);
    fav = kind;
    el.querySelectorAll('[data-fav]').forEach((x) => { const on = x.dataset.fav === fav; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
    toast(kind === 'like' ? 'পছন্দের তালিকায় রাখা হয়েছে' : kind === 'dislike' ? 'অপছন্দের তালিকায় রাখা হয়েছে' : 'তালিকা থেকে সরানো হয়েছে');
  })));

  const dlgI = el.querySelector('#dlg-interest');
  el.querySelector('#interest').addEventListener('click', () => dlgI.showModal());
  dlgI.addEventListener('close', () => {
    if (dlgI.returnValue !== 'send') return;
    const msg = el.querySelector('#f-interest').msg.value.trim();
    act(el.querySelector('#interest'), () => api.sendInterest(b.id, msg), 'আগ্রহ পাঠানো হয়েছে। উত্তর এলে প্রস্তাবসমূহ পেজে দেখবেন।');
  });

  const dlgR = el.querySelector('#dlg-report');
  el.querySelector('#report').addEventListener('click', () => dlgR.showModal());
  dlgR.addEventListener('close', () => {
    if (dlgR.returnValue !== 'send') return;
    const msg = el.querySelector('#f-report').msg.value.trim();
    if (msg.length < 5) { toast('একটু বিস্তারিত লিখুন', 'error'); return; }
    act(null, () => api.report(b.id, msg), 'অভিযোগ জমা হয়েছে, জাযাকাল্লাহু খাইরান');
  });
}

export async function render(el, { name, param }) {
  if (name === 'b') return renderDetail(el, param);
  return renderSearch(el);
}
