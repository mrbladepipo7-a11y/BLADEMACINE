# STUDIA — გაუმჯობესებული სივრცე შესვლის შემდეგ

ეს დამატებითი ფაილები მხოლოდ შესვლის შემდეგ ხილულ სასწავლო სივრცეს ამშვენებს. რეგისტრაციისა და შესვლის არსებული კოდი არ იცვლება.

## ფაილები
- `studia-after-login.css` — ქვიზებისა და დეშბორდის ბარათების დიზაინი
- `studia-after-login.js` — ბარათებს აჩენს მხოლოდ წარმატებული შესვლის შემდეგ
- `assets/quiz-illustration.svg` — ქვიზის ილუსტრაცია
- `assets/dashboard-illustration.svg` — დეშბორდის ილუსტრაცია

## დამატება GitHub-ში
1. ატვირთე `studia-after-login.css` და `studia-after-login.js` BLADEMACINE-ის მთავარ საქაღალდეში.
2. შექმენი `assets` საქაღალდე და ატვირთე მასში ორივე SVG.
3. `index.html`-ის `<head>`-ში, `style.css`-ის ქვემოთ დაამატე:
   `<link rel="stylesheet" href="studia-after-login.css">`
4. `index.html`-ის ბოლოში, `app.js`-ის სკრიპტის შემდეგ დაამატე:
   `<script src="studia-after-login.js"></script>`
5. შეინახე ცვლილებები და განაახლე საიტი `Ctrl + F5`-ით.

არ შეცვალო `config.js`, `app.js`, რეგისტრაციის ფორმა ან Cloudflare Worker. ეს არის ვიზუალური დამატება; ქვიზებისა და დეშბორდის სრულფასოვანი ფუნქციები ცალკე უნდა დაემატოს.
