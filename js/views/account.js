// Support (#/support) and settings (#/settings).
import { api } from '../db.js';
import { h, icon, act, toast } from '../ui.js';
import { WHATSAPP } from '../config.js';

async function renderSupport(el, refresh) {
  const reports = await api.myReports();
  el.innerHTML = h`
    <header class="view-head"><p class="kicker">সাপোর্ট</p><h1>সাপোর্ট ও রিপোর্ট</h1></header>
    <div class="split">
      <form id="f-support" class="panel stack" novalidate>
        <h2>আমাদের লিখুন</h2>
        <label class="field"><span>আপনার প্রশ্ন বা সমস্যা</span><textarea name="msg" rows="5" minlength="5" maxlength="1500" required></textarea></label>
        <button class="btn" type="submit">পাঠান</button>
        <p class="fine">জরুরি হলে <a href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener">WhatsApp-এ</a> যোগাযোগ করুন।</p>
      </form>
      <section class="panel">
        <h2>আগের বার্তা</h2>
        ${reports.length ? h`<ul class="plain-list">${reports.map((r) => h`<li><p>${r.message}</p><span class="pill ${r.status === 'open' ? 'pill-wait' : 'pill-good'}">${r.status === 'open' ? 'খোলা' : 'সমাধান হয়েছে'}</span></li>`)}</ul>`
          : h`<p class="muted">কোনো বার্তা নেই।</p>`}
      </section>
    </div>`;
  const f = el.querySelector('#f-support');
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = f.msg.value.trim();
    if (msg.length < 5) { toast('একটু বিস্তারিত লিখুন', 'error'); return; }
    if (await act(f.querySelector("[type=submit]"), () => api.report(null, msg).then(() => true), 'বার্তা পাঠানো হয়েছে')) refresh();
  });
}

function renderSettings(el, state, go) {
  el.innerHTML = h`
    <header class="view-head"><p class="kicker">অ্যাকাউন্ট</p><h1>সেটিংস</h1></header>
    <section class="panel stack">
      <p><span class="muted">লগইন ইমেইল:</span> <strong>${state.session.user.email}</strong></p>
      <nav class="settings-links">
        <a href="#/edit">${icon('edit')} বায়োডাটা সম্পাদনা</a>
        <a href="#/dislikes">${icon('x')} অপছন্দের তালিকা</a>
        <a href="#/support">${icon('help')} সাপোর্ট ও রিপোর্ট</a>
        ${state.admin ? h`<a href="#/admin">${icon('shield')} অ্যাডমিন প্যানেল</a>` : ''}
        <a href="privacy.html">${icon('shield')} প্রাইভেসি পলিসি</a>
        <button type="button" data-signout>${icon('out')} লগআউট</button>
      </nav>
    </section>
    <section class="panel danger stack">
      <h2>বায়োডাটা মুছে ফেলুন</h2>
      <p class="muted">আপনার বায়োডাটা, গোপন তথ্য, পছন্দের তালিকা ও প্রস্তাব স্থায়ীভাবে মুছে যাবে। এটি আর ফেরত আনা যাবে না।</p>
      <label class="field"><span>নিশ্চিত করতে লিখুন: মুছে ফেলুন</span><input id="confirm-del" autocomplete="off"></label>
      <button class="btn btn-danger" type="button" id="del" disabled>স্থায়ীভাবে মুছে ফেলুন</button>
    </section>`;
  const input = el.querySelector('#confirm-del');
  const del = el.querySelector('#del');
  input.addEventListener('input', () => { del.disabled = input.value.trim() !== 'মুছে ফেলুন'; });
  del.addEventListener('click', async () => {
    if (await act(del, () => api.deleteMyBiodata().then(() => true), 'আপনার বায়োডাটা মুছে ফেলা হয়েছে')) go('dashboard');
  });
}

export async function render(el, { name, state, go, refresh }) {
  if (name === 'support') return renderSupport(el, refresh);
  return renderSettings(el, state, go);
}
