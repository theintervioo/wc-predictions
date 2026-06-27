// ── CONFIGURATION ──
const SHEET_URL = "https://script.google.com/macros/s/AKfycby2Azv-WsEcXaBNWJrKoSBjCxyOD3qxLrZctYgesJYkEqp_kNds9oGi5t71RYX5grqS4Q/exec";
const GOOGLE_CLIENT_ID = "585826882277-hfqgamt2avhi8jllec79t6qcnvsblq35.apps.googleusercontent.com";

// ── MATCH DATA ──
const MATCHES = [
  { id: 73, team1: "South Africa", team2: "Canada" },
  { id: 74, team1: "Germany", team2: "Paraguay" },
  { id: 75, team1: "Netherlands", team2: "Morocco" },
  { id: 76, team1: "Brazil", team2: "Japan" },
  { id: 77, team1: "France", team2: "Sweden" },
  { id: 78, team1: "Côte d'Ivoire", team2: "Norway" },
  { id: 79, team1: "Mexico", team2: "TBD" },
  { id: 80, team1: "TBD", team2: "TBD" },
  { id: 81, team1: "USA", team2: "Bosnia and Herzegovina" },
  { id: 82, team1: "Belgium", team2: "TBD" },
  { id: 83, team1: "TBD", team2: "TBD" },
  { id: 84, team1: "Spain", team2: "TBD" },
  { id: 85, team1: "Switzerland", team2: "TBD" },
  { id: 86, team1: "Argentina", team2: "Cabo Verde" },
  { id: 87, team1: "TBD", team2: "TBD" },
  { id: 88, team1: "Australia", team2: "Egypt" },
];

const MATCHES_PER_PAGE = 4;
const TOTAL_MATCH_PAGES = Math.ceil(MATCHES.length / MATCHES_PER_PAGE);
const TOTAL_STEPS = TOTAL_MATCH_PAGES + 1; // match pages + review

let matchPicks = {}; // { "Match 1": "Germany", "Match 2": "Brazil", ... }
let submitterName = "";
let submitterRoll = "";
let submitterEmail = "";
let idToken = "";
let currentStep = 0;
let tempGoogleProfile = null;

function checkSVG() {
  return '<svg viewBox="0 0 12 12" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,6 5,9 10,3"/></svg>';
}

function updateProgress() {
  const pct = Math.round((currentStep / (TOTAL_STEPS - 1)) * 100);
  document.getElementById("progress-bar").style.width = pct + "%";
  document.getElementById("step-pct").textContent = pct + "%";
  let label = "";
  if (currentStep < TOTAL_MATCH_PAGES) {
    const pageMatches = MATCHES.slice(currentStep * MATCHES_PER_PAGE, (currentStep + 1) * MATCHES_PER_PAGE);
    const from = pageMatches[0].id;
    const to = pageMatches[pageMatches.length - 1].id;
    label = "Matches " + from + "–" + to + " of 88";
  } else {
    label = "Review & submit";
  }
  document.getElementById("step-label").textContent = label;
}

