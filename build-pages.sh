#!/bin/sh
# Regenerates the static info pages (about, guide, contact, terms, privacy) from one template.
# Edit the page bodies below, then run: sh build-pages.sh
set -e
WA=$(sed -n "s/^export const WHATSAPP = '\(.*\)';/\1/p" js/config.js)

page() { # $1 file  $2 title  $3 description  $4 body-file
cat > "$1" <<EOF
<!doctype html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>$2 — Deenijora</title>
  <meta name="description" content="$3">
  <meta name="theme-color" content="#0f3d2e">
  <meta name="color-scheme" content="light dark">
  <link rel="canonical" href="https://deenijora.com/$1">
  <link rel="icon" href="images/logo.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600&family=Tiro+Bangla&display=swap">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header class="site-header">
    <div class="wrap header-row">
      <a class="brand" href="index.html"><img src="images/logo.svg" alt="" width="36" height="36"><span>Deenijora</span></a>
      <nav aria-label="প্রধান মেনু" class="nav">
        <a href="about.html">আমাদের সম্পর্কে</a>
        <a href="guide.html">নির্দেশনা</a>
        <a href="contact.html">যোগাযোগ</a>
        <a href="app.html#/search">বায়োডাটা খুঁজুন</a>
      </nav>
      <a class="btn btn-sm" href="app.html#/edit">লগইন / নিবন্ধন</a>
    </div>
  </header>
  <main class="doc">
    <article class="wrap narrow">
$(sed "s/{{WA}}/$WA/g" "$4")
    </article>
  </main>
  <footer class="site-footer">
    <div class="wrap footer-row">
      <div>
        <a class="brand" href="index.html"><img src="images/logo.svg" alt="" width="28" height="28"><span>Deenijora</span></a>
        <p class="muted">আমরা কখনো আগে টাকা চাই না।</p>
      </div>
      <nav aria-label="ফুটার লিংক" class="footer-links">
        <a href="about.html">আমাদের সম্পর্কে</a>
        <a href="guide.html">নির্দেশনা</a>
        <a href="contact.html">যোগাযোগ</a>
        <a href="terms.html">শর্তাবলি</a>
        <a href="privacy.html">প্রাইভেসি</a>
      </nav>
    </div>
    <p class="wrap muted small">© ২০২৬ Deenijora · ঢাকা, বাংলাদেশ</p>
  </footer>
</body>
</html>
EOF
}

T=$(mktemp -d)

cat > "$T/about" <<'EOF'
      <p class="kicker">আমাদের সম্পর্কে</p>
      <h1>বিয়ে সহজ হোক, সম্মানের সাথে</h1>
      <p class="lead">Deenijora ঢাকা-ভিত্তিক একটি ছোট, বিশ্বাসভিত্তিক উদ্যোগ। আমাদের লক্ষ্য দ্বীনদার পাত্র-পাত্রী ও তাদের পরিবারকে নিরাপদ, পর্দাশীল ও সম্মানজনক উপায়ে পরিচয় করিয়ে দেওয়া।</p>
      <h2>কেন শুরু করলাম</h2>
      <p>অনেক পরিবার উপযুক্ত প্রস্তাব খুঁজতে গিয়ে ভুয়া প্রোফাইল, আগাম টাকার দাবি আর ব্যক্তিগত তথ্য ফাঁস হওয়ার ভয়ে পড়েন। আমরা এমন একটি জায়গা বানাতে চেয়েছি যেখানে প্রতিটি বায়োডাটা মানুষ দিয়ে যাচাই করা, এবং অভিভাবকের সম্মতি ছাড়া কিছুই এগোয় না।</p>
      <h2>আমরা যেভাবে কাজ করি</h2>
      <ul>
        <li><strong>মানুষের যাচাই:</strong> প্রতিটি বায়োডাটা প্রকাশের আগে আমরা ফোনে প্রার্থী ও অভিভাবকের সাথে আলাদা করে কথা বলি।</li>
        <li><strong>গোপনীয়তা:</strong> নাম, ফোন নম্বর বা ছবি কখনো প্রকাশ্যে দেখানো হয় না।</li>
        <li><strong>সম্মতিতে পরিচয়:</strong> দুই পক্ষ সম্মতি দিলে তবেই আমরা পরিবার দুটিকে পরিচয় করিয়ে দিই।</li>
        <li><strong>আগাম টাকা নয়:</strong> নিবন্ধন, যাচাই ও খোঁজা বিনামূল্যে।</li>
      </ul>
      <p class="note">আমরা কোনো ফলাফলের নিশ্চয়তা দিই না — জোড়া আল্লাহর হাতে। আমরা শুধু পথটা নিরাপদ ও সহজ করার চেষ্টা করি।</p>
EOF

