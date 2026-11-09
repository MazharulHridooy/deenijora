import { api, DEMO } from '../db.js';
import { h, bn, icon, label, act } from '../ui.js';

const STATUS_HELP = {
  none: 'এখনো বায়োডাটা তৈরি করেননি। বায়োডাটা ছাড়া অন্য কাউকে আগ্রহ জানানো যাবে না।',
  draft: 'খসড়া সংরক্ষিত আছে। যাচাইয়ের জন্য জমা দিলে আমরা ফোনে আপনার ও অভিভাবকের সাথে কথা বলব।',
  pending: 'জমা হয়েছে। আমরা শিগগিরই ফোনে যাচাই করব, ইনশাআল্লাহ।',
  approved: 'আপনার বায়োডাটা প্রকাশিত। শুধু লগইন করা ব্যবহারকারীরা দেখতে পান, নাম-ফোন কখনো নয়।',
  needs_changes: 'কিছু তথ্য সংশোধন করতে হবে। নিচের নোট দেখে বায়োডাটা আপডেট করুন।',
  hidden: 'বায়োডাটা সাময়িকভাবে লুকানো আছে।',
};

const stat = (n, title, sub, href, ico) => h`
  <a class="stat" href="${href}">
    <span class="stat-ico">${icon(ico)}</span>
    <span class="stat-n">${bn(n)}</span>
    <span class="stat-t">${title}</span>
    <span class="stat-s">${sub}</span>
  </a>`;

export async function render(el) {
  const [{ biodata }, s] = await Promise.all([api.myBiodata(), api.myStats()]);
  const status = biodata?.status ?? 'none';

  el.innerHTML = h`
    <header class="view-head">
      <p class="kicker">ড্যাশবোর্ড</p>
      <h1>আপনার অবস্থা এক নজরে</h1>
    </header>

    <section class="status-card status-${status}">
      <div>
        <p class="status-label">বায়োডাটার অবস্থা</p>
        <h2>${status === 'none' ? 'তৈরি হয়নি' : label('status', status)} ${biodata ? h`<span class="code-pill">${biodata.code}</span>` : ''}</h2>
        <p>${STATUS_HELP[status]}</p>
        ${biodata?.review_note ? h`<p class="review-note"><strong>যাচাইকারীর নোট:</strong> ${biodata.review_note}</p>` : ''}
      </div>
      <div class="status-actions">
        <a class="btn ${status === 'approved' ? 'btn-ghost' : ''}" href="#/edit">${status === 'none' ? 'বায়োডাটা তৈরি করুন' : 'বায়োডাটা সম্পাদনা'}</a>
        ${status === 'approved' ? h`<a class="btn btn-ghost" href="#/b/${biodata.code}">${icon('eye')} দেখুন</a>` : ''}
      </div>
    </section>

    <section class="stats">
      <div class="stat stat-wide">
        <span class="stat-ico">${icon('eye')}</span>
        <span class="stat-n">${bn(s.views_30)}</span>
        <span class="stat-t">বার আপনার বায়োডাটা দেখা হয়েছে</span>
        <span class="mini-row">
          <span><b>${bn(s.views_30)}</b>শেষ ৩০ দিন</span>
          <span><b>${bn(s.views_7)}</b>শেষ ৭ দিন</span>
          <span><b>${bn(s.views_today)}</b>আজ</span>
        </span>
      </div>
      ${stat(s.liked_me, 'জন আপনাকে পছন্দের তালিকায় রেখেছেন', 'কারা রেখেছেন তা গোপন থাকে', '#/dashboard', 'heart')}
      ${stat(s.received, 'টি প্রস্তাব পেয়েছেন', 'উত্তর দিন প্রস্তাবসমূহ পেজে', '#/requests', 'inbox')}
      ${stat(s.sent, 'টি প্রস্তাব পাঠিয়েছেন', 'অবস্থা দেখুন', '#/requests', 'send')}
      ${stat(s.likes, 'টি পছন্দের তালিকায়', 'পরে দেখার জন্য রাখা', '#/likes', 'heart')}
      ${stat(s.dislikes, 'টি অপছন্দের তালিকায়', 'খোঁজার ফলাফলে লুকানো', '#/dislikes', 'x')}
    </section>

    <section class="tips">
      <h2>কীভাবে এগোবেন</h2>
      <ol>
        <li><strong>বায়োডাটা জমা দিন</strong> — সত্য ও পূর্ণ তথ্য দিন, অভিভাবকের নম্বর সহ।</li>
        <li><strong>ফোনে যাচাই</strong> — আমরা আপনার ও অভিভাবকের সাথে আলাদা কথা বলি।</li>
        <li><strong>আগ্রহ জানান</strong> — পছন্দের বায়োডাটায় প্রস্তাব পাঠান, অপর পক্ষ সম্মতি দিলে আমরা দুই পরিবারকে পরিচয় করিয়ে দিই।</li>
      </ol>
      ${DEMO && api.demoReceive && biodata ? h`<button class="btn btn-sm btn-ghost" type="button" id="demo-recv">ডেমো: একটি প্রস্তাব পাওয়ার অনুকরণ</button>` : ''}
    </section>`;

  el.querySelector('#demo-recv')?.addEventListener('click', (e) => act(e.currentTarget, async () => { await api.demoReceive(); location.hash = '#/requests'; }));
}
