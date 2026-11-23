const $ = id => document.getElementById(id);
let authMode = "login";
let currentUser = null;

function setMessage(element, message, good = false) {
  element.textContent = message || "";
  element.style.color = good ? "var(--success)" : "";
}
async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}
function setAuthMode(mode) {
  authMode = mode;
  const registering = mode === "register";
  $("login-tab").classList.toggle("active", !registering);
  $("register-tab").classList.toggle("active", registering);
  $("login-tab").setAttribute("aria-selected", String(!registering));
  $("register-tab").setAttribute("aria-selected", String(registering));
  $("display-name-wrap").classList.toggle("hidden", !registering);
  $("password").autocomplete = registering ? "new-password" : "current-password";
  $("password-hint").textContent = registering
    ? "Use at least 12 characters. A longer passphrase is easier to remember."
    : "Use the password you chose when creating your account.";
  $("auth-submit").textContent = registering ? "Create account" : "Sign in";
  setMessage($("auth-message"), "");
}
function showApp(user) {
  currentUser = user;
  $("auth-view").classList.add("hidden");
  $("app-view").classList.remove("hidden");
  const displayName = user.displayName || user.username;
  $("profile-name").textContent = displayName;
  $("profile-handle").textContent = "@" + user.username;
  $("profile-avatar").textContent = displayName.slice(0, 1).toUpperCase();
  $("rail-avatar").textContent = displayName.slice(0, 1).toUpperCase();
  $("edit-display-name").value = displayName;
}
function showAuth() {
  currentUser = null;
  $("app-view").classList.add("hidden");
  $("auth-view").classList.remove("hidden");
}
function setTheme(theme) {
  const next = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("emnity-social-theme", next);
  $("theme-toggle").textContent = next === "dark" ? "☼" : "☾";
  $("theme-toggle").title = next === "dark" ? "Switch to light theme" : "Switch to dark theme";
}

$("login-tab").addEventListener("click", () => setAuthMode("login"));
$("register-tab").addEventListener("click", () => setAuthMode("register"));

$("auth-form").addEventListener("submit", async event => {
  event.preventDefault();
  const submit = $("auth-submit");
  submit.disabled = true;
  setMessage($("auth-message"), "");
  const payload = {
    username: $("username").value.trim(),
    password: $("password").value,
    displayName: $("display-name").value.trim()
  };
  try {
    const result = await api(authMode === "register" ? "/api/register" : "/api/login", {
      method: "POST", body: JSON.stringify(payload)
    });
    $("password").value = "";
    showApp(result.user);
  } catch (error) {
    setMessage($("auth-message"), error.message);
  } finally {
    submit.disabled = false;
  }
});

$("logout-button").addEventListener("click", async () => {
  try {
    await api("/api/logout", { method: "POST", body: "{}" });
    showAuth();
    $("auth-form").reset();
    setAuthMode("login");
  } catch (error) {
    alert(error.message);
  }
});

$("theme-toggle").addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});
$("profile-button").addEventListener("click", () => $("profile-dialog").showModal());

$("profile-form").addEventListener("submit", async event => {
  event.preventDefault();
  const button = $("profile-form").querySelector("button[type=submit]");
  button.disabled = true;
  setMessage($("profile-message"), "");
  try {
    const result = await api("/api/profile", {
      method: "PATCH", body: JSON.stringify({ displayName: $("edit-display-name").value })
    });
    showApp(result.user);
    $("profile-dialog").close();
  } catch (error) {
    setMessage($("profile-message"), error.message);
  } finally {
    button.disabled = false;
  }
});

async function boot() {
  setTheme(localStorage.getItem("emnity-social-theme") || "dark");
  try {
    const result = await api("/api/me");
    if (result.user) showApp(result.user);
    else showAuth();
  } catch {
    showAuth();
  }
}
boot();