cat > "$T/guide" <<'EOF'
      <p class="kicker">নির্দেশনা</p>
      <h1>কীভাবে Deenijora ব্যবহার করবেন</h1>
      <h2>১. অ্যাকাউন্ট খুলুন</h2>
      <p>ইমেইল দিয়ে <a href="app.html#/login">লগইন</a> করুন। পাসওয়ার্ড লাগে না, ইমেইলে আসা ৬ সংখ্যার কোড দিলেই হবে।</p>
      <h2>২. বায়োডাটা জমা দিন</h2>
      <p>৪টি ছোট ধাপে তথ্য দিন: প্রাথমিক তথ্য, শিক্ষা ও পেশা, দ্বীন ও পরিবার, প্রত্যাশা ও যোগাযোগ। আপনার নাম ও ফোন নম্বর আলাদা গোপন ঘরে থাকে, যা শুধু আমাদের যাচাইকারী দেখেন।</p>
      <h2>৩. ফোনে যাচাই</h2>
      <p>জমা দেওয়ার পর আমরা আপনাকে ও আপনার অভিভাবককে ফোন করি। যাচাই শেষ হলে বায়োডাটা প্রকাশিত হয়। কোনো তথ্য ঠিক না থাকলে "সংশোধন আবশ্যক" নোট পাবেন।</p>
      <h2>৪. খুঁজুন ও তালিকা রাখুন</h2>
      <p>জেলা, বয়স, বৈবাহিক অবস্থা ও নামাজের ভিত্তিতে খুঁজুন। পছন্দের বায়োডাটা ♡ দিয়ে রাখুন, আর যেগুলো দেখতে চান না ✕ দিয়ে লুকিয়ে দিন।</p>
      <h2>৫. আগ্রহ জানান</h2>
      <p>আপনার নিজের বায়োডাটা প্রকাশিত হলে অন্য বায়োডাটায় "আগ্রহ জানান" বোতাম চাপুন। অপর পক্ষ আপনার বায়োডাটা নম্বর ও ছোট বার্তা দেখে সম্মতি দেবেন বা না করবেন।</p>
      <h2>৬. সম্মতিতে পরিচয়</h2>
      <p>দুই পক্ষ সম্মত হলে আমরা দুই পরিবারের অভিভাবকের সাথে কথা বলে পরিচয়ের ব্যবস্থা করি। এর আগে কেউ কারও নম্বর পান না।</p>
      <h2>সতর্কতা</h2>
      <ul>
        <li>বার্তায় নিজের নাম, ফোন নম্বর বা সোশ্যাল মিডিয়া লিখবেন না।</li>
        <li>কেউ Deenijora-র নাম করে আগাম টাকা চাইলে দেবেন না, আমাদের জানান।</li>
        <li>সন্দেহজনক বায়োডাটা দেখলে সেই পেজের নিচে "অভিযোগ জানান" চাপুন।</li>
      </ul>
EOF

cat > "$T/contact" <<'EOF'
      <p class="kicker">যোগাযোগ</p>
      <h1>আমাদের সাথে কথা বলুন</h1>
      <p class="lead">প্রশ্ন, পরামর্শ বা অভিযোগ — যেকোনো বিষয়ে লিখুন। সাধারণত ২৪ ঘণ্টার মধ্যে উত্তর দিই, ইনশাআল্লাহ।</p>
      <div class="cta-row">
        <a class="btn" href="https://wa.me/{{WA}}" target="_blank" rel="noopener">WhatsApp-এ কথা বলুন</a>
        <a class="btn btn-ghost" href="app.html#/support">অ্যাকাউন্ট থেকে বার্তা পাঠান</a>
      </div>
      <h2>বায়োডাটা মুছতে চাইলে</h2>
      <p>লগইন করে সেটিংস থেকে নিজেই স্থায়ীভাবে মুছে ফেলতে পারেন, অথবা WhatsApp-এ জানালে ২৪ ঘণ্টার মধ্যে মুছে দেওয়া হয়।</p>
      <h2>ঠিকানা</h2>
      <p>ঢাকা, বাংলাদেশ</p>
EOF