function renderMatchPage(pageIndex) {
  const pageMatches = MATCHES.slice(pageIndex * MATCHES_PER_PAGE, (pageIndex + 1) * MATCHES_PER_PAGE);
  let html = pageMatches.map(function(m) {
    const key = "Match " + m.id;
    const picked = matchPicks[key] || "";
    const complete = picked !== "";
    return '<div class="match-card ' + (complete ? 'complete' : '') + '" id="card-match-' + m.id + '">' +
      '<div class="match-header">' +
        '<span class="match-label">Match ' + m.id + '</span>' +
        '<span class="match-done-badge">✓ Picked</span>' +
      '</div>' +
      '<div class="matchup-row">' +
        '<button class="team-pick ' + (picked === m.team1 ? 'selected' : '') + (picked && picked !== m.team1 ? ' dimmed' : '') + (m.team1 === "TBD" ? ' tbd-team' : '') + '" onclick="pickWinner(' + m.id + ',\'' + m.team1.replace(/'/g, "\\'") + '\')">' +
          '<span class="pick-indicator">' + checkSVG() + '</span>' + m.team1 +
        '</button>' +
        '<div class="vs-divider">VS</div>' +
        '<button class="team-pick ' + (picked === m.team2 ? 'selected' : '') + (picked && picked !== m.team2 ? ' dimmed' : '') + (m.team2 === "TBD" ? ' tbd-team' : '') + '" onclick="pickWinner(' + m.id + ',\'' + m.team2.replace(/'/g, "\\'") + '\')">' +
          m.team2 + '<span class="pick-indicator">' + checkSVG() + '</span>' +
        '</button>' +
      '</div>' +
    '</div>';
  }).join("");

  var pageDone = pageMatches.filter(function(m){ return matchPicks["Match " + m.id]; }).length;
  html += '<div class="nav-row">' +
    '<span class="count-badge" id="nav-count"><strong>' + pageDone + '</strong>/' + pageMatches.length + ' matches picked</span>' +
    '<div style="display:flex;gap:8px;">' +
      (pageIndex > 0 ? '<button class="btn" onclick="goStep(' + (currentStep-1) + ')">← Back</button>' : '') +
      '<button class="btn btn-green" onclick="tryAdvance()">' + (currentStep === TOTAL_MATCH_PAGES - 1 ? 'Review →' : 'Next →') + '</button>' +
    '</div></div>';
  return html;
}

function renderSummaryPage() {
  var matchSummary = MATCHES.map(function(m) {
    var key = "Match " + m.id;
    var winner = matchPicks[key] || "";
    var loser = winner === m.team1 ? m.team2 : m.team1;
    return '<div class="summary-match">' +
      '<span class="sm-label">Match ' + m.id + '</span>' +
      '<span class="tag">' + winner + ' ✓</span>' +
      '<span class="tag loser">' + loser + '</span>' +
    '</div>';
  }).join("");

  return '<div class="summary-card" style="border-color:rgba(0,201,122,0.25);">' +
    '<div class="summary-title" style="margin-bottom:8px;">👤 Submitter Profile</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">' +
      '<span class="pill">👤 ' + submitterName + '</span>' +
      '<span class="pill">🎫 ' + submitterRoll + '</span>' +
      '<span class="pill">📧 ' + submitterEmail + '</span>' +
    '</div>' +
    '<button class="btn" style="padding:4px 12px;font-size:11px;height:auto;text-transform:uppercase;font-weight:700;letter-spacing:0.05em;" onclick="logout()">Logout / Switch User</button>' +
  '</div>' +
  '<div class="summary-card">' +
    '<div class="summary-title">⚔️ Your Round of 32 Picks (' + Object.keys(matchPicks).length + '/16)</div>' +
    matchSummary +
  '</div>' +
  '<div class="error-msg" id="submit-error"></div>' +
  '<div class="nav-row" style="margin-top:1rem;">' +
    '<button class="btn" onclick="goStep(' + (currentStep-1) + ')">← Edit</button>' +
    '<button class="btn btn-green" id="submit-btn" onclick="submitPredictions()">Submit predictions 🚀</button>' +
  '</div>';
}

function renderStep() {
  var main = document.getElementById("main");
  if (currentStep < TOTAL_MATCH_PAGES) {
    main.innerHTML = renderMatchPage(currentStep);
  } else {
    main.innerHTML = renderSummaryPage();
  }
  updateProgress();
  window.scrollTo({top:0,behavior:"smooth"});
}

function goStep(n) { currentStep = n; renderStep(); }

function pickWinner(matchId, team) {
  var key = "Match " + matchId;
  if (matchPicks[key] === team) {
    delete matchPicks[key]; // deselect
  } else {
    matchPicks[key] = team;
  }
  // Re-render current page matches only
  var pageMatches = MATCHES.slice(currentStep * MATCHES_PER_PAGE, (currentStep + 1) * MATCHES_PER_PAGE);
  pageMatches.forEach(function(m) {
    var k = "Match " + m.id;
    var picked = matchPicks[k] || "";
    var card = document.getElementById("card-match-" + m.id);
    if (!card) return;
    if (picked) card.classList.add("complete");
    else card.classList.remove("complete");
    var btns = card.querySelectorAll(".team-pick");
    btns.forEach(function(b) {
      var btnTeam = b.textContent.trim();
      b.className = "team-pick" + (btnTeam === "TBD" ? " tbd-team" : "");
      if (picked === btnTeam) b.classList.add("selected");
      else if (picked) b.classList.add("dimmed");
    });
  });
  // Update count
  var pageDone = pageMatches.filter(function(m){ return matchPicks["Match " + m.id]; }).length;
  var countEl = document.getElementById("nav-count");
  if (countEl) countEl.innerHTML = '<strong>' + pageDone + '</strong>/' + pageMatches.length + ' matches picked';
}

function canAdvance() {
  if (currentStep < TOTAL_MATCH_PAGES) {
    var pageMatches = MATCHES.slice(currentStep * MATCHES_PER_PAGE, (currentStep + 1) * MATCHES_PER_PAGE);
    return pageMatches.every(function(m) { return matchPicks["Match " + m.id]; });
  }
  return true;
}

function tryAdvance() {
  if (!canAdvance()) {
    var el = document.getElementById("nav-count");
    if (el) { el.style.color = "#ff5f5f"; setTimeout(function(){ el.style.color = ""; }, 900); }
    return;
  }
  goStep(currentStep + 1);
}

/* ── AUTHENTICATION ── */
function updateUserBar() {
  var bar = document.getElementById("user-bar");
  var info = document.getElementById("user-bar-info");
  if (bar && info) {
    if (submitterName && submitterRoll) {
      info.textContent = submitterName + " (" + submitterRoll + ")";
      bar.style.display = "flex";
    } else {
      bar.style.display = "none";
    }
  }
}

function checkSubmissionStatus(email, token, callback, attempt) {
  attempt = attempt || 1;
  var main = document.getElementById("main");
  if (attempt === 1) {
    main.dataset.originalHtml = main.innerHTML;
    main.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem;text-align:center;color:var(--text);">' +
      '<div style="border:3px solid rgba(255,255,255,0.1);border-top:3px solid var(--green);border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin-bottom:1.5rem;"></div>' +
      '<h3 style="margin-bottom:0.5rem;">Verifying your account...</h3>' +
      '<p style="color:var(--muted);font-size:14px;">Checking for existing submissions.</p></div>';
  }

  var hasSubmitted = localStorage.getItem("has_submitted_r32");
  if (hasSubmitted === "true" && attempt === 1) {
    var savedPicks = localStorage.getItem("user_match_picks");
    submitterEmail = email;
    submitterName = localStorage.getItem("user_name") || "";
    submitterRoll = localStorage.getItem("user_roll") || "";
    idToken = token;
    if (savedPicks) matchPicks = JSON.parse(savedPicks);
    document.getElementById("login-container").style.display = "none";
    document.getElementById("app-container").style.display = "block";
    updateUserBar();
    showSuccess(submitterName, submitterRoll);
    return;
  }

  var url = SHEET_URL + "?action=checkStatus&email=" + encodeURIComponent(email) + "&id_token=" + encodeURIComponent(token) + "&stage=r32";
  var controller = new AbortController();
  var timeoutId = setTimeout(function(){ controller.abort(); }, 15000);

  fetch(url, { signal: controller.signal, redirect: "follow" })
    .then(function(res){ return res.json(); })
    .then(function(result) {
      clearTimeout(timeoutId);
      if (result.status === "success") {
        if (result.has_submitted) {
          localStorage.setItem("has_submitted_r32", "true");
          localStorage.setItem("user_email", email);
          localStorage.setItem("user_name", result.name);
          localStorage.setItem("user_roll", result.roll);
          localStorage.setItem("user_id_token", token);
          localStorage.setItem("user_match_picks", JSON.stringify(result.picks));
          submitterEmail = email;
          submitterName = result.name;
          submitterRoll = result.roll;
          idToken = token;
          matchPicks = result.picks;
          document.getElementById("login-container").style.display = "none";
          document.getElementById("app-container").style.display = "block";
          updateUserBar();
          showSuccess(result.name, result.roll);
        } else {
          main.innerHTML = main.dataset.originalHtml || "";
          callback();
        }
      } else {
        main.innerHTML = main.dataset.originalHtml || "";
        var errEl = document.getElementById("login-error-msg");
        if (errEl) errEl.textContent = "Verification failed: " + result.error;
        logout(true);
      }
    })
    .catch(function(err) {
      clearTimeout(timeoutId);
      if (attempt < 5) {
        setTimeout(function(){ checkSubmissionStatus(email, token, callback, attempt + 1); }, attempt * 1000);
      } else {
        main.innerHTML = main.dataset.originalHtml || "";
        var errEl = document.getElementById("login-error-msg");
        if (errEl) errEl.textContent = "Database connection timed out. Please check your internet and try again.";
        logout(true);
      }
    });
}

function initApp() {
  var savedEmail = localStorage.getItem("user_email");
  var savedToken = localStorage.getItem("user_id_token");
  if (GOOGLE_CLIENT_ID) {
    document.getElementById("google-signin-section").style.display = "block";
    document.getElementById("manual-login-form").style.display = "none";
    initGoogleSignIn();
  } else {
    document.getElementById("google-signin-section").style.display = "none";
    document.getElementById("manual-login-form").style.display = "block";
  }
  if (savedEmail && savedEmail.toLowerCase().endsWith("@iimidr.ac.in") && savedToken) {
    document.getElementById("login-container").style.display = "none";
    document.getElementById("app-container").style.display = "block";
    checkSubmissionStatus(savedEmail, savedToken, function(){ renderStep(); });
  } else {
    document.getElementById("login-container").style.display = "flex";
    document.getElementById("app-container").style.display = "none";
  }
}

function initGoogleSignIn() {
  if (!GOOGLE_CLIENT_ID) return;
  if (typeof google !== "undefined") {
    google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleCredentialResponse, hd: "iimidr.ac.in" });
    google.accounts.id.renderButton(document.getElementById("google-signin-btn"), { theme: "dark", size: "large", width: "100%", text: "signin_with" });
  } else { setTimeout(initGoogleSignIn, 1000); }
}

