/**
 * HarvestLink AI - Main Application Controller
 * Handles UI interactions, REST API integration via ApiService, full-stack state sync,
 * role switching, AI Advisor proxying, and responsive UI components.
 */

class HarvestLinkApp {
  constructor() {
    this.currentUser = null;
    this.currentTab = "dashboard";
    this.chart = null;

    this.farmerProfile = {
      name: "Ramesh Patel",
      location: "Nashik, Maharashtra",
      phone: "+91 98765 43210",
      email: "ramesh.patel@greenvalley.com",
      farmName: "Green Valley Farm",
      farmSize: "12 Acres",
      mainCrops: "Wheat, Tomatoes, Onion"
    };

    this.buyerProfile = {
      name: "Sourcing Officer",
      location: "Mumbai, Maharashtra",
      phone: "+91 98877 66554",
      email: "sourcing@bigbasket.in",
      companyName: "BigBasket Procurement",
      businessType: "Retail & Wholesale",
      preferredCrops: "Fruits, Vegetables, Grains"
    };

    this.profile = this.farmerProfile;
    this.currentRole = "Farmer";

    this.listings = [];
    this.myListings = [];
    this.enquiries = [];
    this.chatHistory = [
      { sender: "bot", text: "Welcome to HarvestLink AI! I am your agricultural advisor. How can I help you today with crops, pest control, weather preparation, or market insights?" }
    ];
    this.marketTrends = { months: [], crops: {} };
    this.deleteTargetListingId = null;

    // Global Error Handlers (Prevents white screens)
    window.onerror = (message, source, lineno, colno, error) => {
      console.error("[HarvestLink Global Error]", message, error);
      this.showToast(`Application error: ${message}`, "error");
      return true;
    };

    window.onunhandledrejection = (event) => {
      console.error("[HarvestLink Unhandled Promise]", event.reason);
      const msg = event.reason?.message || event.reason || "Unhandled async error";
      this.showToast(`Request failed: ${msg}`, "error");
    };

    // Initialize UI when DOM is loaded
    document.addEventListener("DOMContentLoaded", () => {
      this.initUI();
      this.setupAuthService();
    });
  }

  // --- API DATA FETCHING & STATE MANAGEMENT ---
  async loadInitialData() {
    try {
      // 1. Fetch Profile
      try {
        const profileRes = await window.ApiService.get("/profile");
        if (profileRes && profileRes.success && profileRes.data) {
          this.currentRole = profileRes.data.activeRole || "Farmer";
          if (profileRes.data.farmer) this.farmerProfile = { ...this.farmerProfile, ...profileRes.data.farmer };
          if (profileRes.data.buyer) this.buyerProfile = { ...this.buyerProfile, ...profileRes.data.buyer };
          this.profile = this.currentRole === "Farmer" ? this.farmerProfile : this.buyerProfile;
        }
      } catch (e) {
        console.warn("[App] Profile load info:", e.message);
      }

      // 2. Fetch All Listings (Marketplace)
      try {
        const listingsRes = await window.ApiService.get("/listings");
        if (listingsRes && listingsRes.success) {
          this.listings = listingsRes.data || [];
        }
      } catch (e) {
        console.warn("[App] Listings load info:", e.message);
      }

      // 3. Fetch My Listings if logged in
      if (this.currentUser) {
        try {
          const myListingsRes = await window.ApiService.get("/listings/mine");
          if (myListingsRes && myListingsRes.success) {
            this.myListings = myListingsRes.data || [];
          }
        } catch (e) {
          console.warn("[App] My listings load info:", e.message);
        }
      }

      // 4. Fetch Enquiries
      if (this.currentUser) {
        try {
          const enquiryEndpoint = this.currentRole === "Farmer" ? "/enquiries/received" : "/enquiries/sent";
          const enqRes = await window.ApiService.get(enquiryEndpoint);
          if (enqRes && enqRes.success) {
            this.enquiries = enqRes.data || [];
          }
        } catch (e) {
          console.warn("[App] Enquiries load info:", e.message);
        }
      }

      // 5. Fetch Market Trends
      try {
        const marketRes = await window.ApiService.get("/market/trends");
        if (marketRes && marketRes.success && marketRes.data) {
          this.marketTrends = marketRes.data;
        }
      } catch (e) {
        console.warn("[App] Market trends load info:", e.message);
      }

      this.syncAllDisplays();
    } catch (err) {
      console.error("[App Load Error]", err);
      this.showToast(`Notice: ${err.message}`, "info");
    }
  }

  syncAllDisplays() {
    this.updateUserDisplay();
    this.renderDashboard();
    
    if (this.currentTab === "listings") {
      this.renderMyListings();
    } else if (this.currentTab === "marketplace") {
      this.renderMarketplace();
    } else if (this.currentTab === "ai-advisor") {
      this.populateAdvisorSelect();
    }
  }

  setupAuthService() {
    const runDiagnosticsUI = () => {
      const list = document.getElementById("diagnostics-list");
      if (!list) return;
      list.innerHTML = "";

      const checks = [
        { key: "sdkLoaded", label: "Firebase SDK Loaded" },
        { key: "initialized", label: "Firebase Initialized" },
        { key: "authInitialized", label: "Authentication Initialized" },
        { key: "providerCreated", label: "Google Provider Created" },
        { key: "httpProtocol", label: "Running over HTTP/HTTPS" },
        { key: "popupSupported", label: "Browser Supports Popup" },
        { key: "authorizedDomain", label: "Authorized Domain" },
        { key: "internetConnection", label: "Internet Connection" }
      ];

      const diag = window.HarvestLinkAuth.diagnostics;
      checks.forEach(check => {
        const val = diag[check.key];
        const li = document.createElement("li");
        li.className = `diagnostics-item ${val ? 'success' : 'error'}`;
        li.innerHTML = `
          <span class="status-label">${check.label}</span>
          <span class="status-icon"></span>
        `;
        list.appendChild(li);
      });
    };

    const onStateChanged = (user, err) => {
      const btn = document.getElementById("btn-login-google");
      const textSpan = document.getElementById("google-btn-text");
      const warningBox = document.getElementById("login-warning-box");

      if (btn) {
        btn.disabled = !window.HarvestLinkAuth.diagnostics.internetConnection || !window.HarvestLinkAuth.diagnostics.httpProtocol;
        if (textSpan) textSpan.innerText = "Sign in with Google";
        const i = btn.querySelector("i");
        if (i) i.className = "fa-brands fa-google";
      }

      if (err) {
        console.error("Auth state error:", err);
        this.showToast(err, "error");
        if (warningBox) {
          warningBox.innerText = err;
          warningBox.style.display = "flex";
        }
      } else {
        if (warningBox && window.HarvestLinkAuth.diagnostics.httpProtocol && window.HarvestLinkAuth.diagnostics.internetConnection) {
          warningBox.style.display = "none";
        }
      }

      if (user) {
        this.currentUser = user;
        this.loadInitialData();
        this.hideLoginScreen();
      } else {
        this.currentUser = null;
        this.showLoginScreen();
      }

      runDiagnosticsUI();
    };

    const onNetworkChanged = (isOnline) => {
      const btn = document.getElementById("btn-login-google");
      const warningBox = document.getElementById("login-warning-box");

      if (btn) {
        btn.disabled = !isOnline || !window.HarvestLinkAuth.diagnostics.httpProtocol;
      }

      if (warningBox) {
        if (!isOnline) {
          warningBox.innerText = "Internet connection required for Google Authentication.";
          warningBox.style.display = "flex";
        } else if (!window.HarvestLinkAuth.diagnostics.httpProtocol) {
          warningBox.innerText = "Google Authentication requires a web server. Launch the application using Live Server (http://localhost:3000).";
          warningBox.style.display = "flex";
        } else {
          warningBox.style.display = "none";
        }
      }

      runDiagnosticsUI();
    };

    window.HarvestLinkAuth.init(onStateChanged, onNetworkChanged).then(() => {
      runDiagnosticsUI();
    });
  }

