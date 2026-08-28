const API_BASE_URL = "https://exploreease-smart-tourism-guide-1.onrender.com";
const IMG_FALLBACK = "assets/images/placeholder.svg";

let destinations = [];
let hotels = [];
let restaurants = [];
let coupons = [];
const destinationsGrid = document.getElementById("destinationsGrid");
const hotelsGrid = document.getElementById("hotelsGrid");
const restaurantsGrid = document.getElementById("restaurantsGrid");
const couponsGrid = document.getElementById("couponsGrid");
const detailsContainer = document.getElementById("detailsContainer");
const destinationSearch = document.getElementById("destinationSearch");
const heroSearch = document.getElementById("heroSearch");
const stateFilter = document.getElementById("stateFilter");
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
const themeToggle = document.getElementById("themeToggle");
const scrollTopBtn = document.getElementById("scrollTopBtn");
const toast = document.getElementById("toast");
const contactForm = document.getElementById("contactForm");
const newsletterBtn = document.getElementById("newsletterBtn");
const searchBtn = document.getElementById("searchBtn");
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}
function renderDestinations(data) {
  if (!data.length) {
    destinationsGrid.innerHTML = `
      <div class="details-placeholder">
        <i class="fa-solid fa-circle-exclamation"></i>
        <h3>No destinations found</h3>
        <p>Try another search term or state filter.</p>
      </div>
    `;
    return;
  }
  destinationsGrid.innerHTML = data
    .map(
      (item) => `
      <div class="destination-card">
        <img src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.onerror=null;this.src='${IMG_FALLBACK}';" />
        <div class="card-body">
          <h3>${item.name}</h3>
          <div class="card-meta">
            <span class="badge">${item.state}</span>
            <span class="rating"><i class="fa-solid fa-star"></i> ${item.rating}</span>
          </div>
          <p>${item.description}</p>
          <button class="btn btn-primary view-details-btn" data-id="${item.id}">
            View Details
          </button>
        </div>
      </div>
    `
    )
    .join("");
  document.querySelectorAll(".view-details-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const selectedId = Number(button.dataset.id);
      const destination = await fetchDestinationDetails(selectedId);
      if (!destination) return;
      renderDestinationDetails(destination);
      addRecentlyViewed(destination);
      renderWelcomeBanner();
      document
        .getElementById("destination-details")
        .scrollIntoView({ behavior: "smooth" });
      showToast(`${destination.name} details loaded`);
    });
  });
}
function renderDestinationDetails(destination) {
  detailsContainer.innerHTML = `
    <div class="details-layout">
      <div>
        <img src="${destination.image}" alt="${destination.name}" loading="lazy" onerror="this.onerror=null;this.src='${IMG_FALLBACK}';" />
      </div>
      <div class="details-content">
        <h3>${destination.name}</h3>
        <div class="card-meta">
          <span class="badge">${destination.state}</span>
          <span class="rating"><i class="fa-solid fa-star"></i> ${destination.rating}</span>
        </div>
        <p>${destination.description}</p>
        <div class="details-list">
          <div><strong>Best Time to Visit:</strong> ${destination.bestTime}</div>
          <div><strong>Entry Fee:</strong> ${destination.entryFee}</div>
          <div><strong>Timings:</strong> ${destination.timings}</div>
          <div><strong>Nearby Hotels:</strong> ${destination.hotels.join(", ")}</div>
          <div><strong>Nearby Restaurants:</strong> ${destination.restaurants.join(", ")}</div>
          <div><strong>Things to Do:</strong> ${destination.thingsToDo.join(", ")}</div>
        </div>
        <a href="${destination.map}" target="_blank" class="btn btn-secondary">
          <i class="fa-solid fa-location-dot"></i> Open in Google Maps
        </a>
      </div>
    </div>
  `;
}
function populateStateFilter() {
  const states = [...new Set(destinations.map((item) => item.state))].sort();
  states.forEach((state) => {
    const option = document.createElement("option");
    option.value = state;
    option.textContent = state;
    stateFilter.appendChild(option);
  });
}
function filterDestinations() {
  const query = destinationSearch.value.toLowerCase().trim();
  const state = stateFilter.value;
  const filtered = destinations.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(query) ||
      item.state.toLowerCase().includes(query);
    const matchesState = state === "all" || item.state === state;
    return matchesSearch && matchesState;
  });
  renderDestinations(filtered);
}
function renderHotels() {
  hotelsGrid.innerHTML = hotels
    .map(
      (hotel) => `
      <div class="hotel-card">
        <img src="${hotel.image}" alt="${hotel.name}" loading="lazy" onerror="this.onerror=null;this.src='${IMG_FALLBACK}';" />
        <div class="card-body">
          <h3>${hotel.name}</h3>
          <div class="card-meta">
            <span class="rating"><i class="fa-solid fa-star"></i> ${hotel.rating}</span>
            <span class="badge">${hotel.price}</span>
          </div>
          <div class="amenities">
            ${hotel.amenities.map((item) => `<span>${item}</span>`).join("")}
          </div>
          <button class="btn btn-primary hotel-book-btn">Book Now</button>
        </div>
      </div>
    `
    )
    .join("");
  document.querySelectorAll(".hotel-book-btn").forEach((button) => {
    button.addEventListener("click", () => {
      showToast("Booking feature is demo-only in this project");
    });
  });
}
function renderLoadingState() {
  destinationsGrid.innerHTML = `
    <div class="details-placeholder">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <h3>Loading destinations</h3>
      <p>Fetching the latest tourism data.</p>
    </div>
  `;
  hotelsGrid.innerHTML = "";
  restaurantsGrid.innerHTML = "";
  couponsGrid.innerHTML = `
    <div class="details-placeholder">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <h3>Loading offers</h3>
      <p>Finding the latest travel savings.</p>
    </div>
  `;
}