function handleCredentialResponse(response) {
  var jwt = response.credential;
  var payload = JSON.parse(atob(jwt.split('.')[1]));
  var email = payload.email;
  var name = payload.name;
  var errEl = document.getElementById("login-error-msg");
  if (!email.toLowerCase().endsWith("@iimidr.ac.in")) {
    errEl.textContent = "Access restricted. You must sign in with a verified @iimidr.ac.in Google account.";
    return;
  }
  errEl.textContent = "";
  tempGoogleProfile = { email: email, name: name, token: jwt };
  document.getElementById("login-subtitle").textContent = "Verifying submission status, please wait...";
  document.getElementById("google-signin-section").style.display = "none";
  checkSubmissionStatus(email, jwt, function() {
    document.getElementById("login-subtitle").textContent = "Sign in with your campus Google account to continue";
    var savedRoll = localStorage.getItem("user_roll");
    if (savedRoll) {
      submitterEmail = email; submitterName = name; submitterRoll = savedRoll; idToken = jwt;
      localStorage.setItem("user_email", email); localStorage.setItem("user_name", name); localStorage.setItem("user_id_token", jwt);
      document.getElementById("login-container").style.display = "none";
      document.getElementById("app-container").style.display = "block";
      updateUserBar(); renderStep();
    } else {
      document.getElementById("google-signin-section").style.display = "none";
      document.getElementById("roll-form").style.display = "block";
      document.getElementById("login-subtitle").textContent = "Welcome " + name + "! Enter your Roll Number to continue.";
    }
  });
}

