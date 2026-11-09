// DEMO mode: in-browser stand-in for Supabase with sample (fictional) biodatas.
// Mirrors the server rules in supabase/schema.sql closely enough to click through every screen.
// ponytail: localStorage only, single browser; real data always goes through Supabase.
import { PAGE_SIZE } from './config.js';

const KEY = 'deenijora-demo-v1';
const Y = new Date().getFullYear();
const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

const SAMPLE = [
  ['female', 24, 'ঢাকা', 'MSc, রসায়ন', 'শিক্ষিকা', 'five_daily', 'never_married'],
  ['male', 29, 'চট্টগ্রাম', 'BSc ইঞ্জিনিয়ারিং', 'সফটওয়্যার ইঞ্জিনিয়ার', 'five_daily', 'never_married'],
  ['female', 22, 'সিলেট', 'অনার্স (চলমান), ইংরেজি', 'শিক্ষার্থী', 'five_daily', 'never_married'],
  ['male', 31, 'রাজশাহী', 'MBBS', 'ডাক্তার', 'mostly', 'never_married'],
  ['female', 27, 'খুলনা', 'কামিল (মাদ্রাসা)', 'হিফজ শিক্ষিকা', 'five_daily', 'divorced'],
  ['male', 26, 'ঢাকা', 'দাওরায়ে হাদিস', 'ইমাম ও খতিব', 'five_daily', 'never_married'],
  ['female', 25, 'কুমিল্লা', 'BBA', 'ব্যাংক কর্মকর্তা', 'five_daily', 'never_married'],
  ['male', 34, 'প্রবাসে', 'MSc, কম্পিউটার সায়েন্স', 'রিসার্চার (মালয়েশিয়া)', 'five_daily', 'widowed'],
  ['female', 23, 'বরিশাল', 'ডিপ্লোমা, নার্সিং', 'নার্স', 'mostly', 'never_married'],
  ['male', 28, 'ময়মনসিংহ', 'BA, ইসলামিক স্টাডিজ', 'ব্যবসায়ী', 'five_daily', 'never_married'],
];

function seed() {
  const others = SAMPLE.map(([gender, a, district, education, occupation, salah, marital_status], i) => ({
    id: uuid(), code: `DJ-${1001 + i}`, user_id: `sample-${i}`, status: 'approved', review_note: null,
    gender, birth_year: Y - a, height_cm: gender === 'male' ? 168 + (i % 4) * 3 : 152 + (i % 4) * 3,
    marital_status, district, current_location: district === 'প্রবাসে' ? 'কুয়ালালামপুর' : `${district} শহর`,
    education, occupation, salah, quran: 'fluent',
    religious_notes: gender === 'male' ? 'সুন্নতি দাড়ি আছে, মাহরাম-গায়রে মাহরাম মেনে চলার চেষ্টা করি।' : 'নিকাব সহ পর্দা করি, ঘরে নিয়মিত তালিম হয়।',
    family_notes: 'বাবা অবসরপ্রাপ্ত সরকারি চাকরিজীবী, মা গৃহিণী। দুই ভাই এক বোন।',
    about: 'দ্বীনের উপর অটল থেকে একটি সুন্দর পরিবার গড়তে চাই। পড়াশোনা ও পরিবারকে সময় দিতে ভালোবাসি।',
    partner_age_min: gender === 'male' ? a - 8 : a, partner_age_max: gender === 'male' ? a - 1 : a + 8,
    partner_expectations: 'দ্বীনদার, নম্র স্বভাবের, পরিবারকে সম্মান করেন এমন কেউ।',
    guardian_relation: 'বাবা', consent_publish: true,
    approved_at: new Date(Date.now() - i * 86400000).toISOString(), updated_at: now(),
  }));
  return { user: null, admin: false, biodatas: others, priv: {}, favs: [], views: [], requests: [], reports: [], seq: 1100 };
}

let db;
try { db = JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { db = seed(); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* private mode: keep in memory */ } };
const listeners = [];
const fail = (code) => { throw new Error(code); };
const me = () => db.user?.id;
const mine = () => db.biodatas.find((b) => b.user_id === me());
const delay = (v) => new Promise((r) => setTimeout(() => r(v), 120));
const clone = (v) => JSON.parse(JSON.stringify(v ?? null));