  toggleDiagnostics() {
    const consoleEl = document.getElementById("diagnostics-console");
    const bodyEl = document.getElementById("diagnostics-body");
    if (consoleEl && bodyEl) {
      const active = consoleEl.classList.toggle("active");
      bodyEl.style.display = active ? "block" : "none";
    }
  }

  showLoginScreen() {
    const loginLayout = document.getElementById("login-layout");
    const appLayout = document.getElementById("app-layout");
    const loginCard = document.getElementById("login-card");
    const roleCard = document.getElementById("role-selection-card");

    if (loginLayout) {
      loginLayout.style.opacity = "0";
      loginLayout.style.display = "flex";
      setTimeout(() => {
        loginLayout.style.transition = "opacity 0.4s ease";
        loginLayout.style.opacity = "1";
      }, 50);
    }
    if (appLayout) appLayout.style.display = "none";
    if (loginCard) loginCard.style.display = "block";
    if (roleCard) roleCard.style.display = "none";
  }

  hideLoginScreen() {
    const loginLayout = document.getElementById("login-layout");
    const appLayout = document.getElementById("app-layout");

    if (loginLayout) {
      loginLayout.style.transition = "opacity 0.4s ease";
      loginLayout.style.opacity = "0";
      setTimeout(() => {
        loginLayout.style.display = "none";
        if (appLayout) {
          appLayout.style.opacity = "0";
          appLayout.style.display = "flex";
          setTimeout(() => {
            appLayout.style.transition = "opacity 0.4s ease";
            appLayout.style.opacity = "1";
          }, 50);
        }
      }, 400);
    } else {
      if (appLayout) appLayout.style.display = "flex";
    }

    this.toggleRole(this.currentRole);
  }

  selectInitialRole(role) {
    this.toggleRole(role);
    this.hideLoginScreen();
  }

  loginWithGoogle() {
    if (!window.HarvestLinkAuth || !window.HarvestLinkAuth.auth) {
      this.loginWithDemo();
      return;
    }

    const btn = document.getElementById("btn-login-google");
    const textSpan = document.getElementById("google-btn-text");
    if (btn) {
      btn.disabled = true;
      if (textSpan) textSpan.innerText = "Signing in...";
      const i = btn.querySelector("i");
      if (i) i.className = "fa-solid fa-spinner spinner-icon";
    }

    window.HarvestLinkAuth.signInWithGoogle()
      .then((user) => {
        this.showToast("Signed in successfully with Google!", "success");
      })
      .catch((error) => {
        this.showToast(error.message, "error");
        if (btn) {
          btn.disabled = false;
          if (textSpan) textSpan.innerText = "Sign in with Google";
          const i = btn.querySelector("i");
          if (i) i.className = "fa-brands fa-google";
        }
      });
  }

  loginWithDemo() {
    this.currentUser = {
      uid: "demo-user-123",
      email: "demo.farmer@harvestlink.in",
      displayName: "Ramesh Patel",
      photoURL: ""
    };
    this.loadInitialData();
    this.hideLoginScreen();
    this.showToast("Logged in as Demo User.", "success");
  }

  logout() {
    if (confirm("Are you sure you want to sign out?")) {
      if (window.HarvestLinkAuth && window.HarvestLinkAuth.auth) {
        window.HarvestLinkAuth.signOut()
          .then(() => {
            this.showToast("Logged out successfully.", "info");
          })
          .catch((err) => {
            console.error("Sign out error:", err);
            this.showToast("Failed to log out cleanly.", "error");
          });
      } else {
        this.currentUser = null;
        this.showLoginScreen();
        this.showToast("Logged out from Demo Session.", "info");
      }
    }
  }

  showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    let icon = "fa-circle-info";
    if (type === "success") icon = "fa-circle-check";
    else if (type === "error") icon = "fa-circle-xmark";

    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 50);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // --- UI INITIALIZATION ---
  initUI() {
    this.syncApiStatus();
    this.updateUserDisplay();
    
    document.body.classList.remove("role-farmer", "role-buyer");
    document.body.classList.add(`role-${this.currentRole.toLowerCase()}`);
    
    this.switchTab(this.currentTab);
    this.populateChartSelect();

    // Dark Mode restore from localStorage (Harmless UI preference)
    const isDark = localStorage.getItem("harvestlink_darkmode") === "true";
    if (isDark) {
      document.body.classList.add("dark-mode");
      const icon = document.getElementById("theme-toggle-icon");
      if (icon) {
        icon.classList.remove("fa-moon");
        icon.classList.add("fa-sun");
      }
    }
  }

  updateUserDisplay() {
    const usernameEl = document.getElementById("sidebar-username");
    if (usernameEl) usernameEl.innerText = this.profile.name || "HarvestLink User";
    
    const roleEl = document.getElementById("sidebar-role");
    if (roleEl) roleEl.innerText = this.currentRole;
    
    const avatarEl = document.getElementById("sidebar-avatar");
    if (avatarEl) avatarEl.innerText = this.getInitials(this.profile.name || "HarvestLink");
    
    const sidebarCompany = document.getElementById("sidebar-company");
    if (sidebarCompany) {
      sidebarCompany.innerText = this.profile.farmName || this.profile.companyName || "";
    }

    const profileNameDisplay = document.getElementById("profile-display-name");
    if (profileNameDisplay) profileNameDisplay.innerText = this.profile.name || "User";
    
    const profileAvatarLarge = document.getElementById("profile-avatar-large");
    if (profileAvatarLarge) profileAvatarLarge.innerText = this.getInitials(this.profile.name || "User");
    
    // Fill forms
    const pName = document.getElementById("profile-name");
    if (pName) pName.value = this.profile.name || "";
    const pFarm = document.getElementById("profile-farm-name");
    if (pFarm) pFarm.value = this.profile.farmName || "";
    const pLoc = document.getElementById("profile-location");
    if (pLoc) pLoc.value = this.profile.location || "";
    const pSize = document.getElementById("profile-farm-size");
    if (pSize) pSize.value = this.profile.farmSize || "";
    const pPhone = document.getElementById("profile-phone");
    if (pPhone) pPhone.value = this.profile.phone || "";
    const pEmail = document.getElementById("profile-email");
    if (pEmail) pEmail.value = this.profile.email || "";
    const pCrops = document.getElementById("profile-crops");
    if (pCrops) pCrops.value = this.profile.mainCrops || this.profile.preferredCrops || "";
  }

  getInitials(name) {
    if (!name) return "HL";
    return name
      .split(" ")
      .map(n => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  syncApiStatus() {
    const pill = document.getElementById("api-status-pill");
    const text = document.getElementById("api-status-text");
    
    if (pill && text) {
      pill.className = "api-status-pill live";
      text.innerText = "Express + Gemini Backend";
      pill.title = "Connected to Node.js / Express REST API and Gemini Backend Proxy.";
    }
  }

  // --- ROUTING / TAB SWITCHER ---
  switchTab(tabId) {
    this.currentTab = tabId;

    document.querySelectorAll(".sidebar-nav li").forEach(li => {
      li.classList.remove("active");
    });
    
    const navItem = document.getElementById(`nav-${tabId}`);
    if (navItem) navItem.classList.add("active");

    document.querySelectorAll(".app-screen").forEach(screen => {
      screen.classList.remove("active");
    });

    const targetScreen = document.getElementById(`screen-${tabId}`);
    if (targetScreen) targetScreen.classList.add("active");

    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    if (sidebar) sidebar.classList.remove("mobile-open");
    if (overlay) overlay.classList.remove("mobile-open");

    const title = document.getElementById("screen-title");
    const subtitle = document.getElementById("screen-subtitle");
    
    switch(tabId) {
      case "dashboard":
        title.innerText = "Dashboard";
        if (this.currentRole === "Farmer") {
          subtitle.innerText = `Welcome back, ${this.farmerProfile.name || 'Farmer'}! Here is your farming summary.`;
        } else {
          subtitle.innerText = `Welcome back, ${this.buyerProfile.name || 'Buyer'}! Here is your purchasing summary.`;
        }
        this.renderDashboard();
        break;
      case "listings":
        title.innerText = "Crop Listings";
        subtitle.innerText = "Manage your crop inventory, publish new listings, and review incoming enquiries.";
        this.renderMyListings();
        break;
      case "marketplace":
        title.innerText = "Marketplace Hub";
        subtitle.innerText = "Browse available farm-fresh produce listed by other growers in real-time.";
        this.renderMarketplace();
        break;
      case "ai-advisor":
        title.innerText = "Gemini Agricultural Advisor";
        subtitle.innerText = "Generate smart crop pricing analysis and chat with our farming bot.";
        this.populateAdvisorSelect();
        this.renderChatMessages();
        break;
      case "profile":
        title.innerText = "Profile & Settings";
        subtitle.innerText = "Update your credentials and view details.";
        break;
    }
  }

  toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    sidebar.classList.toggle("mobile-open");
    overlay.classList.toggle("mobile-open");
  }

  // --- FARMER / BUYER ROLE SWITCHER ---
  async toggleRole(role) {
    this.currentRole = role;
    this.profile = role === "Farmer" ? this.farmerProfile : this.buyerProfile;
    
    document.body.classList.remove("role-farmer", "role-buyer");
    document.body.classList.add(`role-${role.toLowerCase()}`);

    const farmerBtn = document.getElementById("role-btn-farmer");
    const buyerBtn = document.getElementById("role-btn-buyer");
    
    if (role === "Farmer") {
      if (farmerBtn) farmerBtn.classList.add("active");
      if (buyerBtn) buyerBtn.classList.remove("active");
      const rEl = document.getElementById("sidebar-role");
      if (rEl) rEl.innerText = "Farmer";
    } else {
      if (buyerBtn) buyerBtn.classList.add("active");
      if (farmerBtn) farmerBtn.classList.remove("active");
      const rEl = document.getElementById("sidebar-role");
      if (rEl) rEl.innerText = "Buyer";
    }

    if (role === "Buyer" && this.currentTab === "listings") {
      this.currentTab = "marketplace";
    }

    // Save activeRole to backend profile endpoint
    try {
      await window.ApiService.put("/profile", { activeRole: role });
    } catch (e) {
      console.warn("[App] Sync role to backend warning:", e.message);
    }

    this.loadInitialData();
  }

  toggleDarkMode() {
    const isDark = document.body.classList.toggle("dark-mode");
    localStorage.setItem("harvestlink_darkmode", isDark);
    
    const icon = document.getElementById("theme-toggle-icon");
    if (icon) {
      if (isDark) {
        icon.classList.remove("fa-moon");
        icon.classList.add("fa-sun");
      } else {
        icon.classList.remove("fa-sun");
        icon.classList.add("fa-moon");
      }
    }

    this.updateDashboardChart();
  }

  // --- DASHBOARD SCREEN LOGIC ---
  async renderDashboard() {
    try {
      const dashRes = await window.ApiService.get("/dashboard");
      if (dashRes && dashRes.success) {
        const metrics = dashRes.metrics || {};
        if (this.currentRole === "Farmer") {
          const kpiActive = document.getElementById("kpi-active-listings");
          if (kpiActive) kpiActive.innerText = `${metrics.activeListingsCount || 0} Crops`;

          const kpiEnq = document.getElementById("kpi-enquiries");
          if (kpiEnq) kpiEnq.innerText = `${metrics.pendingEnquiriesCount || 0} Pending`;

          const kpiSales = document.getElementById("kpi-sales");
          if (kpiSales) kpiSales.innerText = `Rs. ${(metrics.salesValueEst || 0).toLocaleString("en-IN")}`;

          const kpiInv = document.getElementById("kpi-inventory");
          if (kpiInv) kpiInv.innerText = `${(metrics.activeInventory || 0).toLocaleString("en-IN")} kg`;
        } else {
          const kpiAvail = document.getElementById("kpi-buyer-available");
          if (kpiAvail) kpiAvail.innerText = `${metrics.availableCropsCount || 0} Crops`;

          const kpiEnq = document.getElementById("kpi-buyer-enquiries");
          if (kpiEnq) kpiEnq.innerText = `${metrics.pendingOffersCount || 0} Pending`;

          const kpiSpent = document.getElementById("kpi-buyer-spent");
          if (kpiSpent) kpiSpent.innerText = `Rs. ${(metrics.acceptedPurchaseValue || 0).toLocaleString("en-IN")}`;

          const kpiActive = document.getElementById("kpi-buyer-active-offers");
          if (kpiActive) kpiActive.innerText = `${(metrics.activePurchaseQuantity || 0).toLocaleString("en-IN")} kg`;
        }

        // Render Recent Activity Feed
        const alertsFeed = this.currentRole === "Farmer" 
          ? document.getElementById("dashboard-alerts")
          : document.getElementById("dashboard-buyer-alerts");
        
        if (alertsFeed) {
          alertsFeed.innerHTML = "";
          const activity = dashRes.recentActivity || [];
          if (activity.length === 0) {
            alertsFeed.innerHTML = `<li class="activity-item" style="padding:10px;"><span class="activity-text">No recent activity logged yet.</span></li>`;
          } else {
            activity.forEach(item => {
              const li = document.createElement("li");
              li.className = "activity-item";
              li.innerHTML = `
                <div class="activity-marker">
                  <div class="activity-dot accent"></div>
                  <div class="activity-line"></div>
                </div>
                <div class="activity-content">
                  <span class="activity-time">${item.date ? new Date(item.date).toLocaleDateString() : 'Recent'}</span>
                  <span class="activity-text">${item.text}</span>
                </div>
              `;
              alertsFeed.appendChild(li);
            });
          }
        }
      }
    } catch (e) {
      console.warn("[App] Dashboard load warning:", e.message);
    }

    // Render Table preview
    if (this.currentRole === "Farmer") {
      const tableBody = document.getElementById("dashboard-listings-table");
      if (tableBody) {
        tableBody.innerHTML = "";
        if (this.myListings.length === 0) {
          tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No crop listings created yet. Click "My Listings" tab to publish one!</td></tr>`;
        } else {
          this.myListings.slice(0, 5).forEach(c => {
            let statusBadge = "";
            if (c.status === "Available") statusBadge = `<span class="badge badge-success">Available</span>`;
            else if (c.status === "Reserved") statusBadge = `<span class="badge badge-warning">Reserved</span>`;
            else statusBadge = `<span class="badge badge-neutral">Sold</span>`;

            const row = document.createElement("tr");
            row.innerHTML = `
              <td><strong>${c.cropName}</strong><br><small style="color:var(--color-text-light);">${c.variety || 'Standard'}</small></td>
              <td>${c.category}</td>
              <td>${Number(c.quantity).toLocaleString("en-IN")} ${c.unit}</td>
              <td>Rs. ${c.price}/${c.unit}</td>
              <td>${c.harvestDate}</td>
              <td>${statusBadge}</td>
            `;
            tableBody.appendChild(row);
          });
        }
      }
    } else {
      const tableBody = document.getElementById("dashboard-buyer-enquiries-table");
      if (tableBody) {
        tableBody.innerHTML = "";
        if (this.enquiries.length === 0) {
          tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">You haven't sent any enquiries yet. Browse the "Marketplace" to make an offer!</td></tr>`;
        } else {
          this.enquiries.slice(0, 5).forEach(e => {
            let statusBadge = "";
            if (e.status === "Pending") statusBadge = `<span class="badge badge-warning">Pending</span>`;
            else if (e.status === "Accepted") statusBadge = `<span class="badge badge-success">Accepted</span>`;
            else if (e.status === "Countered") statusBadge = `<span class="badge badge-accent">Countered</span>`;
            else statusBadge = `<span class="badge badge-danger">Rejected</span>`;

            const row = document.createElement("tr");
            row.innerHTML = `
              <td><strong>${e.cropName}</strong></td>
              <td>${e.farmerName || 'Farmer'}</td>
              <td>${Number(e.quantity).toLocaleString("en-IN")}</td>
              <td>Rs. ${e.offeredPrice}</td>
              <td>${new Date(e.createdAt).toLocaleDateString()}</td>
              <td>${statusBadge}</td>
            `;
            tableBody.appendChild(row);
          });
        }
      }
    }

    this.updateDashboardChart();
  }

  populateChartSelect() {
    const select = document.getElementById("dashboard-chart-crop-select");
    if (!select) return;
    select.innerHTML = "";
    const crops = this.marketTrends.crops || { "Wheat": [24, 25, 26, 25, 27, 28] };
    Object.keys(crops).forEach(cropName => {
      const opt = document.createElement("option");
      opt.value = cropName;
      opt.innerText = cropName;
      select.appendChild(opt);
    });
  }

  updateDashboardChart() {
    const select = document.getElementById("dashboard-chart-crop-select");
    if (!select) return;
    const selectedCrop = select.value || "Wheat";
    const crops = this.marketTrends.crops || {};
    const prices = crops[selectedCrop] || [24, 25, 26, 25, 27, 28];
    const months = this.marketTrends.months || ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

    const ctx = document.getElementById("trendsChart");
    if (!ctx) return;

    if (this.chart) {
      this.chart.destroy();
    }

    const isDark = document.body.classList.contains("dark-mode");
    const textColor = isDark ? "#a5b5ad" : "#4a5750";
    const gridColor = isDark ? "#2a3530" : "#e2e8e4";

    this.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: months,
        datasets: [{
          label: `${selectedCrop} Price Index`,
          data: prices,
          borderColor: "#2d6a4f",
          backgroundColor: "rgba(45, 106, 79, 0.1)",
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          pointBackgroundColor: "#ff9f1c",
          pointBorderColor: "#ffffff",
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor }
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              callback: function(value) {
                return "Rs. " + value;
              }
            }
          }
        }
      }
    });
  }

  // --- MY LISTINGS LOGIC ---
  renderMyListings() {
    const grid = document.getElementById("my-listings-grid");
    if (!grid) return;
    grid.innerHTML = "";

    if (this.myListings.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: span 3;">
          <i class="fa-solid fa-seedling"></i>
          <h3>No Crop Listings Created</h3>
          <p>No crops listed yet — add your first crop using the "Add Crop Listing" button.</p>
        </div>
      `;
      this.renderReceivedEnquiries();
      return;
    }

    this.myListings.forEach(c => {
      let statusBadge = "";
      if (c.status === "Available") statusBadge = `<span class="badge badge-success crop-card-badge">Available</span>`;
      else if (c.status === "Reserved") statusBadge = `<span class="badge badge-warning crop-card-badge">Reserved</span>`;
      else statusBadge = `<span class="badge badge-neutral crop-card-badge">Sold</span>`;

      const card = document.createElement("div");
      card.className = "crop-card";
      
      let cropIcon = "fa-leaf";
      if (c.category === "Grains") cropIcon = "fa-wheat-awn";
      else if (c.category === "Vegetables") cropIcon = "fa-carrot";
      else if (c.category === "Fruits") cropIcon = "fa-apple-whole";

      card.innerHTML = `
        <div class="crop-card-image">
          <i class="fa-solid ${cropIcon}"></i>
          ${statusBadge}
        </div>
        <div class="crop-card-body">
          <h3 class="crop-card-title">${c.cropName}</h3>
          <div class="crop-card-meta">
            <span><i class="fa-solid fa-tags"></i> ${c.category}</span>
            <span>&bull;</span>
            <span>Variety: <strong>${c.variety || 'Standard'}</strong></span>
          </div>
          <p class="crop-card-desc">${c.description || ''}</p>
          <div class="crop-card-details">
            <div class="crop-card-detail-item"><i class="fa-solid fa-scale-balanced"></i>Qty: ${Number(c.quantity).toLocaleString("en-IN")} ${c.unit}</div>
            <div class="crop-card-detail-item"><i class="fa-solid fa-location-dot"></i>${c.location}</div>
            <div class="crop-card-detail-item"><i class="fa-solid fa-calendar-check"></i>Harv: ${c.harvestDate}</div>
            <div class="crop-card-detail-item"><i class="fa-solid fa-clock"></i>Pub: ${c.createdAt ? c.createdAt.split('T')[0] : ''}</div>
          </div>
          <div class="crop-card-price-row">
            <span class="price-label">Expected Price</span>
            <span class="price-value">Rs. ${c.price}/${c.unit}</span>
          </div>
        </div>
        <div class="crop-card-footer">
          <button class="btn btn-secondary btn-sm" onclick="app.openEditListingModal('${c.id}')" title="Edit Listing"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
          <button class="btn btn-secondary btn-sm" onclick="app.quickToggleStatus('${c.id}')" title="Change Status"><i class="fa-solid fa-rotate"></i> Status</button>
          <button class="btn btn-danger btn-sm btn-icon-only" onclick="app.openConfirmModal('${c.id}')" title="Delete Listing" style="margin-left: auto;"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      `;
      grid.appendChild(card);
    });

    this.renderReceivedEnquiries();
  }

  filterMyListings() {
    const query = document.getElementById("listings-search").value.toLowerCase();
    const category = document.getElementById("listings-category").value;
    const grid = document.getElementById("my-listings-grid");
    if (!grid) return;

    const filtered = this.myListings.filter(c => {
      const matchQuery = c.cropName.toLowerCase().includes(query) || 
                          (c.variety && c.variety.toLowerCase().includes(query)) || 
                          c.location.toLowerCase().includes(query);
      const matchCategory = category === "all" || c.category === category;
      return matchQuery && matchCategory;
    });

    grid.innerHTML = "";
    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: span 3;">
          <i class="fa-solid fa-magnifying-glass"></i>
          <h3>No Match Found</h3>
          <p>No crops matching "${query}" or category "${category}".</p>
        </div>
      `;
      return;
    }

    filtered.forEach(c => {
      let statusBadge = "";
      if (c.status === "Available") statusBadge = `<span class="badge badge-success crop-card-badge">Available</span>`;
      else if (c.status === "Reserved") statusBadge = `<span class="badge badge-warning crop-card-badge">Reserved</span>`;
      else statusBadge = `<span class="badge badge-neutral crop-card-badge">Sold</span>`;

      const card = document.createElement("div");
      card.className = "crop-card";
      let cropIcon = "fa-leaf";
      if (c.category === "Grains") cropIcon = "fa-wheat-awn";
      else if (c.category === "Vegetables") cropIcon = "fa-carrot";
      else if (c.category === "Fruits") cropIcon = "fa-apple-whole";

      card.innerHTML = `
        <div class="crop-card-image">
          <i class="fa-solid ${cropIcon}"></i>
          ${statusBadge}
        </div>
        <div class="crop-card-body">
          <h3 class="crop-card-title">${c.cropName}</h3>
          <div class="crop-card-meta">
            <span><i class="fa-solid fa-tags"></i> ${c.category}</span>
            <span>&bull;</span>
            <span>Variety: <strong>${c.variety || 'Standard'}</strong></span>
          </div>
          <p class="crop-card-desc">${c.description || ''}</p>
          <div class="crop-card-details">
            <div class="crop-card-detail-item"><i class="fa-solid fa-scale-balanced"></i>Qty: ${Number(c.quantity).toLocaleString("en-IN")} ${c.unit}</div>
            <div class="crop-card-detail-item"><i class="fa-solid fa-location-dot"></i>${c.location}</div>
            <div class="crop-card-detail-item"><i class="fa-solid fa-calendar-check"></i>Harv: ${c.harvestDate}</div>
            <div class="crop-card-detail-item"><i class="fa-solid fa-clock"></i>Pub: ${c.createdAt ? c.createdAt.split('T')[0] : ''}</div>
          </div>
          <div class="crop-card-price-row">
            <span class="price-label">Expected Price</span>
            <span class="price-value">Rs. ${c.price}/${c.unit}</span>
          </div>
        </div>
        <div class="crop-card-footer">
          <button class="btn btn-secondary btn-sm" onclick="app.openEditListingModal('${c.id}')"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
          <button class="btn btn-secondary btn-sm" onclick="app.quickToggleStatus('${c.id}')"><i class="fa-solid fa-rotate"></i> Status</button>
          <button class="btn btn-danger btn-sm btn-icon-only" onclick="app.openConfirmModal('${c.id}')" style="margin-left: auto;"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // --- ENQUIRIES HANDLER ---
  renderReceivedEnquiries() {
    const listContainer = document.getElementById("received-enquiries-list");
    if (!listContainer) return;
    listContainer.innerHTML = "";

    const countBadge = document.getElementById("received-enquiries-count");
    const pendingCount = this.enquiries.filter(e => e.status === "Pending").length;
    if (countBadge) {
      countBadge.innerText = `${pendingCount} Pending`;
    }

    if (this.enquiries.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state" style="padding: 20px;">
          <i class="fa-solid fa-comments"></i>
          <p style="font-size: 0.85rem;">No buyer enquiries yet.</p>
        </div>
      `;
      return;
    }

    this.enquiries.forEach(e => {
      let statusBadge = "";
      if (e.status === "Pending") statusBadge = `<span class="badge proposal-badge-pending">Pending</span>`;
      else if (e.status === "Accepted") statusBadge = `<span class="badge proposal-badge-accepted">Accepted</span>`;
      else if (e.status === "Countered") statusBadge = `<span class="badge proposal-badge-pending">Countered</span>`;
      else statusBadge = `<span class="badge proposal-badge-rejected">Rejected</span>`;

      const counterInfo = e.counterOffer && e.counterOffer.offeredPrice 
        ? `<div style="margin-top:8px; padding:6px 10px; background:#fff3cd; color:#856404; border-radius:4px; font-size:0.8rem;">
            <strong>Counter Offer Sent:</strong> Rs. ${e.counterOffer.offeredPrice}/kg | "${e.counterOffer.message || 'Counter offer submitted'}"
           </div>`
        : "";

      const enqCard = document.createElement("div");
      enqCard.className = "enquiry-proposal-card";
      enqCard.innerHTML = `
        <div class="enquiry-proposal-header">
          <div>
            <h4 class="enquiry-proposal-title"><i class="fa-solid fa-wheat-awn"></i> Crop Offer: ${e.cropName}</h4>
            <span class="enquiry-proposal-date">Submitted on: ${e.createdAt ? new Date(e.createdAt).toLocaleDateString() : 'Recent'}</span>
          </div>
          ${statusBadge}
        </div>
        
        <div class="proposal-grid">
          <div>
            <h5 class="proposal-sec-title"><i class="fa-solid fa-tractor"></i> Buyer Information</h5>
            <ul class="proposal-details-list">
              <li>Company: <strong>${e.buyerCompany || "Not Specified"}</strong></li>
              <li>Contact Person: <strong>${e.buyerName}</strong></li>
              <li>Phone: <strong>${e.buyerPhone || '+91 98877 66554'}</strong></li>
              <li>Email: <strong>${e.buyerEmail || 'buyer@company.com'}</strong></li>
            </ul>
          </div>
          
          <div>
            <h5 class="proposal-sec-title"><i class="fa-solid fa-handshake"></i> Offer Details</h5>
            <ul class="proposal-details-list">
              <li>Quantity Requested: <strong>${Number(e.quantity || e.quantityRequested || 0).toLocaleString()} kg</strong></li>
              <li>Offered Price: <strong>Rs. ${e.offeredPrice || e.priceOffered || 0}/kg</strong></li>
              <li>Payment Method: <strong>${e.paymentMethod || "Bank Transfer"}</strong></li>
            </ul>
          </div>
        </div>
        
        <div class="proposal-message-block">
          <h5 class="proposal-sec-title"><i class="fa-solid fa-money-bill-wave"></i> Message from Buyer</h5>
          <p class="proposal-message-box">"${e.message || 'No additional message provided.'}"</p>
          ${counterInfo}
        </div>
        
        <div class="proposal-actions-row">
          ${e.status === "Pending" ? `
            <button class="btn btn-proposal-accept btn-sm" onclick="app.updateEnquiryStatus('${e.id}', 'Accepted')"><i class="fa-solid fa-check"></i> Accept Offer</button>
            <button class="btn btn-proposal-reject btn-sm" onclick="app.updateEnquiryStatus('${e.id}', 'Rejected')"><i class="fa-solid fa-xmark"></i> Reject Offer</button>
            <button class="btn btn-proposal-counter btn-sm" onclick="app.openCounterModal('${e.id}')"><i class="fa-solid fa-coins"></i> Counter Offer</button>
          ` : ""}
          <button class="btn btn-secondary btn-sm" onclick="app.contactBuyer('${e.id}')"><i class="fa-solid fa-phone"></i> Contact Buyer</button>
        </div>
      `;
      listContainer.appendChild(enqCard);
    });
  }

  async updateEnquiryStatus(enqId, status) {
    try {
      const res = await window.ApiService.patch(`/enquiries/${enqId}/status`, { status });
      if (res && res.success) {
        this.showToast(`Enquiry ${status.toLowerCase()} successfully!`, "success");
        await this.loadInitialData();
      }
    } catch (err) {
      this.showToast(`Failed to update enquiry: ${err.message}`, "error");
    }
  }

  openCounterModal(enqId) {
    const enq = this.enquiries.find(e => e.id === enqId);
    if (!enq) return;

    document.getElementById("counter-enquiry-id").value = enq.id;
    document.getElementById("counter-enquiry-summary").innerText = `Buyer ${enq.buyerName} offered Rs. ${e.offeredPrice || e.priceOffered}/kg for ${e.cropName}.`;
    document.getElementById("counter-price").value = (e.offeredPrice || e.priceOffered || 0) + 2;
    document.getElementById("counter-message").value = "We can offer this rate for direct farm pickup.";

    const modal = document.getElementById("counter-modal");
    if (modal) modal.classList.add("active");
  }

  closeCounterModal() {
    const modal = document.getElementById("counter-modal");
    if (modal) modal.classList.remove("active");
  }

  async submitCounterOffer(event) {
    event.preventDefault();
    const enqId = document.getElementById("counter-enquiry-id").value;
    const price = Number(document.getElementById("counter-price").value);
    const message = document.getElementById("counter-message").value.trim();

    if (!price || price <= 0) {
      this.showToast("Please enter a valid counter offer price.", "error");
      return;
    }

    try {
      const res = await window.ApiService.patch(`/enquiries/${enqId}/counter`, { offeredPrice: price, message });
      if (res && res.success) {
        this.showToast(`Counter offer of Rs. ${price}/kg submitted!`, "success");
        this.closeCounterModal();
        await this.loadInitialData();
      }
    } catch (err) {
      this.showToast(`Counter offer failed: ${err.message}`, "error");
    }
  }

  contactBuyer(enqId) {
    const enq = this.enquiries.find(e => e.id === enqId);
    if (!enq) return;
    this.showToast(`Contact Details for ${enq.buyerName}:\nPhone: ${enq.buyerPhone || '+91 98877 66554'} | Email: ${enq.buyerEmail || 'buyer@company.com'}`, "info");
  }

  // --- MARKETPLACE SCREEN LOGIC ---
  renderMarketplace() {
    const grid = document.getElementById("marketplace-grid");
    if (!grid) return;
    grid.innerHTML = "";

    const userUid = this.currentUser ? this.currentUser.uid : "demo-user-123";
    const availableCrops = this.listings.filter(c => c.farmerId !== userUid && c.status !== "Sold");

    if (availableCrops.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: span 3;">
          <i class="fa-solid fa-store"></i>
          <h3>Marketplace Empty</h3>
          <p>Unable to load marketplace or no crops currently listed by other growers.</p>
        </div>
      `;
      return;
    }

    availableCrops.forEach(c => {
      let statusBadge = "";
      if (c.status === "Available") statusBadge = `<span class="badge badge-success crop-card-badge">Available</span>`;
      else statusBadge = `<span class="badge badge-warning crop-card-badge">Reserved</span>`;

      const card = document.createElement("div");
      card.className = "crop-card";
      
      let cropIcon = "fa-leaf";
      if (c.category === "Grains") cropIcon = "fa-wheat-awn";
      else if (c.category === "Vegetables") cropIcon = "fa-carrot";
      else if (c.category === "Fruits") cropIcon = "fa-apple-whole";

      card.innerHTML = `
        <div class="crop-card-image">
          <i class="fa-solid ${cropIcon}"></i>
          ${statusBadge}
        </div>
        <div class="crop-card-body">
          <h3 class="crop-card-title">${c.cropName}</h3>
          <div class="crop-card-meta">
            <span><i class="fa-solid fa-tags"></i> ${c.category}</span>
            <span>&bull;</span>
            <span>Farmer: <strong>${c.farmerName}</strong></span>
          </div>
          <p class="crop-card-desc">${c.description || ''}</p>
          <div class="crop-card-details">
            <div class="crop-card-detail-item"><i class="fa-solid fa-scale-balanced"></i>Qty: ${Number(c.quantity).toLocaleString("en-IN")} ${c.unit}</div>
            <div class="crop-card-detail-item"><i class="fa-solid fa-location-dot"></i>${c.location}</div>
            <div class="crop-card-detail-item"><i class="fa-solid fa-calendar-check"></i>Harv: ${c.harvestDate}</div>
            <div class="crop-card-detail-item"><i class="fa-solid fa-user-tag"></i>Var: ${c.variety || 'Standard'}</div>
          </div>
          <div class="crop-card-price-row">
            <span class="price-label">Expected Price</span>
            <span class="price-value">Rs. ${c.price}/${c.unit}</span>
          </div>
        </div>
        <div class="crop-card-footer">
          <button class="btn btn-primary btn-sm btn-block" onclick="app.openEnquiryModal('${c.id}')"><i class="fa-solid fa-paper-plane"></i> Send Enquiry / Quote</button>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  async filterMarketplace() {
    const query = document.getElementById("market-search").value.toLowerCase();
    const category = document.getElementById("market-category").value;
    const status = document.getElementById("market-status").value;
    const grid = document.getElementById("marketplace-grid");
    if (!grid) return;

    try {
      const res = await window.ApiService.get("/listings", {
        search: query,
        category: category !== 'all' ? category : undefined,
        status: status !== 'all' ? status : undefined
      });

      const userUid = this.currentUser ? this.currentUser.uid : "demo-user-123";
      const filtered = (res.data || []).filter(c => c.farmerId !== userUid && c.status !== "Sold");

      grid.innerHTML = "";
      if (filtered.length === 0) {
        grid.innerHTML = `
          <div class="empty-state" style="grid-column: span 3;">
            <i class="fa-solid fa-magnifying-glass"></i>
            <h3>No Produce Found</h3>
            <p>No produce matching your search or filters.</p>
          </div>
        `;
        return;
      }

      filtered.forEach(c => {
        let statusBadge = "";
        if (c.status === "Available") statusBadge = `<span class="badge badge-success crop-card-badge">Available</span>`;
        else statusBadge = `<span class="badge badge-warning crop-card-badge">Reserved</span>`;

        const card = document.createElement("div");
        card.className = "crop-card";
        let cropIcon = "fa-leaf";
        if (c.category === "Grains") cropIcon = "fa-wheat-awn";
        else if (c.category === "Vegetables") cropIcon = "fa-carrot";
        else if (c.category === "Fruits") cropIcon = "fa-apple-whole";

        card.innerHTML = `
          <div class="crop-card-image">
            <i class="fa-solid ${cropIcon}"></i>
            ${statusBadge}
          </div>
          <div class="crop-card-body">
            <h3 class="crop-card-title">${c.cropName}</h3>
            <div class="crop-card-meta">
              <span><i class="fa-solid fa-tags"></i> ${c.category}</span>
              <span>&bull;</span>
              <span>Farmer: <strong>${c.farmerName}</strong></span>
            </div>
            <p class="crop-card-desc">${c.description || ''}</p>
            <div class="crop-card-details">
              <div class="crop-card-detail-item"><i class="fa-solid fa-scale-balanced"></i>Qty: ${Number(c.quantity).toLocaleString("en-IN")} ${c.unit}</div>
              <div class="crop-card-detail-item"><i class="fa-solid fa-location-dot"></i>${c.location}</div>
              <div class="crop-card-detail-item"><i class="fa-solid fa-calendar-check"></i>Harv: ${c.harvestDate}</div>
              <div class="crop-card-detail-item"><i class="fa-solid fa-user-tag"></i>Var: ${c.variety || 'Standard'}</div>
            </div>
            <div class="crop-card-price-row">
              <span class="price-label">Expected Price</span>
              <span class="price-value">Rs. ${c.price}/${c.unit}</span>
            </div>
          </div>
          <div class="crop-card-footer">
            <button class="btn btn-primary btn-sm btn-block" onclick="app.openEnquiryModal('${c.id}')"><i class="fa-solid fa-paper-plane"></i> Send Enquiry / Quote</button>
          </div>
        `;
        grid.appendChild(card);
      });
    } catch (e) {
      this.showToast(`Search error: ${e.message}`, "error");
    }
  }

  // --- CRUD ACTION HANDLERS ---
  openAddListingModal() {
    document.getElementById("listing-modal-title").innerText = "Add Crop Listing";
    document.getElementById("listing-form").reset();
    document.getElementById("listing-id").value = "";
    document.getElementById("listing-harvest-date").value = new Date().toISOString().split('T')[0];
    document.getElementById("listing-location").value = this.farmerProfile.location || "Nashik, MH";
    
    const modal = document.getElementById("add-listing-modal");
    if (modal) modal.classList.add("active");
  }

  openEditListingModal(id) {
    const crop = this.myListings.find(c => c.id === id) || this.listings.find(c => c.id === id);
    if (!crop) return;

    document.getElementById("listing-modal-title").innerText = "Edit Crop Listing";
    document.getElementById("listing-id").value = crop.id;
    document.getElementById("listing-crop-name").value = crop.cropName;
    document.getElementById("listing-category").value = crop.category;
    document.getElementById("listing-variety").value = crop.variety || "";
    document.getElementById("listing-quantity").value = crop.quantity;
    document.getElementById("listing-unit").value = crop.unit;
    document.getElementById("listing-price").value = crop.price;
    document.getElementById("listing-harvest-date").value = crop.harvestDate;
    document.getElementById("listing-location").value = crop.location;
    document.getElementById("listing-description").value = crop.description || "";

    const modal = document.getElementById("add-listing-modal");
    if (modal) modal.classList.add("active");
  }

  closeAddListingModal() {
    const modal = document.getElementById("add-listing-modal");
    if (modal) modal.classList.remove("active");
  }

  async quickToggleStatus(id) {
    const crop = this.myListings.find(c => c.id === id);
    if (!crop) return;

    let nextStatus = "Available";
    if (crop.status === "Available") nextStatus = "Reserved";
    else if (crop.status === "Reserved") nextStatus = "Sold";
    else nextStatus = "Available";

    try {
      const res = await window.ApiService.patch(`/listings/${id}/status`, { status: nextStatus });
      if (res && res.success) {
        this.showToast(`Crop status updated to "${nextStatus}".`, "success");
        await this.loadInitialData();
      }
    } catch (err) {
      this.showToast(`Failed to update status: ${err.message}`, "error");
    }
  }

  async saveListing(event) {
    event.preventDefault();

    const id = document.getElementById("listing-id").value;
    const cropName = document.getElementById("listing-crop-name").value.trim();
    const category = document.getElementById("listing-category").value;
    const variety = document.getElementById("listing-variety").value.trim();
    const quantity = Number(document.getElementById("listing-quantity").value);
    const unit = document.getElementById("listing-unit").value;
    const price = Number(document.getElementById("listing-price").value);
    const harvestDate = document.getElementById("listing-harvest-date").value;
    const location = document.getElementById("listing-location").value.trim();
    const description = document.getElementById("listing-description").value.trim();

    // Frontend Form Validation
    if (!cropName) {
      this.showToast("Crop name is required", "error");
      return;
    }
    if (!quantity || quantity <= 0) {
      this.showToast("Quantity must be greater than 0", "error");
      return;
    }
    if (!price || price <= 0) {
      this.showToast("Price must be greater than 0", "error");
      return;
    }
    if (!location) {
      this.showToast("Location is required", "error");
      return;
    }

    const payload = {
      cropName, category, variety, quantity, unit, price, harvestDate, location, description
    };

    try {
      if (id) {
        const res = await window.ApiService.put(`/listings/${id}`, payload);
        if (res && res.success) {
          this.showToast(`Listing "${cropName}" updated successfully.`, "success");
        }
      } else {
        const res = await window.ApiService.post("/listings", payload);
        if (res && res.success) {
          this.showToast(`Listing "${cropName}" created successfully!`, "success");
        }
      }

      this.closeAddListingModal();
      await this.loadInitialData();
    } catch (err) {
      this.showToast(`Error saving listing: ${err.message}`, "error");
    }
  }

  openConfirmModal(id) {
    this.deleteTargetListingId = id;
    const modal = document.getElementById("confirm-modal");
    const actionBtn = document.getElementById("confirm-modal-action-btn");
    if (actionBtn) {
      actionBtn.onclick = () => this.confirmDeleteListing();
    }
    if (modal) modal.classList.add("active");
  }

  closeConfirmModal() {
    this.deleteTargetListingId = null;
    const modal = document.getElementById("confirm-modal");
    if (modal) modal.classList.remove("active");
  }

  async confirmDeleteListing() {
    if (!this.deleteTargetListingId) return;
    const id = this.deleteTargetListingId;

    try {
      const res = await window.ApiService.delete(`/listings/${id}`);
      if (res && res.success) {
        this.showToast("Crop listing deleted successfully.", "info");
        this.closeConfirmModal();
        await this.loadInitialData();
      }
    } catch (err) {
      this.showToast(`Failed to delete listing: ${err.message}`, "error");
    }
  }

  // --- BUYER ENQUIRY FORM LOGIC ---
  openEnquiryModal(listingId) {
    const crop = this.listings.find(c => c.id === listingId);
    if (!crop) return;

    document.getElementById("enquiry-listing-id").value = crop.id;
    document.getElementById("enquiry-crop-title").innerText = crop.cropName;
    document.getElementById("enquiry-crop-meta").innerText = `Seller: ${crop.farmerName} | Price: Rs. ${crop.price}/${crop.unit}`;
    
    document.getElementById("enquiry-quantity").value = crop.quantity;
    document.getElementById("enquiry-price").value = crop.price;
    document.getElementById("enquiry-message").value = `We are interested in purchasing ${crop.cropName}. Please let us know pickup availability.`;

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    document.getElementById("enquiry-delivery-date").value = nextWeek.toISOString().split('T')[0];
    document.getElementById("enquiry-payment-method").value = "Bank Transfer";

    if (this.currentRole === "Buyer") {
      document.getElementById("enquiry-buyer-name").value = this.buyerProfile.name || "Sourcing Officer";
      document.getElementById("enquiry-buyer-company").value = this.buyerProfile.companyName || "BigBasket Procurement";
      document.getElementById("enquiry-buyer-phone").value = this.buyerProfile.phone || "+91 98877 66554";
      document.getElementById("enquiry-buyer-email").value = this.buyerProfile.email || "sourcing@bigbasket.in";
    } else {
      document.getElementById("enquiry-buyer-name").value = "Sourcing Officer";
      document.getElementById("enquiry-buyer-company").value = "BigBasket Sourcing";
      document.getElementById("enquiry-buyer-phone").value = "+91 98877 66554";
      document.getElementById("enquiry-buyer-email").value = "sourcing@bigbasket.in";
    }

    const modal = document.getElementById("enquiry-modal");
    if (modal) modal.classList.add("active");
  }

  closeEnquiryModal() {
    const modal = document.getElementById("enquiry-modal");
    if (modal) modal.classList.remove("active");
  }

  async saveEnquiry(event) {
    event.preventDefault();
    const listingId = document.getElementById("enquiry-listing-id").value;
    const buyerName = document.getElementById("enquiry-buyer-name").value.trim();
    const buyerCompany = document.getElementById("enquiry-buyer-company").value.trim();
    const buyerPhone = document.getElementById("enquiry-buyer-phone").value.trim();
    const buyerEmail = document.getElementById("enquiry-buyer-email").value.trim();
    const quantity = Number(document.getElementById("enquiry-quantity").value);
    const offeredPrice = Number(document.getElementById("enquiry-price").value);
    const paymentMethod = document.getElementById("enquiry-payment-method").value;
    const message = document.getElementById("enquiry-message").value.trim();

    if (!quantity || quantity <= 0) {
      this.showToast("Quantity requested must be greater than 0", "error");
      return;
    }
    if (!offeredPrice || offeredPrice <= 0) {
      this.showToast("Offered price must be greater than 0", "error");
      return;
    }

    const payload = {
      listingId,
      quantity,
      offeredPrice,
      message,
      paymentMethod,
      buyerCompany,
      buyerPhone
    };

    try {
      const res = await window.ApiService.post("/enquiries", payload);
      if (res && res.success) {
        this.showToast("Enquiry sent successfully to the farmer!", "success");
        this.closeEnquiryModal();
        await this.loadInitialData();
      }
    } catch (err) {
      this.showToast(`Failed to send enquiry: ${err.message}`, "error");
    }
  }

  // --- PROFILE SAVE LOGIC ---
  async saveProfile(event) {
    event.preventDefault();
    const name = document.getElementById("profile-name").value.trim();
    const farmName = document.getElementById("profile-farm-name").value.trim();
    const location = document.getElementById("profile-location").value.trim();
    const farmSize = document.getElementById("profile-farm-size").value.trim();
    const phone = document.getElementById("profile-phone").value.trim();
    const email = document.getElementById("profile-email").value.trim();
    const crops = document.getElementById("profile-crops").value.trim();

    const payload = {
      activeRole: this.currentRole,
      farmer: { name, farmName, location, farmSize, phone, email, mainCrops: crops },
      buyer: { name, companyName: farmName, location, phone, email, preferredCrops: crops }
    };

    try {
      const res = await window.ApiService.put("/profile", payload);
      if (res && res.success) {
        this.showToast("Profile updated successfully in database!", "success");
        await this.loadInitialData();
      }
    } catch (err) {
      this.showToast(`Failed to save profile: ${err.message}`, "error");
    }
  }

  openApiKeyModal() {
    const modal = document.getElementById("api-modal");
    if (modal) modal.classList.add("active");
  }

  closeApiKeyModal() {
    const modal = document.getElementById("api-modal");
    if (modal) modal.classList.remove("active");
  }

  // --- AI INTEGRATION HANDLERS ---
  async generateListingDescription() {
    const name = document.getElementById("listing-crop-name").value.trim();
    const category = document.getElementById("listing-category").value;
    const variety = document.getElementById("listing-variety").value.trim();
    const quantity = document.getElementById("listing-quantity").value;
    const unit = document.getElementById("listing-unit").value;
    const price = document.getElementById("listing-price").value;
    const location = document.getElementById("listing-location").value.trim();
    const harvestDate = document.getElementById("listing-harvest-date").value;

    if (!name || !quantity || !price || !location) {
      this.showToast("Please fill in Crop Name, Quantity, Price, and Location first!", "error");
      return;
    }

    const descButton = document.getElementById("listing-ai-desc-btn");
    const descTextarea = document.getElementById("listing-description");
    const originalText = descButton.innerHTML;

    descButton.innerHTML = `<i class="fa-solid fa-spinner spinner-icon"></i> Generating...`;
    descButton.disabled = true;

    try {
      const generated = await window.GeminiService.generateCropDescription({
        cropName: name, category, variety, quantity, unit, price, location, harvestDate
      });
      descTextarea.value = generated;
      this.showToast("Crop description generated via Express Gemini backend!", "success");
    } catch (err) {
      this.showToast("Error generating description: " + err.message, "error");
    } finally {
      descButton.innerHTML = originalText;
      descButton.disabled = false;
    }
  }

  populateAdvisorSelect() {
    const select = document.getElementById("advisor-crop-select");
    if (!select) return;
    select.innerHTML = "";
    
    const isFarmer = this.currentRole === "Farmer";
    const crops = isFarmer ? this.myListings : this.listings;

    const btnFarmer = document.getElementById("advisor-generate-btn-farmer");
    const btnBuyer = document.getElementById("advisor-generate-btn-buyer");

    if (crops.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.innerText = isFarmer ? "No active listings. Create one first!" : "No marketplace listings available.";
      select.appendChild(opt);
      if (btnFarmer) btnFarmer.disabled = true;
      if (btnBuyer) btnBuyer.disabled = true;
      return;
    }

    if (btnFarmer) btnFarmer.disabled = false;
    if (btnBuyer) btnBuyer.disabled = false;

    crops.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.innerText = `${c.cropName} (${c.quantity} ${c.unit})${isFarmer ? '' : ' - ' + (c.farmerName || 'Farmer')}`;
      select.appendChild(opt);
    });
  }

  resetAdvisorInsight() {
    const emptyBox = document.getElementById("advisor-insights-empty");
    const resultBox = document.getElementById("advisor-insights-result");
    if (emptyBox) emptyBox.style.display = "flex";
    if (resultBox) resultBox.style.display = "none";
  }

  async generateAdvisorRecommendation() {
    const cropId = document.getElementById("advisor-crop-select").value;
    if (!cropId) return;

    const crop = this.myListings.find(c => c.id === cropId) || this.listings.find(c => c.id === cropId);
    if (!crop) return;

    const isFarmer = this.currentRole === "Farmer";
    const btn = isFarmer
      ? document.getElementById("advisor-generate-btn-farmer")
      : document.getElementById("advisor-generate-btn-buyer");

    if (!btn) return;
    const originalText = btn.innerHTML;
    
    btn.innerHTML = `<i class="fa-solid fa-spinner spinner-icon"></i> Analyzing...`;
    btn.disabled = true;
    
    const resultBox = document.getElementById("advisor-insights-result");
    const emptyBox = document.getElementById("advisor-insights-empty");
    
    if (emptyBox) emptyBox.style.display = "none";
    if (resultBox) {
      resultBox.style.display = "block";
      resultBox.innerHTML = `
        <div style="text-align:center; padding: 30px;">
          <i class="fa-solid fa-spinner spinner-icon" style="font-size: 2rem; color: var(--color-primary-medium); margin-bottom:12px;"></i>
          <p style="color:var(--color-text-medium);">${isFarmer ? 'AI is analyzing market trends & crop storage advisories...' : 'AI is assessing seller pricing, quality factors, and transport logistics...'}</p>
        </div>
      `;
    }

    try {
      const markdown = await window.GeminiService.getSellingSuggestions(crop, !isFarmer);
      if (resultBox) resultBox.innerHTML = this.parseBasicMarkdown(markdown);
      this.showToast("Gemini market recommendation loaded!", "success");
    } catch(err) {
      if (resultBox) resultBox.innerHTML = `<p style="color:var(--color-danger); padding:16px;">Failed to generate AI insights: ${err.message}</p>`;
      this.showToast(`AI Insight failed: ${err.message}`, "error");
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }

  renderChatMessages() {
    const container = document.getElementById("chat-messages-container");
    if (!container) return;
    container.innerHTML = "";

    this.chatHistory.forEach(msg => {
      const div = document.createElement("div");
      div.className = `chat-message ${msg.sender}`;
      div.innerHTML = this.parseBasicMarkdown(msg.text);
      container.appendChild(div);
    });

    container.scrollTop = container.scrollHeight;
  }

  async sendChatMessage() {
    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    if (!text) return;

    this.chatHistory.push({ sender: "user", text });
    this.renderChatMessages();
    input.value = "";

    const container = document.getElementById("chat-messages-container");
    const loader = document.createElement("div");
    loader.className = "chat-message bot";
    loader.id = "chat-typing-loader";
    loader.innerHTML = `<i class="fa-solid fa-spinner spinner-icon"></i> HarvestLink AI is thinking...`;
    if (container) {
      container.appendChild(loader);
      container.scrollTop = container.scrollHeight;
    }

    try {
      const reply = await window.GeminiService.askFarmingQuestion(text, this.chatHistory.slice(0, -1));
      
      const load = document.getElementById("chat-typing-loader");
      if (load) load.remove();
      
      this.chatHistory.push({ sender: "bot", text: reply });
      this.renderChatMessages();
    } catch(err) {
      const load = document.getElementById("chat-typing-loader");
      if (load) load.remove();
      
      this.chatHistory.push({ sender: "bot", text: `Error: Unable to reach Gemini backend. ${err.message}` });
      this.renderChatMessages();
    }
  }

  clearChatHistory() {
    this.chatHistory = [
      { sender: "bot", text: "Chat history cleared. How can I help you today with your farm crops, pest controls, or mandi market rates?" }
    ];
    this.renderChatMessages();
  }

  parseBasicMarkdown(md) {
    if (!md) return "";
    let html = md;
    
    html = html.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$2</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/^\s*[\*\-]\s+(.*)$/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/sim, '<ul>$1</ul>');
    html = html.replace(/\n\n/g, '<br><br>');

    return html;
  }
}

// Global Instantiate
window.app = new HarvestLinkApp();
