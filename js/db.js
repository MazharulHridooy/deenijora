// Data layer. Real Supabase when configured, otherwise the in-browser demo (js/mock.js).
// Every permission rule lives in the database (RLS + RPCs); this file only shapes queries.
import { SUPABASE_URL, SUPABASE_ANON_KEY, PAGE_SIZE } from './config.js';

export const DEMO = SUPABASE_URL.includes('YOUR-PROJECT') || SUPABASE_ANON_KEY.includes('YOUR-ANON-KEY');
export { PAGE_SIZE };

const PUBLIC_COLS = 'id, code, status, gender, birth_year, height_cm, marital_status, district, current_location, education, occupation, salah, quran, religious_notes, family_notes, about, partner_age_min, partner_age_max, partner_expectations, guardian_relation, approved_at';

async function realApi() {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const ok = ({ data, error }) => { if (error) throw error; return data; };
  const uid = async () => (await sb.auth.getUser()).data.user?.id;

  return {
    // ---- auth ----
    async session() { return (await sb.auth.getSession()).data.session; },
    onAuth(cb) { sb.auth.onAuthStateChange((_e, s) => cb(s)); },
    async sendCode(email) {
      ok(await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}${location.pathname}#/dashboard` } }));
    },
    async verifyCode(email, token) { ok(await sb.auth.verifyOtp({ email, token, type: 'email' })); },
    async signOut() { await sb.auth.signOut(); },
    async isAdmin() {
      const id = await uid();
      const row = ok(await sb.from('profiles').select('role').eq('id', id).maybeSingle());
      return row?.role === 'admin';
    },

    // ---- my biodata ----
    async myBiodata() {
      const id = await uid();
      const biodata = ok(await sb.from('biodatas').select('*').eq('user_id', id).maybeSingle());
      const priv = biodata ? ok(await sb.from('biodata_private').select('*').eq('biodata_id', biodata.id).maybeSingle()) : null;
      return { biodata, priv };
    },
    async saveBiodata(fields, priv, submit) {
      const id = await uid();
      const row = { ...fields, user_id: id, status: submit ? 'pending' : 'draft' };
      const saved = ok(await sb.from('biodatas').upsert(row, { onConflict: 'user_id' }).select().single());
      ok(await sb.from('biodata_private').upsert({ ...priv, biodata_id: saved.id }));
      return saved;
    },
    async deleteMyBiodata() { ok(await sb.rpc('delete_my_biodata')); },
    async myStats() { return ok(await sb.rpc('my_stats')); },

    // ---- browse ----
    async search(f, page = 0) {
      const id = await uid();
      const year = new Date().getFullYear();
      let q = sb.from('biodatas').select(PUBLIC_COLS, { count: 'exact' }).eq('status', 'approved').neq('user_id', id);
      if (f.gender) q = q.eq('gender', f.gender);
      if (f.district) q = q.eq('district', f.district);
      if (f.marital_status) q = q.eq('marital_status', f.marital_status);
      if (f.salah) q = q.eq('salah', f.salah);
      if (f.age_min) q = q.lte('birth_year', year - Number(f.age_min));
      if (f.age_max) q = q.gte('birth_year', year - Number(f.age_max));
      if (f.code) q = q.ilike('code', `%${f.code.replace(/[%_]/g, '')}%`);
      const { data, count, error } = await q.order('approved_at', { ascending: false }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: data, total: count ?? 0 };
    },
    async getBiodata(code) {
      const row = ok(await sb.from('biodatas').select(`${PUBLIC_COLS}, user_id`).eq('code', code).maybeSingle());
      if (!row) return null;
      const me = await uid();
      const fav = ok(await sb.from('favourites').select('kind').eq('user_id', me).eq('biodata_id', row.id).maybeSingle());
      return { ...row, mine: row.user_id === me, fav: fav?.kind ?? null };
    },
    async recordView(id) { await sb.rpc('record_view', { bid: id }); },

    // ---- favourites ----
    async setFav(biodataId, kind) {
      const me = await uid();
      if (!kind) return ok(await sb.from('favourites').delete().eq('user_id', me).eq('biodata_id', biodataId));
      return ok(await sb.from('favourites').upsert({ user_id: me, biodata_id: biodataId, kind }));
    },
    async myFavs(kind) {
      const me = await uid();
      const rows = ok(await sb.from('favourites').select(`kind, biodata:biodatas(${PUBLIC_COLS})`).eq('user_id', me).eq('kind', kind).order('created_at', { ascending: false }));
      return rows.map((r) => r.biodata).filter(Boolean);
    },

    // ---- interest requests ----
    async sendInterest(biodataId, msg) { return ok(await sb.rpc('send_interest', { bid: biodataId, msg })); },
    async respondInterest(id, accept) { ok(await sb.rpc('respond_interest', { rid: id, accept })); },
    async cancelInterest(id) { ok(await sb.rpc('cancel_interest', { rid: id })); },
    async myRequests() {
      const me = await uid();
      const sent = ok(await sb.from('interest_requests').select('*, biodata:biodatas(code, gender, birth_year, district)').eq('from_user', me).order('created_at', { ascending: false }));
      const mine = ok(await sb.from('biodatas').select('id').eq('user_id', me).maybeSingle());
      let received = [];
      if (mine) {
        received = ok(await sb.from('interest_requests').select('*').eq('to_biodata', mine.id).order('created_at', { ascending: false }));
        // ponytail: one RPC per request; fine for tens of requests, batch into one RPC if it grows.
        received = await Promise.all(received.map(async (r) => ({ ...r, sender_code: ok(await sb.rpc('request_sender_code', { rid: r.id })) })));
      }
      return { sent, received };
    },

    // ---- support ----
    async report(biodataId, message) {
      ok(await sb.from('reports').insert({ reporter: await uid(), biodata_id: biodataId || null, message }));
    },
    async myReports() {
      return ok(await sb.from('reports').select('*').eq('reporter', await uid()).order('created_at', { ascending: false }));
    },

    // ---- admin (RLS enforces admin-only) ----
    async adminQueue(status) {
      return ok(await sb.from('biodatas').select('*, private:biodata_private(*)').eq('status', status).order('updated_at', { ascending: true }).limit(100));
    },
    async adminSetStatus(id, status, note) {
      ok(await sb.from('biodatas').update({ status, review_note: note || null }).eq('id', id));
    },
    async adminRequests(status) {
      const reqs = ok(await sb.from('interest_requests').select('*, to:biodatas(code, private:biodata_private(*))').eq('status', status).order('updated_at', { ascending: true }).limit(100));
      const senders = [...new Set(reqs.map((r) => r.from_user))];
      const from = senders.length ? ok(await sb.from('biodatas').select('user_id, code, private:biodata_private(*)').in('user_id', senders)) : [];
      const byUser = Object.fromEntries(from.map((b) => [b.user_id, b]));
      return reqs.map((r) => ({ ...r, from: byUser[r.from_user] ?? null }));
    },
    async adminSetRequest(id, status, note) {
      ok(await sb.from('interest_requests').update({ status, admin_note: note || null, updated_at: new Date().toISOString() }).eq('id', id));
    },
    async adminReports() {
      return ok(await sb.from('reports').select('*, biodata:biodatas(code)').eq('status', 'open').order('created_at', { ascending: true }));
    },
    async adminResolveReport(id) { ok(await sb.from('reports').update({ status: 'resolved' }).eq('id', id)); },
  };
}

export const api = DEMO ? (await import('./mock.js')).default : await realApi();
