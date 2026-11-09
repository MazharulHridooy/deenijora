// Biodata editor: 4-step form. Public fields → biodatas, name/phones → biodata_private (owner + admin only).
import { api } from '../db.js';
import { h, raw, options, listOptions, LABELS, DISTRICTS, toast, formData, errorText, label } from '../ui.js';

const Y = new Date().getFullYear();
const PHONE = /^(\+?88)?01[3-9]\d{8}$/;

const STEPS = ['প্রাথমিক তথ্য', 'শিক্ষা ও পেশা', 'দ্বীন ও পরিবার', 'প্রত্যাশা ও যোগাযোগ'];

const field = (lbl, control, hint = '') => h`<label class="field"><span>${lbl}</span>${control}${hint ? h`<small>${hint}</small>` : ''}</label>`;
const text = (name, v, attrs = '') => h`<input name="${name}" value="${v ?? ''}" ${raw(attrs)}>`;
const area = (name, v, max, ph = '') => h`<textarea name="${name}" maxlength="${max}" rows="4" placeholder="${ph}">${v ?? ''}</textarea>`;
const select = (name, opts, req = true) => h`<select name="${name}" ${raw(req ? 'required' : '')}>${opts}</select>`;

function stepHtml(b, p) {
  return [
    h`<div class="grid-2">
      ${field('আমি', select('gender', options(LABELS.gender, b.gender, 'বাছাই করুন')))}
      ${field('জন্মসাল', text('birth_year', b.birth_year, `type="number" required min="1950" max="${Y - 18}" inputmode="numeric"`), 'বয়স কমপক্ষে ১৮ হতে হবে')}
      ${field('উচ্চতা (সেমি)', text('height_cm', b.height_cm, 'type="number" min="120" max="230" inputmode="numeric"'), '৫ ফুট = ১৫২ সেমি, ৫ ফুট ৬ = ১৬৮ সেমি')}
      ${field('বৈবাহিক অবস্থা', select('marital_status', options(LABELS.marital_status, b.marital_status, 'বাছাই করুন')))}
      ${field('স্থায়ী জেলা', select('district', listOptions(DISTRICTS, b.district, 'বাছাই করুন')))}
      ${field('বর্তমান অবস্থান', text('current_location', b.current_location, 'maxlength="80" placeholder="যেমন: মিরপুর, ঢাকা"'))}
    </div>`,
    h`<div class="stack">
      ${field('শিক্ষাগত যোগ্যতা', text('education', b.education, 'required maxlength="200" placeholder="যেমন: BSc (CSE), দাওরায়ে হাদিস"'))}
      ${field('পেশা', text('occupation', b.occupation, 'required maxlength="200" placeholder="যেমন: শিক্ষক, ব্যবসা"'))}
    </div>`,
    h`<div class="stack">
      <div class="grid-2">
        ${field('নামাজ', select('salah', options(LABELS.salah, b.salah, 'বাছাই করুন')))}
        ${field('কুরআন তিলাওয়াত', select('quran', options(LABELS.quran, b.quran, 'বাছাই করুন'), false))}
      </div>
      ${field('দ্বীনি জীবন সম্পর্কে', area('religious_notes', b.religious_notes, 1000, 'পর্দা, দাড়ি, মাজহাব, দ্বীনি শিক্ষা ইত্যাদি'))}
      ${field('পারিবারিক তথ্য', area('family_notes', b.family_notes, 1000, 'বাবা-মায়ের পেশা, ভাই-বোন, পারিবারিক অবস্থা'))}
      ${field('নিজের সম্পর্কে', area('about', b.about, 1500, 'স্বভাব, আগ্রহ, জীবনের লক্ষ্য'))}
    </div>`,
    h`<div class="stack">
      <div class="grid-2">
        ${field('কাঙ্ক্ষিত জীবনসঙ্গীর বয়স (সর্বনিম্ন)', text('partner_age_min', b.partner_age_min, 'type="number" min="18" max="80" inputmode="numeric"'))}
        ${field('সর্বোচ্চ', text('partner_age_max', b.partner_age_max, 'type="number" min="18" max="80" inputmode="numeric"'))}
      </div>
      ${field('জীবনসঙ্গীর কাছে প্রত্যাশা', area('partner_expectations', b.partner_expectations, 1500))}
      <fieldset class="private-box">
        <legend>${raw('<svg class="ico" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>')} গোপন তথ্য — কেউ দেখতে পাবে না</legend>
        <p class="fine">শুধু Deenijora-র যাচাইকারী দেখতে পান। দুই পরিবারের সম্মতি ছাড়া কখনো কাউকে দেওয়া হয় না।</p>
        <div class="grid-2">
          ${field('আপনার পূর্ণ নাম', text('full_name', p.full_name, 'required minlength="2" maxlength="80" autocomplete="name"'))}
          ${field('আপনার মোবাইল', text('phone', p.phone, 'required type="tel" inputmode="tel" autocomplete="tel" placeholder="01XXXXXXXXX"'))}
          ${field('অভিভাবকের নাম', text('guardian_name', p.guardian_name, 'required minlength="2" maxlength="80"'))}
          ${field('অভিভাবকের সাথে সম্পর্ক', text('guardian_relation', b.guardian_relation, 'required maxlength="40" placeholder="বাবা / মা / ভাই"'))}
          ${field('অভিভাবকের মোবাইল', text('guardian_phone', p.guardian_phone, 'required type="tel" inputmode="tel" placeholder="01XXXXXXXXX"'))}
        </div>
      </fieldset>
      <label class="check"><input type="checkbox" name="consent_publish" ${raw(b.consent_publish ? 'checked' : '')}>
        <span>আমি নিশ্চিত করছি যে সব তথ্য সত্য, আমার অভিভাবক এ বিষয়ে জানেন, এবং যাচাইয়ের পর নাম-ফোন ছাড়া বাকি তথ্য লগইন করা ব্যবহারকারীদের দেখানোর অনুমতি দিচ্ছি।</span></label>
    </div>`,
  ];
}