async function fetchJson(endpoint) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${endpoint}`);
  }
  return response.json();
}

async function fetchDestinationDetails(id) {
  try {
    return await fetchJson(`/sites/${id}`);
  } catch (error) {
    console.error(error);
    showToast("Unable to load destination details");
    return destinations.find((item) => item.id === id);
  }
}

async function loadData() {
  [destinations, hotels, restaurants] = await Promise.all([
    fetchJson("/sites"),
    fetchJson("/hotels"),
    fetchJson("/restaurants"),
  ]);
}

async function loadCoupons() {
  try {
    coupons = await fetchJson("/coupons");
  } catch (error) {
    console.error(error);
    coupons = [];
  }
  renderCoupons();
}

function renderRestaurants() {
  restaurantsGrid.innerHTML = restaurants
    .map(
      (restaurant) => `
      <div class="restaurant-card">
        <img src="${restaurant.image}" alt="${restaurant.name}" loading="lazy" onerror="this.onerror=null;this.src='${IMG_FALLBACK}';" />
        <div class="card-body">
          <h3>${restaurant.name}</h3>
          <div class="card-meta">
            <span class="badge">${restaurant.cuisine}</span>
            <span class="rating"><i class="fa-solid fa-star"></i> ${restaurant.rating}</span>
          </div>
          <a href="${restaurant.map}" target="_blank" class="btn btn-secondary">
            <i class="fa-solid fa-location-dot"></i> Google Maps
          </a>
        </div>
      </div>
    `
    )
    .join("");
}
function renderCoupons() {
  if (!coupons.length) {
    couponsGrid.innerHTML = `
      <div class="details-placeholder">
        <i class="fa-solid fa-ticket"></i>
        <h3>No offers available</h3>
        <p>Check back soon for new ExploreEase savings.</p>
      </div>
    `;
    return;
  }
  couponsGrid.innerHTML = coupons
    .map(
      (coupon) => `
      <article class="coupon-card">
        <div class="coupon-discount">${coupon.discount}</div>
        <div class="coupon-content">
          <div class="coupon-heading">
            <span class="coupon-category"><i class="fa-solid fa-${coupon.category === "hotel" ? "hotel" : coupon.category === "restaurant" ? "utensils" : "ticket"}"></i> ${coupon.category}</span>
            <span class="coupon-expiry">Valid until ${coupon.expiry}</span>
          </div>
          <h3>${coupon.title}</h3>
          <p>${coupon.description}</p>
          <div class="coupon-code-row">
            <code>${coupon.code}</code>
            <button class="btn btn-primary coupon-copy-btn" data-code="${coupon.code}" type="button">
              <i class="fa-regular fa-copy"></i> Copy Code
            </button>
          </div>
        </div>
      </article>
    `
    )
    .join("");
  document.querySelectorAll(".coupon-copy-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.code);
        showToast(`${button.dataset.code} copied`);
      } catch (error) {
        showToast(`Use code ${button.dataset.code}`);
      }
    });
  });
}
/* ==========================================================================
   USER LOGIN / SIGN UP (DEMO ONLY - localStorage)
   ==========================================================================
   This is a frontend-only demo authentication system. It exists so the
   "returning user" experience can be shown during a project demo without a
   real accounts database, payment for hosting, or a paid auth service.
   Passwords never leave the browser - they are stored (lightly obfuscated,
   NOT securely hashed) in localStorage purely for this demo login to work.
   This is NOT secure and must NEVER be used for a real product.

   TO CONNECT A REAL BACKEND LATER:
   Replace the body of Auth.signup()/Auth.login() with fetch() calls to
   FastAPI endpoints such as POST /auth/signup and POST /auth/login, store
   only the returned session token (never the password) in localStorage or
   an httpOnly cookie, and keep Auth.getCurrentUser()/logout()/isLoggedIn()
   working the same way so the rest of the UI doesn't need to change.
   ========================================================================== */
const USERS_KEY = "exploreease_users";
const SESSION_KEY = "exploreease_session";

const Auth = {
  getUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    } catch (error) {
      return [];
    }
  },
  saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },
  signup(name, email, password) {
    const users = this.getUsers();
    const normalizedEmail = email.trim().toLowerCase();
    if (users.some((user) => user.email === normalizedEmail)) {
      throw new Error("An account with this email already exists. Please login instead.");
    }
    const newUser = {
      name: name.trim(),
      email: normalizedEmail,
      // Demo-only obfuscation, NOT real security. See note above.
      password: btoa(password),
    };
    users.push(newUser);
    this.saveUsers(users);
    this.startSession(newUser);
    return newUser;
  },
  login(email, password) {
    const users = this.getUsers();
    const normalizedEmail = email.trim().toLowerCase();
    const user = users.find((item) => item.email === normalizedEmail);
    if (!user || user.password !== btoa(password)) {
      throw new Error("Incorrect email or password.");
    }
    this.startSession(user);
    return user;
  },
  startSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ name: user.name, email: user.email }));
  },
  logout() {
    localStorage.removeItem(SESSION_KEY);
  },
  getCurrentUser() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  },
  isLoggedIn() {
    return Boolean(this.getCurrentUser());
  },
};

// ---- Recently viewed destinations (per logged-in user, or a shared guest list) ----
function recentlyViewedKey() {
  const user = Auth.getCurrentUser();
  return user ? `exploreease_recent_${user.email}` : "exploreease_recent_guest";
}
function addRecentlyViewed(destination) {
  const key = recentlyViewedKey();
  let recent = [];
  try {
    recent = JSON.parse(localStorage.getItem(key) || "[]");
  } catch (error) {
    recent = [];
  }
  recent = recent.filter((id) => id !== destination.id);
  recent.unshift(destination.id);
  recent = recent.slice(0, 5);
  localStorage.setItem(key, JSON.stringify(recent));
}
function getRecentlyViewed() {
  const key = recentlyViewedKey();
  let ids = [];
  try {
    ids = JSON.parse(localStorage.getItem(key) || "[]");
  } catch (error) {
    ids = [];
  }
  return ids.map((id) => destinations.find((item) => item.id === id)).filter(Boolean);
}

// ---- Navbar auth area (Login/Sign Up buttons OR logged-in user chip) ----
const authArea = document.getElementById("authArea");
function renderAuthUI() {
  const user = Auth.getCurrentUser();
  if (user) {
    const firstName = user.name.split(" ")[0];
    authArea.innerHTML = `
      <div class="user-chip" title="${user.name}">
        <i class="fa-solid fa-circle-user"></i>
        <span>${firstName}</span>
      </div>
      <button class="btn btn-outline btn-sm" id="logoutBtn">Logout</button>
    `;
    document.getElementById("logoutBtn").addEventListener("click", () => {
      Auth.logout();
      showToast("Logged out successfully");
      renderAuthUI();
      renderWelcomeBanner();
    });
  } else {
    authArea.innerHTML = `
      <button class="btn btn-outline btn-sm" id="loginNavBtn">Login</button>
      <button class="btn btn-primary btn-sm" id="signupNavBtn">Sign Up</button>
    `;
    document.getElementById("loginNavBtn").addEventListener("click", () => openAuthModal("login"));
    document.getElementById("signupNavBtn").addEventListener("click", () => openAuthModal("signup"));
  }
}

// ---- Welcome back banner ----
function renderWelcomeBanner() {
  const banner = document.getElementById("welcomeBanner");
  const user = Auth.getCurrentUser();
  if (!user) {
    banner.classList.remove("show");
    banner.innerHTML = "";
    return;
  }
  const recent = getRecentlyViewed();
  banner.classList.add("show");
  banner.innerHTML = `
    <div class="welcome-banner-inner glass">
      <div class="welcome-text">
        <h3>Welcome back, ${user.name.split(" ")[0]}! 👋</h3>
        <p>${
          recent.length
            ? "Here's where you left off - jump back in:"
            : "Start exploring destinations below to build your travel history."
        }</p>
      </div>
      ${
        recent.length
          ? `<div class="welcome-recent">
              ${recent
                .map(
                  (item) => `
                <button class="recent-chip" data-id="${item.id}" title="View ${item.name} again">
                  <img src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.onerror=null;this.src='${IMG_FALLBACK}';" />
                  <span>${item.name}</span>
                </button>
              `
                )
                .join("")}
            </div>`
          : ""
      }
    </div>
  `;
  banner.querySelectorAll(".recent-chip").forEach((chip) => {
    chip.addEventListener("click", async () => {
      const id = Number(chip.dataset.id);
      const destination = await fetchDestinationDetails(id);
      if (!destination) return;
      renderDestinationDetails(destination);
      addRecentlyViewed(destination);
      renderWelcomeBanner();
      document.getElementById("destination-details").scrollIntoView({ behavior: "smooth" });
    });
  });
}

// ---- Auth modal (Login / Sign Up) ----
const authModalOverlay = document.getElementById("authModalOverlay");
const authModalClose = document.getElementById("authModalClose");
const loginTabBtn = document.getElementById("loginTabBtn");
const signupTabBtn = document.getElementById("signupTabBtn");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const loginError = document.getElementById("loginError");
const signupError = document.getElementById("signupError");

function openAuthModal(tab) {
  authModalOverlay.classList.add("show");
  switchAuthTab(tab || "login");
  loginError.textContent = "";
  signupError.textContent = "";
}
function closeAuthModal() {
  authModalOverlay.classList.remove("show");
  loginForm.reset();
  signupForm.reset();
  loginError.textContent = "";
  signupError.textContent = "";
}
function switchAuthTab(tab) {
  const isLogin = tab === "login";
  loginTabBtn.classList.toggle("active", isLogin);
  signupTabBtn.classList.toggle("active", !isLogin);
  loginForm.classList.toggle("hidden-form", !isLogin);
  signupForm.classList.toggle("hidden-form", isLogin);
}
authModalClose.addEventListener("click", closeAuthModal);
authModalOverlay.addEventListener("click", (event) => {
  if (event.target === authModalOverlay) closeAuthModal();
});
loginTabBtn.addEventListener("click", () => switchAuthTab("login"));
signupTabBtn.addEventListener("click", () => switchAuthTab("signup"));
document.querySelectorAll("[data-switch]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    switchAuthTab(link.dataset.switch);
  });
});
loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loginError.textContent = "";
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  if (!validateEmail(email) || !password) {
    loginError.textContent = "Enter a valid email and password.";
    return;
  }
  try {
    const user = Auth.login(email, password);
    closeAuthModal();
    renderAuthUI();
    renderWelcomeBanner();
    showToast(`Welcome back, ${user.name.split(" ")[0]}!`);
  } catch (error) {
    loginError.textContent = error.message;
  }
});
signupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  signupError.textContent = "";
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  if (name.length < 2) {
    signupError.textContent = "Please enter your name.";
    return;
  }
  if (!validateEmail(email)) {
    signupError.textContent = "Enter a valid email address.";
    return;
  }
  if (password.length < 6) {
    signupError.textContent = "Password must be at least 6 characters.";
    return;
  }
  try {
    const user = Auth.signup(name, email, password);
    closeAuthModal();
    renderAuthUI();
    renderWelcomeBanner();
    showToast(`Welcome to ExploreEase, ${user.name.split(" ")[0]}!`);
  } catch (error) {
    signupError.textContent = error.message;
  }
});

function handleHeroSearch() {
  const query = heroSearch.value.toLowerCase().trim();
  if (!query) {
    showToast("Enter a destination to search");
    return;
  }
  destinationSearch.value = query;
  stateFilter.value = "all";
  filterDestinations();
  document.getElementById("destinations").scrollIntoView({ behavior: "smooth" });
  showToast(`Showing results for "${heroSearch.value}"`);
}
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function clearErrors() {
  ["name", "email", "subject", "message"].forEach((field) => {
    document.getElementById(`${field}Error`).textContent = "";
  });
}
function validateForm() {
  clearErrors();
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const subject = document.getElementById("subject").value.trim();
  const message = document.getElementById("message").value.trim();
  let isValid = true;
  if (name.length < 3) {
    document.getElementById("nameError").textContent = "Name must be at least 3 characters.";
    isValid = false;
  }
  if (!validateEmail(email)) {
    document.getElementById("emailError").textContent = "Enter a valid email address.";
    isValid = false;
  }
  if (subject.length < 4) {
    document.getElementById("subjectError").textContent = "Subject must be at least 4 characters.";
    isValid = false;
  }
  if (message.length < 10) {
    document.getElementById("messageError").textContent = "Message must be at least 10 characters.";
    isValid = false;
  }
  return isValid;
}
function applyTheme(theme) {
  document.body.classList.toggle("dark-mode", theme === "dark");
  themeToggle.innerHTML =
    theme === "dark"
      ? '<i class="fa-solid fa-sun"></i>'
      : '<i class="fa-solid fa-moon"></i>';
  localStorage.setItem("theme", theme);
}
menuToggle.addEventListener("click", () => {
  navLinks.classList.toggle("active");
});
document.querySelectorAll(".nav-links a").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("active");
  });
});
themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.contains("dark-mode");
  applyTheme(isDark ? "light" : "dark");
  showToast(`Switched to ${isDark ? "light" : "dark"} mode`);
});
destinationSearch.addEventListener("input", filterDestinations);
stateFilter.addEventListener("change", filterDestinations);
searchBtn.addEventListener("click", handleHeroSearch);
heroSearch.addEventListener("keypress", (e) => {
  if (e.key === "Enter") handleHeroSearch();
});
window.addEventListener("scroll", () => {
  scrollTopBtn.style.display = window.scrollY > 300 ? "grid" : "none";
});
scrollTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});
contactForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (validateForm()) {
    contactForm.reset();
    showToast("Message sent successfully");
  } else {
    showToast("Please correct the form errors");
  }
});
newsletterBtn.addEventListener("click", () => {
  showToast("Newsletter subscription is demo-only");
});
window.addEventListener("load", () => {
  setTimeout(() => {
    document.getElementById("loader").classList.add("hidden");
  }, 1200);
});
async function init() {
  const savedTheme = localStorage.getItem("theme") || "light";
  applyTheme(savedTheme);
  renderAuthUI();
  renderLoadingState();
  const couponsPromise = loadCoupons();
  try {
    await loadData();
    populateStateFilter();
    renderDestinations(destinations);
    renderHotels();
    renderRestaurants();
    renderWelcomeBanner();
  } catch (error) {
    console.error(error);
    destinationsGrid.innerHTML = `
      <div class="details-placeholder">
        <i class="fa-solid fa-circle-exclamation"></i>
        <h3>Unable to load data</h3>
        <p>Start the FastAPI server on port 8000 and refresh this page.</p>
      </div>
    `;
    showToast("Unable to connect to ExploreEase API");
  }
  await couponsPromise;
}
init();
