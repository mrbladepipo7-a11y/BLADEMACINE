/* Visual add-on only: appears after login; does not alter registration/login handlers. */
(() => {
  const area = document.getElementById("studentArea");
  if (!area || document.getElementById("studiaLearningHub")) return;
  const makeHub = () => {
    if (document.getElementById("studiaLearningHub")) return;
    const hub = document.createElement("section");
    hub.id = "studiaLearningHub";
    hub.className = "studia-hub";
    hub.setAttribute("aria-label", "სასწავლო ინსტრუმენტები");
    hub.innerHTML = `
      <div class="studia-hub__intro"><div>
        <p class="studia-hub__eyebrow">STUDIA · YOUR WORKSPACE</p>
        <h2 class="studia-hub__title">შენი სწავლის პანელი</h2>
        <p class="studia-hub__sub">ყველაფერი, რაც მომზადებას უფრო ორგანიზებულსა და სასიამოვნოს გახდის.</p>
      </div><span class="studia-hub__badge">✦ შენი პირადი სივრცე</span></div>
      <div class="studia-hub__grid">
        <article class="studia-feature studia-feature--quiz">
          <div class="studia-feature__copy"><span class="studia-feature__icon" aria-hidden="true">✦</span>
            <p class="studia-feature__kicker">PRACTICE · 01</p><h3 class="studia-feature__heading">ქვიზების სივრცე</h3>
            <p class="studia-feature__desc">შეამოწმე ცოდნა, გაიმეორე თემები და მოემზადე შუალედურისთვის.</p>
            <span class="studia-feature__status"><i class="studia-feature__status-dot"></i> სასწავლო სივრცე</span>
          </div><div class="studia-feature__art"><img src="assets/quiz-illustration.svg" alt="ქვიზის ბარათებისა და პასუხების ილუსტრაცია"></div>
        </article>
        <article class="studia-feature studia-feature--dash">
          <div class="studia-feature__copy"><span class="studia-feature__icon" aria-hidden="true">◈</span>
            <p class="studia-feature__kicker">OVERVIEW · 02</p><h3 class="studia-feature__heading">პროგრესის დეშბორდი</h3>
            <p class="studia-feature__desc">მოაწესრიგე სასწავლო პროცესი და ერთი შეხედვით დაინახე შენი მიზნები.</p>
            <span class="studia-feature__status"><i class="studia-feature__status-dot"></i> პირადი მიმოხილვა</span>
          </div><div class="studia-feature__art"><img src="assets/dashboard-illustration.svg" alt="სასწავლო პროგრესის დეშბორდის ილუსტრაცია"></div>
        </article>
      </div>
      <div class="studia-feature__footer"><span class="studia-feature__footer-mark">✧</span>
        <span><strong>ერთი სივრცე — მეტი ფოკუსი.</strong> ეს ვიზუალური დამატებაა; ქვიზებისა და პროგრესის სრულფასოვანი ფუნქციები ცალკე უნდა დაემატოს.</span>
      </div>`;
    hub.querySelector(".studia-feature--quiz").style.cursor = "pointer";
    hub.querySelector(".studia-feature--dash").style.cursor = "pointer";
    hub.querySelector(".studia-feature--quiz").addEventListener("click", () => { if (sessionStorage.getItem("studiaToken")) location.href = "quiz.html"; });
    hub.querySelector(".studia-feature--dash").addEventListener("click", () => { if (sessionStorage.getItem("studiaToken")) location.href = "dashboard.html"; });
    const heading = Array.from(area.querySelectorAll("h3")).find(el => el.textContent.trim() === "მასალები");
    if (heading) area.insertBefore(hub, heading); else area.appendChild(hub);
  };
  const check = () => { if (!area.classList.contains("hidden")) makeHub(); };
  check();
  new MutationObserver(check).observe(area, {attributes:true, attributeFilter:["class"]});
})();