function completeGoogleLogin(e) {
  if (e) e.preventDefault();
  var roll = document.getElementById("login-roll").value.trim();
  var errEl = document.getElementById("roll-error-msg");
  if (!roll) { errEl.textContent = "Roll number is required."; return; }
  if (!tempGoogleProfile) { errEl.textContent = "Authentication expired. Please sign in again."; logout(); return; }
  submitterEmail = tempGoogleProfile.email; submitterName = tempGoogleProfile.name; submitterRoll = roll; idToken = tempGoogleProfile.token;
  localStorage.setItem("user_email", submitterEmail); localStorage.setItem("user_name", submitterName); localStorage.setItem("user_roll", roll); localStorage.setItem("user_id_token", idToken);
  document.getElementById("login-container").style.display = "none";
  document.getElementById("app-container").style.display = "block";
  updateUserBar(); renderStep();
}

function handleManualLogin(e) {
  if (e) e.preventDefault();
  var name = document.getElementById("manual-name").value.trim();
  var roll = document.getElementById("manual-roll").value.trim();
  var email = document.getElementById("manual-email").value.trim();
  var errEl = document.getElementById("manual-error-msg");
  if (!name || !roll || !email) { errEl.textContent = "All fields are required."; return; }
  if (!email.toLowerCase().endsWith("@iimidr.ac.in")) { errEl.textContent = "Access restricted. Use your @iimidr.ac.in email."; return; }
  localStorage.setItem("user_email", email); localStorage.setItem("user_name", name); localStorage.setItem("user_roll", roll); localStorage.setItem("user_id_token", "DEV_MODE_NO_TOKEN");
  checkSubmissionStatus(email, "DEV_MODE_NO_TOKEN", function() {
    submitterEmail = email; submitterName = name; submitterRoll = roll; idToken = "DEV_MODE_NO_TOKEN";
    document.getElementById("login-container").style.display = "none";
    document.getElementById("app-container").style.display = "block";
    updateUserBar(); renderStep();
  });
}