cat > "$T/terms" <<'EOF'
      <p class="kicker">শর্তাবলি</p>
      <h1>ব্যবহারের শর্তাবলি</h1>
      <p class="note">খসড়া — চূড়ান্ত প্রকাশের আগে আইন বিশেষজ্ঞকে দিয়ে যাচাই করানো হবে।</p>
      <h2>কারা ব্যবহার করতে পারবেন</h2>
      <p>১৮ বছর বা তার বেশি বয়সী, বিয়ের উদ্দেশ্যে, অভিভাবকের জ্ঞাতসারে।</p>
      <h2>সত্য তথ্য</h2>
      <p>বায়োডাটায় দেওয়া সব তথ্য সত্য হতে হবে। ভুল বা বিভ্রান্তিকর তথ্য পাওয়া গেলে বায়োডাটা সরিয়ে দেওয়া হবে।</p>
      <h2>নিষিদ্ধ</h2>
      <ul>
        <li>অন্য কারও তথ্য দিয়ে বায়োডাটা খোলা।</li>
        <li>বার্তায় যোগাযোগের তথ্য দেওয়া বা চাওয়া।</li>
        <li>অন্য ব্যবহারকারীর তথ্য সংগ্রহ, কপি বা প্রকাশ করা।</li>
        <li>হয়রানি, প্রতারণা বা টাকা দাবি।</li>
      </ul>
      <h2>ফি</h2>
      <p>নিবন্ধন, যাচাই ও খোঁজা বিনামূল্যে। অভিভাবক নির্দিষ্ট সেবা (পরিচয়ের ব্যবস্থা) চাইলে ফি লাগতে পারে, যা আগেই জানিয়ে দেওয়া হয়। আমরা কখনো আগে টাকা চাই না।</p>
      <h2>দায়</h2>
      <p>Deenijora পরিচয়ের মাধ্যম মাত্র। বিয়ের সিদ্ধান্ত ও খোঁজখবর নেওয়ার দায়িত্ব পরিবারের।</p>
EOF

cat > "$T/privacy" <<'EOF'
      <p class="kicker">প্রাইভেসি</p>
      <h1>প্রাইভেসি পলিসি</h1>
      <p class="note">খসড়া — চূড়ান্ত প্রকাশের আগে আইন বিশেষজ্ঞকে দিয়ে যাচাই করানো হবে।</p>
      <h2>কী তথ্য নেওয়া হয়</h2>
      <ul>
        <li><strong>অ্যাকাউন্ট:</strong> লগইনের ইমেইল।</li>
        <li><strong>বায়োডাটা:</strong> বয়স, জেলা, শিক্ষা, পেশা, দ্বীনি ও পারিবারিক তথ্য, প্রত্যাশা।</li>
        <li><strong>গোপন তথ্য:</strong> আপনার নাম ও মোবাইল, অভিভাবকের নাম ও মোবাইল।</li>
      </ul>
      <h2>কে কী দেখতে পান</h2>
      <ul>
        <li>যাচাইয়ের পর বায়োডাটার সাধারণ তথ্য শুধু লগইন করা ব্যবহারকারীরা দেখতে পান।</li>
        <li>নাম ও ফোন নম্বর শুধু আপনি এবং Deenijora-র যাচাইকারী দেখতে পান। দুই পরিবারের সম্মতি ছাড়া কখনো অন্য কাউকে দেওয়া হয় না।</li>
        <li>কারা আপনাকে পছন্দের তালিকায় রেখেছেন তা গোপন থাকে; আপনি শুধু মোট সংখ্যা দেখেন।</li>
      </ul>
      <h2>কেন নেওয়া হয়</h2>
      <p>শুধু তথ্য যাচাই ও উপযুক্ত পরিবারের সাথে পরিচয়ের ব্যবস্থা করার জন্য। তথ্য কখনো বিক্রি বা বিজ্ঞাপনে ব্যবহার করা হয় না।</p>
      <h2>কোথায় থাকে</h2>
      <p>নিরাপদ ক্লাউড ডেটাবেজে, প্রতিটি টেবিলে আলাদা প্রবেশাধিকার নিয়ম সহ।</p>
      <h2>কীভাবে মুছে ফেলা যায়</h2>
      <p>সেটিংস থেকে নিজেই স্থায়ীভাবে মুছে ফেলুন, অথবা <a href="https://wa.me/{{WA}}" target="_blank" rel="noopener">WhatsApp-এ</a> জানালে ২৪ ঘণ্টার মধ্যে মুছে দেওয়া হয়।</p>
EOF

page about.html "আমাদের সম্পর্কে" "Deenijora কারা, কেন শুরু করেছে এবং কীভাবে কাজ করে।" "$T/about"
page guide.html "নির্দেশনা" "Deenijora-য় বায়োডাটা জমা, খোঁজা ও আগ্রহ জানানোর ধাপে ধাপে নির্দেশনা।" "$T/guide"
page contact.html "যোগাযোগ" "Deenijora-র সাথে WhatsApp বা অ্যাকাউন্টের মাধ্যমে যোগাযোগ করুন।" "$T/contact"
page terms.html "শর্তাবলি" "Deenijora ব্যবহারের শর্তাবলি।" "$T/terms"
page privacy.html "প্রাইভেসি পলিসি" "Deenijora কী তথ্য নেয়, কে দেখতে পায় এবং কীভাবে মুছে ফেলা যায়।" "$T/privacy"
rm -rf "$T"
echo "built 5 pages"