export default {
  async session() { return db.user ? { user: db.user } : null; },
  onAuth(cb) { listeners.push(cb); },
  async sendCode(email) { if (!/^\S+@\S+\.\S+$/.test(email)) fail('bad_email'); return delay(); },
  async verifyCode(email, token) {
    if (token !== '123456') fail('Token has expired or is invalid');
    db.user = { id: `demo-${email}`, email };
    db.admin = email.startsWith('admin');
    save(); listeners.forEach((cb) => cb({ user: db.user }));
    return delay();
  },
  async signOut() { db.user = null; save(); listeners.forEach((cb) => cb(null)); },
  async isAdmin() { return db.admin; },

  async myBiodata() {
    const b = mine();
    return delay({ biodata: clone(b), priv: clone(b ? db.priv[b.id] : null) });
  },
  async saveBiodata(fields, priv, submit) {
    if (submit && !fields.consent_publish) fail('consent_required');
    let b = mine();
    if (!b) { b = { id: uuid(), code: `DJ-${db.seq++}`, user_id: me(), review_note: null, approved_at: null }; db.biodatas.push(b); }
    Object.assign(b, fields, { status: submit ? 'pending' : 'draft', updated_at: now() });
    db.priv[b.id] = { ...priv, biodata_id: b.id };
    save(); return delay(clone(b));
  },
  async deleteMyBiodata() {
    const b = mine();
    db.biodatas = db.biodatas.filter((x) => x !== b);
    db.favs = db.favs.filter((f) => f.user_id !== me() && f.biodata_id !== b?.id);
    db.requests = db.requests.filter((r) => r.from_user !== me() && r.to_biodata !== b?.id);
    if (b) delete db.priv[b.id];
    save(); return delay();
  },
  async myStats() {
    const b = mine();
    const v = db.views.filter((x) => x.biodata_id === b?.id);
    const since = (d) => v.filter((x) => Date.now() - Date.parse(x.at) < d * 86400000).length;
    return delay({
      views_today: v.filter((x) => new Date(x.at).toDateString() === new Date().toDateString()).length,
      views_7: since(7), views_30: since(30),
      liked_me: db.favs.filter((f) => f.biodata_id === b?.id && f.kind === 'like').length,
      likes: db.favs.filter((f) => f.user_id === me() && f.kind === 'like').length,
      dislikes: db.favs.filter((f) => f.user_id === me() && f.kind === 'dislike').length,
      sent: db.requests.filter((r) => r.from_user === me()).length,
      received: db.requests.filter((r) => r.to_biodata === b?.id).length,
    });
  },

  async search(f, page = 0) {
    let rows = db.biodatas.filter((b) => b.status === 'approved' && b.user_id !== me());
    if (f.gender) rows = rows.filter((b) => b.gender === f.gender);
    if (f.district) rows = rows.filter((b) => b.district === f.district);
    if (f.marital_status) rows = rows.filter((b) => b.marital_status === f.marital_status);
    if (f.salah) rows = rows.filter((b) => b.salah === f.salah);
    if (f.age_min) rows = rows.filter((b) => b.birth_year <= Y - Number(f.age_min));
    if (f.age_max) rows = rows.filter((b) => b.birth_year >= Y - Number(f.age_max));
    if (f.code) rows = rows.filter((b) => b.code.toLowerCase().includes(f.code.toLowerCase()));
    rows.sort((a, b) => (b.approved_at || '').localeCompare(a.approved_at || ''));
    return delay({ rows: clone(rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)), total: rows.length });
  },
  async getBiodata(code) {
    const b = db.biodatas.find((x) => x.code === code && (x.status === 'approved' || x.user_id === me() || db.admin));
    if (!b) return delay(null);
    const fav = db.favs.find((f) => f.user_id === me() && f.biodata_id === b.id);
    return delay({ ...clone(b), mine: b.user_id === me(), fav: fav?.kind ?? null });
  },
  async recordView(id) {
    const b = db.biodatas.find((x) => x.id === id);
    if (!b || b.user_id === me()) return;
    db.views.push({ biodata_id: id, viewer: me(), at: now() }); save();
  },

  async setFav(biodataId, kind) {
    db.favs = db.favs.filter((f) => !(f.user_id === me() && f.biodata_id === biodataId));
    if (kind) db.favs.push({ user_id: me(), biodata_id: biodataId, kind, created_at: now() });
    save(); return delay();
  },
  async myFavs(kind) {
    const ids = db.favs.filter((f) => f.user_id === me() && f.kind === kind).map((f) => f.biodata_id);
    return delay(clone(db.biodatas.filter((b) => ids.includes(b.id) && b.status === 'approved')));
  },

  async sendInterest(biodataId, msg) {
    if (mine()?.status !== 'approved') fail('own_biodata_not_approved');
    const t = db.biodatas.find((b) => b.id === biodataId && b.status === 'approved' && b.user_id !== me());
    if (!t) fail('target_unavailable');
    if (db.requests.some((r) => r.from_user === me() && r.to_biodata === biodataId && ['pending', 'accepted'].includes(r.status))) fail('one_open_request');
    const r = { id: uuid(), from_user: me(), to_biodata: biodataId, message: (msg || '').slice(0, 500), status: 'pending', admin_note: null, created_at: now(), updated_at: now() };
    db.requests.push(r); save(); return delay(r.id);
  },
  async respondInterest(id, accept) {
    const r = db.requests.find((x) => x.id === id && x.status === 'pending' && x.to_biodata === mine()?.id);
    if (!r) fail('not_allowed');
    r.status = accept ? 'accepted' : 'declined'; r.updated_at = now(); save(); return delay();
  },
  async cancelInterest(id) {
    const r = db.requests.find((x) => x.id === id && x.from_user === me() && x.status === 'pending');
    if (!r) fail('not_allowed');
    r.status = 'cancelled'; save(); return delay();
  },
  async myRequests() {
    const byId = (id) => db.biodatas.find((b) => b.id === id);
    const byUser = (u) => db.biodatas.find((b) => b.user_id === u);
    const sent = db.requests.filter((r) => r.from_user === me()).map((r) => ({ ...r, biodata: byId(r.to_biodata) }));
    const received = db.requests.filter((r) => r.to_biodata === mine()?.id).map((r) => ({ ...r, sender_code: byUser(r.from_user)?.code }));
    return delay(clone({ sent, received }));
  },

  async report(biodataId, message) {
    db.reports.push({ id: uuid(), reporter: me(), biodata_id: biodataId || null, message, status: 'open', created_at: now() });
    save(); return delay();
  },
  async myReports() { return delay(clone(db.reports.filter((r) => r.reporter === me()))); },

  async adminQueue(status) {
    if (!db.admin) fail('not_allowed');
    return delay(clone(db.biodatas.filter((b) => b.status === status).map((b) => ({ ...b, private: db.priv[b.id] ?? null }))));
  },
  async adminSetStatus(id, status, note) {
    if (!db.admin) fail('not_allowed');
    const b = db.biodatas.find((x) => x.id === id);
    Object.assign(b, { status, review_note: note || null, approved_at: status === 'approved' ? now() : b.approved_at });
    save(); return delay();
  },
  async adminRequests(status) {
    if (!db.admin) fail('not_allowed');
    const withPriv = (b) => b && { code: b.code, private: db.priv[b.id] ?? null };
    return delay(clone(db.requests.filter((r) => r.status === status).map((r) => ({
      ...r, to: withPriv(db.biodatas.find((b) => b.id === r.to_biodata)), from: withPriv(db.biodatas.find((b) => b.user_id === r.from_user)),
    }))));
  },
  async adminSetRequest(id, status, note) {
    if (!db.admin) fail('not_allowed');
    Object.assign(db.requests.find((r) => r.id === id), { status, admin_note: note || null, updated_at: now() });
    save(); return delay();
  },
  async adminReports() {
    if (!db.admin) fail('not_allowed');
    return delay(clone(db.reports.filter((r) => r.status === 'open').map((r) => ({ ...r, biodata: { code: db.biodatas.find((b) => b.id === r.biodata_id)?.code } }))));
  },
  async adminResolveReport(id) { db.reports.find((r) => r.id === id).status = 'resolved'; save(); return delay(); },

  /** Demo-only helper: simulate another user sending you interest so the inbox can be tried. */
  async demoReceive() {
    const b = mine(); if (!b) return;
    const sender = db.biodatas.find((x) => x.user_id.startsWith('sample-') && x.gender !== b.gender);
    db.requests.push({ id: uuid(), from_user: sender.user_id, to_biodata: b.id, message: 'আসসালামু আলাইকুম, আপনার বায়োডাটা আমার পরিবারের পছন্দ হয়েছে।', status: 'pending', created_at: now(), updated_at: now() });
    save();
  },
};