function logout(keepErrorMsg) {
  localStorage.removeItem("user_email"); localStorage.removeItem("user_name"); localStorage.removeItem("user_roll");
  localStorage.removeItem("user_id_token"); localStorage.removeItem("has_submitted_r32"); localStorage.removeItem("user_match_picks");
  submitterEmail = ""; submitterName = ""; submitterRoll = ""; idToken = ""; tempGoogleProfile = null;
  matchPicks = {}; currentStep = 0;
  document.getElementById("login-subtitle").textContent = "Sign in with your campus Google account to continue";
  document.getElementById("login-roll").value = "";
  document.getElementById("roll-error-msg").textContent = "";
  if (!keepErrorMsg) document.getElementById("login-error-msg").textContent = "";
  if (GOOGLE_CLIENT_ID) {
    document.getElementById("google-signin-section").style.display = "block";
    document.getElementById("roll-form").style.display = "none";
    initGoogleSignIn();
  }
  updateUserBar();
  document.getElementById("login-container").style.display = "flex";
  document.getElementById("app-container").style.display = "none";
}

function submitPredictions() {
  var name = submitterName.trim(), roll = submitterRoll.trim(), email = submitterEmail.trim();
  var errEl = document.getElementById("submit-error");
  if (!name || !roll || !email) { errEl.textContent = "Missing user profile information. Please log in again."; return; }
  errEl.textContent = "";
  var btn = document.getElementById("submit-btn");
  btn.textContent = "Submitting..."; btn.disabled = true;

  var params = new URLSearchParams();
  params.append("action", "submit"); params.append("stage", "r32");
  params.append("email", email.toLowerCase()); params.append("id_token", idToken);
  params.append("name", name); params.append("roll", roll);
  params.append("total_picks", Object.keys(matchPicks).length);
  MATCHES.forEach(function(m) {
    params.append("Match " + m.id, matchPicks["Match " + m.id] || "");
  });

  var url = SHEET_URL + "?" + params.toString();
  var controller = new AbortController();
  var timeoutId = setTimeout(function(){ controller.abort(); }, 15000);

  fetch(url, { signal: controller.signal, redirect: "follow" })
    .then(function(res){ return res.json(); })
    .then(function(result) {
      clearTimeout(timeoutId);
      if (result.status === "success") {
        localStorage.setItem("has_submitted_r32", "true");
        localStorage.setItem("user_email", email); localStorage.setItem("user_name", name);
        localStorage.setItem("user_roll", roll); localStorage.setItem("user_id_token", idToken);
        localStorage.setItem("user_match_picks", JSON.stringify(matchPicks));
        showSuccess(name, roll);
      } else {
        errEl.textContent = result.error || "Submission failed. Please try again.";
        btn.textContent = "Submit predictions 🚀"; btn.disabled = false;
      }
    })
    .catch(function(err) {
      clearTimeout(timeoutId);
      errEl.textContent = "Submission timed out. Please check your internet and try again.";
      btn.textContent = "Submit predictions 🚀"; btn.disabled = false;
    });
}

