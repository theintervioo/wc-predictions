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
  { id: 79, team1: "Mexico", team2: "Ecuador" },
  { id: 80, team1: "England", team2: "Congo DR" },
  { id: 81, team1: "USA", team2: "Bosnia and Herzegovina" },
  { id: 82, team1: "Belgium", team2: "Senegal" },
  { id: 83, team1: "Portugal", team2: "Croatia" },
  { id: 84, team1: "Spain", team2: "Austria" },
  { id: 85, team1: "Switzerland", team2: "Algeria" },
  { id: 86, team1: "Argentina", team2: "Cabo Verde" },
  { id: 87, team1: "Colombia", team2: "Ghana" },
  { id: 88, team1: "Australia", team2: "Egypt" },
];

// ── BRACKET STEPS DEFINITION ──
const STEPS = [
  { type: "matches", title: "Round of 32 — Part 1", matches: [73, 74, 75, 76] },
  { type: "matches", title: "Round of 32 — Part 2", matches: [77, 78, 79, 80] },
  { type: "matches", title: "Round of 32 — Part 3", matches: [81, 82, 83, 84] },
  { type: "matches", title: "Round of 32 — Part 4", matches: [85, 86, 87, 88] },
  { type: "matches", title: "Round of 16", matches: [89, 90, 91, 92, 93, 94, 95, 96] },
  { type: "matches", title: "Quarter-finals", matches: [97, 98, 99, 100] },
  { type: "matches", title: "Semi-finals", matches: [101, 102] },
  { type: "matches", title: "World Cup Finals", matches: [103, 104] },
  { type: "review", title: "Review & Submit" }
];

let matchPicks = {}; // { "Match 73": "Canada", ... }
let submitterName = "";
let submitterRoll = "";
let submitterEmail = "";
let idToken = "";
let currentStep = 0;
let tempGoogleProfile = null;

function checkSVG() {
  return '<svg viewBox="0 0 12 12" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,6 5,9 10,3"/></svg>';
}

// ── BRACKET DEPENDENCIES & RESOLUTION ──
const DEPENDENCIES = {
  73: 90, 75: 90,
  74: 89, 77: 89,
  76: 91, 78: 91,
  79: 92, 80: 92,
  83: 93, 84: 93,
  81: 94, 82: 94,
  86: 95, 88: 95,
  85: 96, 87: 96,
  
  89: 97, 90: 97,
  93: 98, 94: 98,
  91: 99, 92: 99,
  95: 100, 96: 100,
  
  97: 101, 98: 101,
  99: 102, 100: 102,
  
  101: [103, 104],
  102: [103, 104]
};

function isPlaceholder(teamName) {
  return !teamName || teamName.startsWith("Winner Match ") || teamName.startsWith("Loser Match ") || teamName === "TBD";
}

function getMatchWinner(id) {
  return matchPicks["Match " + id] || ("Winner Match " + id);
}

function getMatchLoser(id) {
  const teams = getMatchTeams(id);
  const winner = matchPicks["Match " + id];
  if (!winner) return "Loser Match " + id;
  return winner === teams.team1 ? teams.team2 : teams.team1;
}

