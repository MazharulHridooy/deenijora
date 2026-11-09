import { api } from '../db.js';
import { h, act, toast } from '../ui.js';

export async function render(el) {
  el.innerHTML = h`
    <section class="auth-card">
      <img src="images/logo.svg" alt="" width="56" height="56" class="auth-logo">
      <h1>আসসালামু আলাইকুম</h1>
      <p class="muted">ইমেইল দিয়ে লগইন বা নতুন অ্যাকাউন্ট খুলুন। পাসওয়ার্ড লাগবে না, ইমেইলে একটি কোড যাবে।</p>
      <form id="f-email" class="stack" novalidate>
        <label class="field"><span>ইমেইল</span>
          <input type="email" name="email" required autocomplete="email" inputmode="email" placeholder="example@gmail.com">
        </label>
        <button class="btn" type="submit">কোড পাঠান</button>
      </form>
      <form id="f-code" class="stack" hidden novalidate>
        <p class="note-sm" id="sent-to"></p>
        <label class="field"><span>৬ সংখ্যার কোড</span>
          <input name="code" required inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" class="otp" placeholder="••••••">
        </label>
        <button class="btn" type="submit">লগইন করুন</button>
        <button class="linkish" type="button" id="change-email">অন্য ইমেইল ব্যবহার করুন</button>
      </form>
      <p class="fine">লগইন করে আপনি আমাদের <a href="terms.html">শর্তাবলি</a> ও <a href="privacy.html">প্রাইভেসি পলিসি</a> মেনে নিচ্ছেন।</p>
    </section>`;

  const fEmail = el.querySelector('#f-email');
  const fCode = el.querySelector('#f-code');
  let email = '';

  fEmail.addEventListener('submit', async (e) => {
    e.preventDefault();
    email = fEmail.email.value.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) { toast('সঠিক ইমেইল দিন', 'error'); fEmail.email.focus(); return; }
    const done = await act(fEmail.querySelector("[type=submit]"), () => api.sendCode(email).then(() => true));
    if (!done) return;
    fEmail.hidden = true; fCode.hidden = false;
    el.querySelector('#sent-to').textContent = `${email} — এ কোড পাঠানো হয়েছে। ইনবক্স বা স্প্যাম ফোল্ডার দেখুন।`;
    fCode.code.focus();
  });

  fCode.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = fCode.code.value.trim();
    if (!/^\d{6}$/.test(code)) { toast('৬ সংখ্যার কোড দিন', 'error'); return; }
    try {
      fCode.querySelector("[type=submit]").disabled = true;
      await api.verifyCode(email, code);
      toast('লগইন সফল হয়েছে');
    } catch {
      toast('কোডটি সঠিক নয় বা মেয়াদ শেষ', 'error');
      fCode.querySelector("[type=submit]").disabled = false;
    }
  });

  el.querySelector('#change-email').addEventListener('click', () => { fCode.hidden = true; fEmail.hidden = false; fEmail.email.focus(); });
}
