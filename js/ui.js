// Shared UI helpers: safe HTML templating, Bangla labels, toasts.

class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = (s) => new Raw(s);
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ESC[c]);
const val = (v) => {
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(val).join('');
  if (v === false || v == null) return '';
  return esc(v);
};
/** Tagged template: every interpolation is HTML-escaped unless wrapped in raw() or produced by h``. */
export const h = (strs, ...vals) => raw(strs.reduce((acc, s, i) => acc + s + (i < vals.length ? val(vals[i]) : ''), ''));

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
export const bn = (n) => String(n ?? '').replace(/\d/g, (d) => BN_DIGITS[d]);

export const age = (birthYear) => new Date().getFullYear() - birthYear;

export const LABELS = {
  gender: { male: 'পাত্র', female: 'পাত্রী' },
  marital_status: { never_married: 'অবিবাহিত', divorced: 'ডিভোর্সড', widowed: 'বিধবা/বিপত্নীক', married: 'বিবাহিত' },
  salah: { five_daily: 'নিয়মিত ৫ ওয়াক্ত', mostly: 'বেশিরভাগ সময়', trying: 'চেষ্টা করছি' },
  quran: { fluent: 'শুদ্ধভাবে পড়তে পারি', learning: 'শিখছি', no: 'পারি না' },
  status: { draft: 'খসড়া', pending: 'যাচাইয়ের অপেক্ষায়', approved: 'প্রকাশিত', needs_changes: 'সংশোধন আবশ্যক', hidden: 'লুকানো' },
  request: { pending: 'উত্তরের অপেক্ষায়', accepted: 'সম্মতি দিয়েছেন', declined: 'আগ্রহী নন', introduced: 'পরিচয় করানো হয়েছে', cancelled: 'বাতিল' },
};
export const label = (group, key) => LABELS[group]?.[key] ?? key ?? '—';

export const DISTRICTS = ['ঢাকা', 'গাজীপুর', 'নারায়ণগঞ্জ', 'নরসিংদী', 'মুন্সিগঞ্জ', 'মানিকগঞ্জ', 'টাঙ্গাইল', 'কিশোরগঞ্জ', 'ফরিদপুর', 'রাজবাড়ী', 'গোপালগঞ্জ', 'মাদারীপুর', 'শরীয়তপুর',
  'চট্টগ্রাম', 'কক্সবাজার', 'কুমিল্লা', 'ব্রাহ্মণবাড়িয়া', 'চাঁদপুর', 'ফেনী', 'নোয়াখালী', 'লক্ষ্মীপুর', 'খাগড়াছড়ি', 'রাঙ্গামাটি', 'বান্দরবান',
  'রাজশাহী', 'চাঁপাইনবাবগঞ্জ', 'নওগাঁ', 'নাটোর', 'পাবনা', 'সিরাজগঞ্জ', 'বগুড়া', 'জয়পুরহাট',
  'খুলনা', 'বাগেরহাট', 'সাতক্ষীরা', 'যশোর', 'নড়াইল', 'মাগুরা', 'ঝিনাইদহ', 'কুষ্টিয়া', 'চুয়াডাঙ্গা', 'মেহেরপুর',
  'বরিশাল', 'পটুয়াখালী', 'ভোলা', 'পিরোজপুর', 'ঝালকাঠি', 'বরগুনা',
  'সিলেট', 'মৌলভীবাজার', 'হবিগঞ্জ', 'সুনামগঞ্জ',
  'রংপুর', 'দিনাজপুর', 'ঠাকুরগাঁও', 'পঞ্চগড়', 'নীলফামারী', 'লালমনিরহাট', 'কুড়িগ্রাম', 'গাইবান্ধা',
  'ময়মনসিংহ', 'জামালপুর', 'শেরপুর', 'নেত্রকোনা', 'প্রবাসে'];

export const options = (map, selected, placeholder) => h`
  ${placeholder ? h`<option value="">${placeholder}</option>` : ''}
  ${Object.entries(map).map(([k, v]) => h`<option value="${k}" ${raw(k === selected ? 'selected' : '')}>${v}</option>`)}`;
export const listOptions = (list, selected, placeholder) =>
  options(Object.fromEntries(list.map((x) => [x, x])), selected, placeholder);

const ERRORS = {
  consent_required: 'প্রকাশের জন্য সম্মতির ঘরে টিক দিন।',
  own_biodata_not_approved: 'আগ্রহ জানাতে আগে আপনার নিজের বায়োডাটা প্রকাশিত হতে হবে।',
  target_unavailable: 'এই বায়োডাটাটি এখন পাওয়া যাচ্ছে না।',
  not_allowed: 'এই কাজটি করার অনুমতি নেই।',
  duplicate: 'আপনি আগেই আগ্রহ জানিয়েছেন।',
};
export const errorText = (err) => {
  const msg = err?.message || String(err);
  if (/duplicate key|one_open_request/.test(msg)) return ERRORS.duplicate;
  const key = Object.keys(ERRORS).find((k) => msg.includes(k));
  return key ? ERRORS[key] : 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।';
};

export function toast(text, kind = 'ok') {
  const t = document.createElement('div');
  t.className = `toast toast-${kind}`;
  t.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  t.textContent = text;
  document.body.append(t);
  setTimeout(() => t.classList.add('out'), 3200);
  setTimeout(() => t.remove(), 3700);
}

/** Run an async action with a busy button and user-friendly error toast. */
export async function act(button, fn, okText) {
  const prev = button?.disabled;
  if (button) button.disabled = true;
  try {
    const res = await fn();
    if (okText) toast(okText);
    return res;
  } catch (err) {
    console.error(err);
    toast(errorText(err), 'error');
    return undefined;
  } finally {
    if (button) button.disabled = prev ?? false;
  }
}

export const formData = (form) => Object.fromEntries(new FormData(form).entries());

export const ICONS = {
  home: '<path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="m14 6 4 4"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  send: '<path d="M21 3 3 10l7 3 3 7Z"/><path d="m10 13 4-4"/>',
  inbox: '<path d="M3 13h5l1 3h6l1-3h5"/><path d="M5 5h14l2 8v6H3v-6Z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h.01"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  shield: '<path d="M12 3 4 6v6c0 4.4 3.4 8.3 8 9 4.6-.7 8-4.6 8-9V6Z"/><path d="m9 12 2 2 4-4"/>',
  out: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
};
export const icon = (name, cls = '') => raw(`<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`);