function getMatchTeams(matchId) {
  if (matchId <= 88) {
    const matchObj = MATCHES.find(function(m) { return m.id === matchId; });
    return {
      team1: matchObj ? matchObj.team1 : "TBD",
      team2: matchObj ? matchObj.team2 : "TBD"
    };
  }
  
  // Round of 16
  if (matchId === 89) return { team1: getMatchWinner(74), team2: getMatchWinner(77) };
  if (matchId === 90) return { team1: getMatchWinner(73), team2: getMatchWinner(75) };
  if (matchId === 91) return { team1: getMatchWinner(76), team2: getMatchWinner(78) };
  if (matchId === 92) return { team1: getMatchWinner(79), team2: getMatchWinner(80) };
  if (matchId === 93) return { team1: getMatchWinner(83), team2: getMatchWinner(84) };
  if (matchId === 94) return { team1: getMatchWinner(81), team2: getMatchWinner(82) };
  if (matchId === 95) return { team1: getMatchWinner(86), team2: getMatchWinner(88) };
  if (matchId === 96) return { team1: getMatchWinner(85), team2: getMatchWinner(87) };
  
  // Quarter-finals
  if (matchId === 97) return { team1: getMatchWinner(89), team2: getMatchWinner(90) };
  if (matchId === 98) return { team1: getMatchWinner(93), team2: getMatchWinner(94) };
  if (matchId === 99) return { team1: getMatchWinner(91), team2: getMatchWinner(92) };
  if (matchId === 100) return { team1: getMatchWinner(95), team2: getMatchWinner(96) };
  
  // Semi-finals
  if (matchId === 101) return { team1: getMatchWinner(97), team2: getMatchWinner(98) };
  if (matchId === 102) return { team1: getMatchWinner(99), team2: getMatchWinner(100) };
  
  // Finals
  if (matchId === 103) return { team1: getMatchLoser(101), team2: getMatchLoser(102) };
  if (matchId === 104) return { team1: getMatchWinner(101), team2: getMatchWinner(102) };
  
  return { team1: "TBD", team2: "TBD" };
}

function propagateBracketChange(matchId) {
  const targets = DEPENDENCIES[matchId];
  if (!targets) return;
  
  const targetIds = Array.isArray(targets) ? targets : [targets];
  targetIds.forEach(function(targetId) {
    const teams = getMatchTeams(targetId);
    const picked = matchPicks["Match " + targetId];
    if (picked && picked !== teams.team1 && picked !== teams.team2) {
      delete matchPicks["Match " + targetId];
      propagateBracketChange(targetId);
    }
  });
}

// ── BRACKET TREE COLUMNS DEFINITION ──
const TREE_COLUMNS = [
  { title: "Round of 32", matches: [74, 77, 73, 75, 76, 78, 79, 80, 83, 84, 81, 82, 86, 88, 85, 87] },
  { title: "Round of 16", matches: [89, 90, 91, 92, 93, 94, 95, 96] },
  { title: "Quarter-finals", matches: [97, 98, 99, 100] },
  { title: "Semi-finals", matches: [101, 102] },
  { title: "Finals", matches: [104, 103], isFinalColumn: true }
];

function renderStep() {
  renderTree();
}