function renderReadOnlySummary() {
  var html = '<div class="summary-card" style="text-align:left;max-width:580px;margin:1.5rem auto 1rem;">' +
    '<div class="summary-title" style="margin-bottom:8px;">👤 Submitter Profile</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
      '<span class="pill">👤 ' + submitterName + '</span>' +
      '<span class="pill">🎫 ' + submitterRoll + '</span>' +
      '<span class="pill">📧 ' + submitterEmail + '</span>' +
    '</div></div>' +
    '<div class="summary-card" style="text-align:left;max-width:580px;margin:0 auto 1.5rem;">' +
    '<div class="summary-title">⚔️ Your Round of 32 Picks</div>';
  MATCHES.forEach(function(m) {
    var key = "Match " + m.id;
    var winner = matchPicks[key] || "—";
    var loser = winner === m.team1 ? m.team2 : m.team1;
    html += '<div class="summary-match"><span class="sm-label">Match ' + m.id + '</span>' +
      '<span class="tag">' + winner + ' ✓</span>' +
      '<span class="tag loser">' + loser + '</span></div>';
  });
  html += '</div>';
  return html;
}

function showSuccess(name, roll) {
  localStorage.setItem("has_submitted_r32", "true");
  localStorage.setItem("user_match_picks", JSON.stringify(matchPicks));
  var bar = document.getElementById("user-bar");
  if (bar) bar.style.display = "none";
  document.getElementById("main").innerHTML =
    '<div class="success">' +
      '<div class="success-ring"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>' +
      '<h2>Predictions Locked In!</h2>' +
      '<p style="margin-bottom:1.5rem;">Your Round of 32 picks have been submitted successfully.</p>' +
      renderReadOnlySummary() +
      '<p style="margin-top:1rem;font-size:13px;color:rgba(240,244,248,0.35);">Results will be tracked as the knockout stage plays out.</p>' +
      '<div style="margin-top:2rem;display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">' +
        '<button class="btn" onclick="logout()">Logout / Switch User</button>' +
        '<a href="../index.html?history=true" class="btn" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;">View Group Stage Picks 📋</a>' +
      '</div>' +
    '</div>';
  document.getElementById("progress-bar").style.width = "100%";
  document.getElementById("step-pct").textContent = "100%";
  document.getElementById("step-label").textContent = "Done!";
  window.scrollTo({top:0,behavior:"smooth"});
}

// Initialize
initApp();