const num = (v) => (v === '' || v == null ? null : Number(v));

function split(d) {
  const fields = {
    gender: d.gender, birth_year: num(d.birth_year), height_cm: num(d.height_cm), marital_status: d.marital_status,
    district: d.district, current_location: d.current_location || null, education: d.education?.trim(), occupation: d.occupation?.trim(),
    salah: d.salah, quran: d.quran || null, religious_notes: d.religious_notes || null, family_notes: d.family_notes || null,
    about: d.about || null, partner_age_min: num(d.partner_age_min), partner_age_max: num(d.partner_age_max),
    partner_expectations: d.partner_expectations || null, guardian_relation: d.guardian_relation?.trim(), consent_publish: d.consent_publish === 'on',
  };
  const norm = (s) => (s || '').replace(/[\s-]/g, '');
  const priv = { full_name: d.full_name?.trim(), phone: norm(d.phone), guardian_name: d.guardian_name?.trim(), guardian_phone: norm(d.guardian_phone) };
  return { fields, priv };
}

function validate({ fields: f, priv: p }, submit) {
  const errs = [];
  if (!f.gender || !f.marital_status || !f.district) errs.push([0, 'প্রাথমিক তথ্যের সব ঘর পূরণ করুন']);
  if (!f.birth_year || f.birth_year < 1950 || f.birth_year > Y - 18) errs.push([0, 'সঠিক জন্মসাল দিন (বয়স ১৮+)']);
  if (f.height_cm && (f.height_cm < 120 || f.height_cm > 230)) errs.push([0, 'উচ্চতা সেমিতে দিন (১২০–২৩০)']);
  if (!f.education || !f.occupation) errs.push([1, 'শিক্ষা ও পেশা লিখুন']);
  if (!f.salah) errs.push([2, 'নামাজের তথ্য বাছাই করুন']);
  if (f.partner_age_min && f.partner_age_max && f.partner_age_min > f.partner_age_max) errs.push([3, 'বয়সের সীমা ঠিক করুন']);
  if (!p.full_name || !p.guardian_name || !f.guardian_relation) errs.push([3, 'নাম ও অভিভাবকের তথ্য দিন']);
  if (!PHONE.test(p.phone) || !PHONE.test(p.guardian_phone)) errs.push([3, 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন (01XXXXXXXXX)']);
  if (submit && !f.consent_publish) errs.push([3, 'জমা দিতে সম্মতির ঘরে টিক দিন']);
  return errs;
}

export async function render(el) {
  const { biodata, priv } = await api.myBiodata();
  const b = biodata ?? {};
  const p = priv ?? {};
  let step = 0;

  el.innerHTML = h`
    <header class="view-head">
      <p class="kicker">${biodata ? `${biodata.code} · ${label('status', biodata.status)}` : 'নতুন বায়োডাটা'}</p>
      <h1>আমার বায়োডাটা</h1>
      ${biodata?.status === 'approved' ? h`<p class="note-sm">প্রকাশিত বায়োডাটা সম্পাদনা করলে তা আবার যাচাইয়ে যাবে।</p>` : ''}
      ${biodata?.review_note ? h`<p class="review-note"><strong>যাচাইকারীর নোট:</strong> ${biodata.review_note}</p>` : ''}
    </header>
    <ol class="stepper" aria-label="ধাপসমূহ">${STEPS.map((s, i) => h`<li><button type="button" data-step="${i}"><span>${i + 1}</span>${s}</button></li>`)}</ol>
    <form id="bio" class="panel" novalidate>
      ${stepHtml(b, p).map((s, i) => h`<fieldset class="step" data-i="${i}"><legend class="sr-only">${STEPS[i]}</legend>${s}</fieldset>`)}
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" id="prev">← আগের ধাপ</button>
        <button type="button" class="btn btn-ghost" id="draft">খসড়া সংরক্ষণ</button>
        <button type="button" class="btn" id="next">পরের ধাপ →</button>
        <button type="submit" class="btn" id="submit">যাচাইয়ের জন্য জমা দিন</button>
      </div>
    </form>`;

  const form = el.querySelector('#bio');
  const show = (i) => {
    step = Math.max(0, Math.min(STEPS.length - 1, i));
    form.querySelectorAll('.step').forEach((s) => { s.hidden = Number(s.dataset.i) !== step; });
    el.querySelectorAll('[data-step]').forEach((btn) => {
      const n = Number(btn.dataset.step);
      btn.classList.toggle('active', n === step);
      btn.classList.toggle('done', n < step);
      if (n === step) btn.setAttribute('aria-current', 'step'); else btn.removeAttribute('aria-current');
    });
    el.querySelector('#prev').hidden = step === 0;
    el.querySelector('#next').hidden = step === STEPS.length - 1;
    el.querySelector('#submit').hidden = step !== STEPS.length - 1;
  };
  show(0);

  el.querySelectorAll('[data-step]').forEach((btn) => btn.addEventListener('click', () => show(Number(btn.dataset.step))));
  el.querySelector('#prev').addEventListener('click', () => show(step - 1));
  el.querySelector('#next').addEventListener('click', () => { show(step + 1); form.querySelector('.step:not([hidden]) input, .step:not([hidden]) select')?.focus(); });

  async function save(submit, btn) {
    const data = split(formData(form));
    const errs = validate(data, submit);
    if (errs.length) { show(errs[0][0]); toast(errs[0][1], 'error'); return; }
    btn.disabled = true;
    try {
      await api.saveBiodata(data.fields, data.priv, submit);
      toast(submit ? 'জমা হয়েছে! আমরা শিগগিরই ফোনে যাচাই করব।' : 'খসড়া সংরক্ষিত হয়েছে');
      location.hash = '#/dashboard';
    } catch (err) {
      console.error(err);
      toast(errorText(err), 'error');
    } finally { btn.disabled = false; }
  }
  el.querySelector('#draft').addEventListener('click', (e) => save(false, e.currentTarget));
  form.addEventListener('submit', (e) => { e.preventDefault(); save(true, el.querySelector('#submit')); });
}