function renderTree() {
  const wrapper = document.querySelector(".bracket-tree-wrapper");
  const savedScrollLeft = wrapper ? wrapper.scrollLeft : 0;
  const savedScrollY = window.scrollY;

  let html = '<div class="tree-scroll-helper">' +
    '<svg style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>' +
    'Swipe left/right or use touch to navigate the full bracket tree' +
    '</div>' +
    '<div class="bracket-tree-wrapper">' +
    '<div class="bracket-tree">';
  
  TREE_COLUMNS.forEach(function(col) {
    html += '<div class="bracket-column">';
    html += '<div class="column-header">' + col.title + '</div>';
    
    col.matches.forEach(function(matchId) {
      const teams = getMatchTeams(matchId);
      const team1 = teams.team1;
      const team2 = teams.team2;
      const picked = matchPicks["Match " + matchId] || "";
      
      const t1Placeholder = isPlaceholder(team1);
      const t2Placeholder = isPlaceholder(team2);
      
      html += '<div class="tree-match-card ' + (picked ? 'complete' : '') + '" id="card-match-' + matchId + '">' +
        '<div class="tree-match-header">' +
          '<span>Match ' + matchId + '</span>' +
        '</div>' +
        '<div class="tree-match-teams">' +
          '<button class="tree-team-btn ' + (picked === team1 ? 'selected' : '') + (picked && picked !== team1 ? 'dimmed' : '') + '" ' +
            (t1Placeholder ? 'disabled' : 'onclick="pickWinner(' + matchId + ',\'' + team1.replace(/'/g, "\\'") + '\')"') + '>' +
            '<span>' + team1 + '</span>' +
            (picked === team1 ? '<span class="pick-check">✓</span>' : '') +
          '</button>' +
          '<button class="tree-team-btn ' + (picked === team2 ? 'selected' : '') + (picked && picked !== team2 ? 'dimmed' : '') + '" ' +
            (t2Placeholder ? 'disabled' : 'onclick="pickWinner(' + matchId + ',\'' + team2.replace(/'/g, "\\'") + '\')"') + '>' +
            '<span>' + team2 + '</span>' +
            (picked === team2 ? '<span class="pick-check">✓</span>' : '') +
          '</button>' +
        '</div>' +
      '</div>';
    });
    
    if (col.isFinalColumn) {
      const champion = getMatchWinner(104);
      const hasChampion = !!matchPicks["Match 104"];
      html += '<div class="champion-card ' + (hasChampion ? 'has-champ' : '') + '" id="champion-card">' +
        '<div class="champion-crown">🏆</div>' +
        '<div class="champion-title">WORLD CUP CHAMPION</div>' +
        '<div class="champion-name" id="champion-name">' + (hasChampion ? champion : 'TBD') + '</div>' +
      '</div>';
    }
    
    html += '</div>';
  });
  
  html += '</div></div>';
  
  document.getElementById("main").innerHTML = html;
  
  const newWrapper = document.querySelector(".bracket-tree-wrapper");
  if (newWrapper) {
    newWrapper.scrollLeft = savedScrollLeft;
  }
  window.scrollTo(window.scrollX, savedScrollY);
  
  updateSubmitBar();
}

function pickWinner(matchId, team) {
  const key = "Match " + matchId;
  if (matchPicks[key] === team) {
    delete matchPicks[key];
  } else {
    matchPicks[key] = team;
  }
  
  propagateBracketChange(matchId);
  renderTree();
}

function updateSubmitBar() {
  let totalPicks = 0;
  for (let matchId = 73; matchId <= 104; matchId++) {
    if (matchPicks["Match " + matchId]) {
      totalPicks++;
    }
  }
  
  const pct = Math.round((totalPicks / 32) * 100);
  
  const topBar = document.getElementById("progress-bar");
  const topPct = document.getElementById("step-pct");
  const topLabel = document.getElementById("step-label");
  if (topBar) topBar.style.width = pct + "%";
  if (topPct) topPct.textContent = pct + "%";
  if (topLabel) topLabel.textContent = totalPicks + "/32 Matches Predicted";
  
  const progressText = document.getElementById("progress-text");
  const progressFill = document.getElementById("progress-fill");
  const submitBtn = document.getElementById("submit-btn");
  
  if (progressText) progressText.textContent = totalPicks + "/32 Matches Predicted";
  if (progressFill) progressFill.style.width = pct + "%";
  
  if (submitBtn) {
    if (totalPicks === 32) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Predictions 🚀";
    } else {
      submitBtn.disabled = true;
      submitBtn.textContent = "Complete All Picks";
    }
  }
}

function confirmAndSubmit() {
  if (confirm("Are you sure you want to submit your tournament bracket predictions? Once submitted, your choices will be locked.")) {
    submitPredictions();
  }
}

function renderReadOnlySummary() {
  let html = '<div class="summary-card" style="text-align:left;max-width:580px;margin:1.5rem auto 1rem;">' +
    '<div class="summary-title" style="margin-bottom:8px;">👤 Submitter Profile</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
      '<span class="pill">👤 ' + submitterName + '</span>' +
      '<span class="pill">🎫 ' + submitterRoll + '</span>' +
      '<span class="pill">📧 ' + submitterEmail + '</span>' +
    '</div></div>';

  const groups = [
    { title: "Round of 32", matches: [74, 77, 73, 75, 76, 78, 79, 80, 83, 84, 81, 82, 86, 88, 85, 87] },
    { title: "Round of 16", matches: [89, 90, 91, 92, 93, 94, 95, 96] },
    { title: "Quarter-finals", matches: [97, 98, 99, 100] },
    { title: "Semi-finals", matches: [101, 102] },
    { title: "World Cup Finals", matches: [104, 103] }
  ];

  groups.forEach(function(g) {
    html += '<div class="summary-card" style="text-align:left;max-width:580px;margin:0 auto 1.5rem;">' +
      '<div class="summary-title">⚔️ ' + g.title + ' Picks</div>';
    
    g.matches.forEach(function(matchId) {
      const key = "Match " + matchId;
      const winner = matchPicks[key] || "—";
      const teams = getMatchTeams(matchId);
      const loser = winner === teams.team1 ? teams.team2 : teams.team1;
      
      let label = "Match " + matchId;
      if (matchId === 104) label = "Final";
      if (matchId === 103) label = "3rd Place Playoff";
      
      html += '<div class="summary-match"><span class="sm-label">' + label + '</span>' +
        '<span class="tag">' + winner + ' ✓</span>' +
        '<span class="tag loser">' + loser + '</span></div>';
    });
    html += '</div>';
  });
  
  return html;
}

// ── AUTHENTICATION ──
function updateUserBar() {
  const bar = document.getElementById("user-bar");
  const info = document.getElementById("user-bar-info");
  const submitBar = document.getElementById("submit-bar");
  if (bar && info) {
    if (submitterName && submitterRoll) {
      let groupLink = "";
      if (localStorage.getItem("has_group_history") === "true") {
        groupLink = ' | <a href="../index.html?history=true" style="color:var(--green);text-decoration:none;font-weight:600;margin-left:4px;" onmouseover="this.style.textDecoration=\'underline\'" onmouseout="this.style.textDecoration=\'none\'">Group Stage Picks 📋</a>';
      }
      info.innerHTML = submitterName + " (" + submitterRoll + ")" + groupLink;
      bar.style.display = "flex";
      
      const hasSubmitted = localStorage.getItem("has_submitted_r32") === "true";
      if (submitBar) {
        submitBar.style.display = hasSubmitted ? "none" : "block";
      }
    } else {
      bar.style.display = "none";
      if (submitBar) {
        submitBar.style.display = "none";
      }
    }
  }
}

function checkSubmissionStatus(email, token, callback, attempt) {
  attempt = attempt || 1;
  const main = document.getElementById("main");
  if (attempt === 1) {
    main.dataset.originalHtml = main.innerHTML;
    main.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem;text-align:center;color:var(--text);">' +
      '<div style="border:3px solid rgba(255,255,255,0.1);border-top:3px solid var(--green);border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin-bottom:1.5rem;"></div>' +
      '<h3 style="margin-bottom:0.5rem;">Verifying your account...</h3>' +
      '<p style="color:var(--muted);font-size:14px;">Checking for existing submissions.</p></div>';
  }

  const hasSubmitted = localStorage.getItem("has_submitted_r32");
  if (hasSubmitted === "true" && attempt === 1) {
    const savedPicks = localStorage.getItem("user_match_picks");
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

  const url = SHEET_URL + "?action=checkStatus&email=" + encodeURIComponent(email) + "&id_token=" + encodeURIComponent(token) + "&stage=r32";
  const controller = new AbortController();
  const timeoutId = setTimeout(function(){ controller.abort(); }, 15000);

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
          localStorage.setItem("has_group_history", result.has_group_history ? "true" : "false");
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
          localStorage.setItem("has_group_history", result.has_group_history ? "true" : "false");
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
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("test") === "true") {
    submitterName = "Test User";
    submitterRoll = "2024IPM001";
    submitterEmail = "test@iimidr.ac.in";
    idToken = "DEV_MODE_NO_TOKEN";
    document.getElementById("login-container").style.display = "none";
    document.getElementById("app-container").style.display = "block";
    updateUserBar();
    renderTree();
    return;
  }

  const savedEmail = localStorage.getItem("user_email");
  const savedToken = localStorage.getItem("user_id_token");
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
  const jwt = response.credential;
  const payload = JSON.parse(atob(jwt.split('.')[1]));
  const email = payload.email;
  const name = payload.name;
  const errEl = document.getElementById("login-error-msg");
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
    const savedRoll = localStorage.getItem("user_roll");
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
  const roll = document.getElementById("login-roll").value.trim();
  const errEl = document.getElementById("roll-error-msg");
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
  const name = document.getElementById("manual-name").value.trim();
  const roll = document.getElementById("manual-roll").value.trim();
  const email = document.getElementById("manual-email").value.trim();
  const errEl = document.getElementById("manual-error-msg");
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
  const name = submitterName.trim(), roll = submitterRoll.trim(), email = submitterEmail.trim();
  const errEl = document.getElementById("submit-error");
  if (!name || !roll || !email) { errEl.textContent = "Missing user profile information. Please log in again."; return; }
  errEl.textContent = "";
  const btn = document.getElementById("submit-btn");
  btn.textContent = "Submitting..."; btn.disabled = true;

  const params = new URLSearchParams();
  params.append("action", "submit"); params.append("stage", "r32");
  params.append("email", email.toLowerCase()); params.append("id_token", idToken);
  params.append("name", name); params.append("roll", roll);
  
  // Submit all 32 matches of the bracket (Matches 73 to 104)
  let totalPicks = 0;
  for (let matchId = 73; matchId <= 104; matchId++) {
    const pick = matchPicks["Match " + matchId] || "";
    if (pick) totalPicks++;
    params.append("Match " + matchId, pick);
  }
  params.append("total_picks", totalPicks);

  const url = SHEET_URL + "?" + params.toString();
  const controller = new AbortController();
  const timeoutId = setTimeout(function(){ controller.abort(); }, 15000);

  fetch(url, { signal: controller.signal, redirect: "follow" })
    .then(function(res){ return res.json(); })
    .then(function(result) {
      clearTimeout(timeoutId);
      if (result.status === "success") {
        localStorage.setItem("has_submitted_r32", "true");
        localStorage.setItem("user_email", email); localStorage.setItem("user_name", name);
        localStorage.setItem("user_roll", roll); localStorage.setItem("user_id_token", idToken);
        localStorage.setItem("user_match_picks", JSON.stringify(matchPicks));
        localStorage.setItem("has_group_history", result.has_group_history ? "true" : "false");
        showSuccess(name, roll);
      } else {
        errEl.textContent = result.error || "Submission failed. Please try again.";
        btn.textContent = "Submit Predictions 🚀"; btn.disabled = false;
      }
    })
    .catch(function(err) {
      clearTimeout(timeoutId);
      errEl.textContent = "Submission timed out. Please check your internet and try again.";
      btn.textContent = "Submit Predictions 🚀"; btn.disabled = false;
    });
}

function showSuccess(name, roll) {
  localStorage.setItem("has_submitted_r32", "true");
  localStorage.setItem("user_match_picks", JSON.stringify(matchPicks));
  const bar = document.getElementById("user-bar");
  if (bar) bar.style.display = "none";
  const submitBar = document.getElementById("submit-bar");
  if (submitBar) submitBar.style.display = "none";
  
  let historyBtn = "";
  if (localStorage.getItem("has_group_history") === "true") {
    historyBtn = '<a href="../index.html?history=true" class="btn" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;">View Group Stage Picks 📋</a>';
  }
  
  document.getElementById("main").innerHTML =
    '<div class="success">' +
      '<div class="success-ring"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>' +
      '<h2>Predictions Locked In!</h2>' +
      '<p style="margin-bottom:1.5rem;">Your complete knockout bracket predictions have been submitted successfully.</p>' +
      renderReadOnlySummary() +
      '<p style="margin-top:1rem;font-size:13px;color:rgba(240,244,248,0.35);">Results will be tracked as the tournament plays out.</p>' +
      '<div style="margin-top:2rem;display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">' +
        '<button class="btn" onclick="logout()">Logout / Switch User</button>' +
        historyBtn +
      '</div>' +
    '</div>';
  document.getElementById("progress-bar").style.width = "100%";
  document.getElementById("step-pct").textContent = "100%";
}

// ── INITIALIZATION ──
window.onload = initApp;
