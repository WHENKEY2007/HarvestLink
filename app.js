class HarvestLinkApp {
  constructor() {
    this.currentUser = null;
    
    // Set fallback onGeminiFallback to handle live modes
    window.onGeminiFallback = (errMsg) => {
      window.GeminiService.setApiKey(""); // clear key to fall back to demo mode
      this.syncApiStatus();
      this.showToast(`Live AI unavailable. Switched to Demo Mode.`, "error");
    };

    this.initStorage();
    this.currentTab = "dashboard";
    this.chart = null;

    // Initialize UI on page load
    document.addEventListener("DOMContentLoaded", () => {
      this.initUI();
      this.setupAuthService();
    });
  }

  // --- LOCAL STORAGE STATE MANAGEMENT ---
  initStorage() {
    const seed = window.HarvestLinkMockData;
    
    // Profiles initialized dynamically inside initUserProfiles()
    this.farmerProfile = { ...seed.INITIAL_FARMER_PROFILE };
    this.buyerProfile = { ...seed.INITIAL_BUYER_PROFILE };
    this.profile = this.farmerProfile;
    this.currentRole = "Farmer";
    
    // Listings
    const storedListings = localStorage.getItem("harvestlink_listings");
    this.listings = storedListings ? JSON.parse(storedListings) : [ ...seed.INITIAL_LISTINGS ];
    
    // Enquiries
    const storedEnquiries = localStorage.getItem("harvestlink_enquiries");
    this.enquiries = storedEnquiries ? JSON.parse(storedEnquiries) : [ ...seed.INITIAL_ENQUIRIES ];

    // Chat History
    const storedChat = localStorage.getItem("harvestlink_chathistory");
    this.chatHistory = storedChat ? JSON.parse(storedChat) : [
      { sender: "bot", text: "Welcome to HarvestLink AI! I am your agricultural advisor. How can I help you today with crops, pest control, weather preparation, or market insights?" }
    ];

    // Market Trends pricing seed
    this.marketTrends = seed.MARKET_TRENDS_SEED;
  }

  saveToStorage() {
    if (this.currentUser) {
      const uid = this.currentUser.uid;
      localStorage.setItem(`harvestlink_farmer_profile_${uid}`, JSON.stringify(this.farmerProfile));
      localStorage.setItem(`harvestlink_buyer_profile_${uid}`, JSON.stringify(this.buyerProfile));
      localStorage.setItem(`harvestlink_active_role_${uid}`, this.currentRole);
      localStorage.setItem("harvestlink_current_user", JSON.stringify(this.currentUser));
    }
    localStorage.setItem("harvestlink_listings", JSON.stringify(this.listings));
    localStorage.setItem("harvestlink_enquiries", JSON.stringify(this.enquiries));
    localStorage.setItem("harvestlink_chathistory", JSON.stringify(this.chatHistory));
    
    // Automatically trigger immediate real-time dashboard / UI updates
    this.syncAllDisplays();
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
    // 1. Diagnostics Console Renderer
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

    // 2. State Change Handler
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
        localStorage.setItem("harvestlink_current_user", JSON.stringify(this.currentUser));
        this.initUserProfiles();
        this.hideLoginScreen();
      } else {
        this.currentUser = null;
        localStorage.removeItem("harvestlink_current_user");
        this.showLoginScreen();
      }

      runDiagnosticsUI();
    };

    // 3. Connection Status Listener
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
          warningBox.innerText = "Google Authentication requires a web server. Launch the application using Live Server (http://localhost) or deploy it over HTTPS.";
          warningBox.style.display = "flex";
        } else if (!window.HarvestLinkAuth.diagnostics.initialized) {
          warningBox.innerText = "Google Authentication is using demo configuration. Please replace the placeholder credentials in auth.js with your real Firebase config.";
          warningBox.style.display = "flex";
        } else {
          warningBox.style.display = "none";
        }
      }

      runDiagnosticsUI();
    };

    // Run Service Init
    window.HarvestLinkAuth.init(onStateChanged, onNetworkChanged).then(() => {
      runDiagnosticsUI();
      
      const warningBox = document.getElementById("login-warning-box");
      const btn = document.getElementById("btn-login-google");

      if (!window.HarvestLinkAuth.diagnostics.httpProtocol) {
        if (warningBox) {
          warningBox.innerText = "Google Authentication requires a web server. Launch the application using Live Server (http://localhost) or deploy it over HTTPS.";
          warningBox.style.display = "flex";
        }
        if (btn) btn.disabled = true;
      } else if (!window.HarvestLinkAuth.diagnostics.internetConnection) {
        if (warningBox) {
          warningBox.innerText = "Internet connection required for Google Authentication.";
          warningBox.style.display = "flex";
        }
        if (btn) btn.disabled = true;
      } else if (!window.HarvestLinkAuth.diagnostics.initialized) {
        if (warningBox) {
          warningBox.innerText = "Google Authentication is using demo configuration. Please replace the placeholder credentials in auth.js with your real Firebase config.";
          warningBox.style.display = "flex";
        }
      }
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

  initUserProfiles() {
    if (!this.currentUser) return;
    const seed = window.HarvestLinkMockData;
    const uid = this.currentUser.uid;
    
    const storedFarmer = localStorage.getItem(`harvestlink_farmer_profile_${uid}`);
    this.farmerProfile = storedFarmer ? JSON.parse(storedFarmer) : { 
      ...seed.INITIAL_FARMER_PROFILE, 
      name: this.currentUser.displayName, 
      email: this.currentUser.email 
    };
    
    const storedBuyer = localStorage.getItem(`harvestlink_buyer_profile_${uid}`);
    this.buyerProfile = storedBuyer ? JSON.parse(storedBuyer) : { 
      ...seed.INITIAL_BUYER_PROFILE, 
      name: this.currentUser.displayName, 
      email: this.currentUser.email 
    };
    
    this.currentRole = localStorage.getItem(`harvestlink_active_role_${uid}`) || "Farmer";
    this.profile = this.currentRole === "Farmer" ? this.farmerProfile : this.buyerProfile;
    
    this.syncAllDisplays();
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
    const uid = this.currentUser.uid;
    const activeRole = localStorage.getItem(`harvestlink_active_role_${uid}`);
    
    const loginLayout = document.getElementById("login-layout");
    const appLayout = document.getElementById("app-layout");
    const loginCard = document.getElementById("login-card");
    const roleCard = document.getElementById("role-selection-card");

    if (!activeRole) {
      if (loginCard) loginCard.style.display = "none";
      if (roleCard) {
        roleCard.style.opacity = "0";
        roleCard.style.display = "block";
        setTimeout(() => {
          roleCard.style.transition = "opacity 0.4s ease";
          roleCard.style.opacity = "1";
        }, 50);
      }
    } else {
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
      this.toggleRole(activeRole);
    }
  }

  selectInitialRole(role) {
    const uid = this.currentUser.uid;
    localStorage.setItem(`harvestlink_active_role_${uid}`, role);
    this.hideLoginScreen();
  }

  loginWithGoogle() {
    if (!window.HarvestLinkAuth || !window.HarvestLinkAuth.auth) {
      if (window.HarvestLinkAuth && !window.HarvestLinkAuth.diagnostics.httpProtocol) {
        this.showToast("Google Authentication requires a web server. Launching Demo Mode instead.", "info");
      } else {
        this.showToast("Google Authentication credentials are not configured. Launching Demo Mode instead.", "info");
      }
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
    localStorage.setItem("harvestlink_current_user", JSON.stringify(this.currentUser));
    this.initUserProfiles();
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
        localStorage.removeItem("harvestlink_current_user");
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

    // Trigger reflow
    setTimeout(() => toast.classList.add("show"), 50);

    // Remove toast
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // --- UI INITIALIZATION ---
  initUI() {
    // Sync API key status
    this.syncApiStatus();
    
    // Render user details
    this.updateUserDisplay();
    
    // Set initial role class on body
    document.body.classList.remove("role-farmer", "role-buyer");
    document.body.classList.add(`role-${this.currentRole.toLowerCase()}`);
    
    // Setup initial screen view
    this.switchTab(this.currentTab);
    
    // Initialize chart select list
    this.populateChartSelect();
    
    // Render initial charts
    this.updateDashboardChart();

    // Dark Mode restore
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
    // Set text displays
    document.getElementById("sidebar-username").innerText = this.profile.name;
    document.getElementById("sidebar-role").innerText = this.currentRole;
    document.getElementById("sidebar-avatar").innerText = this.getInitials(this.profile.name);
    
    const sidebarCompany = document.getElementById("sidebar-company");
    if (sidebarCompany) {
      sidebarCompany.innerText = this.profile.farmName || "";
    }

    document.getElementById("profile-display-name").innerText = this.profile.name;
    document.getElementById("profile-avatar-large").innerText = this.getInitials(this.profile.name);
    
    // Fill forms
    document.getElementById("profile-name").value = this.profile.name;
    document.getElementById("profile-farm-name").value = this.profile.farmName;
    document.getElementById("profile-location").value = this.profile.location;
    document.getElementById("profile-farm-size").value = this.profile.farmSize;
    document.getElementById("profile-phone").value = this.profile.phone;
    document.getElementById("profile-email").value = this.profile.email;
    document.getElementById("profile-crops").value = this.profile.mainCrops;

    // Fill settings API Key field
    document.getElementById("settings-api-key").value = window.GeminiService.getApiKey();
    document.getElementById("modal-api-key").value = window.GeminiService.getApiKey();
  }

  getInitials(name) {
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
    
    if (window.GeminiService.isLive()) {
      pill.className = "api-status-pill live";
      text.innerText = "Gemini Live";
      pill.title = "Gemini Live API Mode active. Click to edit.";
    } else {
      pill.className = "api-status-pill demo";
      text.innerText = "Demo Mode";
      pill.title = "Operating in simulated Demo Mode. Click to paste your Gemini API Key.";
    }
  }

  // --- ROUTING / TAB SWITCHER ---
  switchTab(tabId) {
    this.currentTab = tabId;

    // Remove active state from all nav buttons
    document.querySelectorAll(".sidebar-nav li").forEach(li => {
      li.classList.remove("active");
    });
    
    // Add active state to current menu item
    const navItem = document.getElementById(`nav-${tabId}`);
    if (navItem) navItem.classList.add("active");

    // Hide all screens
    document.querySelectorAll(".app-screen").forEach(screen => {
      screen.classList.remove("active");
    });

    // Show selected screen
    const targetScreen = document.getElementById(`screen-${tabId}`);
    if (targetScreen) targetScreen.classList.add("active");

    // Close mobile menu if open
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    if (sidebar) sidebar.classList.remove("mobile-open");
    if (overlay) overlay.classList.remove("mobile-open");

    // Update screen titles & headings
    const title = document.getElementById("screen-title");
    const subtitle = document.getElementById("screen-subtitle");
    
    switch(tabId) {
      case "dashboard":
        title.innerText = "Dashboard";
        if (this.currentRole === "Farmer") {
          subtitle.innerText = `Welcome back, ${this.farmerProfile.name}! Here is your farming summary.`;
        } else {
          subtitle.innerText = `Welcome back, ${this.buyerProfile.name}! Here is your purchasing summary.`;
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
        subtitle.innerText = "Update your credentials, view details, and manage your API Key.";
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
  toggleRole(role) {
    this.currentRole = role;
    localStorage.setItem("harvestlink_active_role", role);
    this.profile = role === "Farmer" ? this.farmerProfile : this.buyerProfile;
    this.profile.role = role;
    this.saveToStorage();

    // Sync body role class
    document.body.classList.remove("role-farmer", "role-buyer");
    document.body.classList.add(`role-${role.toLowerCase()}`);

    // Toggle button active classes
    const farmerBtn = document.getElementById("role-btn-farmer");
    const buyerBtn = document.getElementById("role-btn-buyer");
    
    if (role === "Farmer") {
      farmerBtn.classList.add("active");
      buyerBtn.classList.remove("active");
      document.getElementById("sidebar-role").innerText = "Farmer";
    } else {
      buyerBtn.classList.add("active");
      farmerBtn.classList.remove("active");
      document.getElementById("sidebar-role").innerText = "Buyer";
    }

    // Redirect if buyer lands on a hidden tab (My Listings)
    if (role === "Buyer" && this.currentTab === "listings") {
      this.currentTab = "marketplace";
    }

    // Refresh display
    this.updateUserDisplay();
    this.switchTab(this.currentTab);
  }

  // --- DARK MODE TOGGLE ---
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

    // Re-render chart to update grid line styling for dark mode
    this.updateDashboardChart();
  }

  // --- DASHBOARD SCREEN LOGIC ---
  renderDashboard() {
    const userUid = this.currentUser ? this.currentUser.uid : "demo-user-123";
    if (this.currentRole === "Farmer") {
      // 1. Compute KPIs
      // Active Farmer Listings
      const farmerListings = this.listings.filter(c => c.farmerId === userUid);
      const activeListingsCount = farmerListings.filter(c => c.status === "Available" || c.status === "Reserved").length;
      document.getElementById("kpi-active-listings").innerText = `${activeListingsCount} Crops`;

      // Received Enquiries
      const pendingEnquiries = this.enquiries.filter(e => e.farmerId === userUid && e.status === "Pending").length;
      document.getElementById("kpi-enquiries").innerText = `${pendingEnquiries} Pending`;

      // Sales Revenue (Sold crops)
      let totalSales = 0;
      farmerListings.forEach(c => {
        if (c.status === "Sold") {
          totalSales += (c.price * c.quantity);
        }
      });
      document.getElementById("kpi-sales").innerText = `Rs. ${totalSales.toLocaleString("en-IN")}`;

      // Total Inventory Quantity (Available + Reserved)
      let totalQty = 0;
      let mainUnit = "kg";
      farmerListings.forEach(c => {
        if (c.status !== "Sold") {
          totalQty += Number(c.quantity);
          mainUnit = c.unit; // grab unit
        }
      });
      document.getElementById("kpi-inventory").innerText = `${totalQty.toLocaleString("en-IN")} ${farmerListings.length > 0 ? mainUnit : 'kg'}`;

      // 2. Render Recent Listings Table
      const tableBody = document.getElementById("dashboard-listings-table");
      tableBody.innerHTML = "";

      if (farmerListings.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No crop listings created yet. Click "My Listings" tab to publish one!</td></tr>`;
      } else {
        const recent = [...farmerListings].reverse().slice(0, 5);
        recent.forEach(c => {
          let statusBadge = "";
          if (c.status === "Available") statusBadge = `<span class="badge badge-success">Available</span>`;
          else if (c.status === "Reserved") statusBadge = `<span class="badge badge-warning">Reserved</span>`;
          else statusBadge = `<span class="badge badge-neutral">Sold</span>`;

          const row = document.createElement("tr");
          row.innerHTML = `
            <td><strong>${c.cropName}</strong><br><small style="color:var(--color-text-light);">${c.variety || 'Standard'}</small></td>
            <td>${c.category}</td>
            <td>${c.quantity.toLocaleString("en-IN")} ${c.unit}</td>
            <td>Rs. ${c.price}/${c.unit}</td>
            <td>${c.harvestDate}</td>
            <td>${statusBadge}</td>
          `;
          tableBody.appendChild(row);
        });
      }

      // 3. Render Alerts list
      const alertsFeed = document.getElementById("dashboard-alerts");
      alertsFeed.innerHTML = "";
      
      const alertItems = [];
      const relevantEnqs = this.enquiries.filter(e => e.farmerId === userUid);
      relevantEnqs.slice(-3).forEach(e => {
        if (e.status === "Pending") {
          alertItems.push({ type: "accent", text: `${e.cropName} offer received from ${e.buyerName} (${e.buyerCompany}).`, time: "Recent" });
        } else if (e.status === "Accepted") {
          alertItems.push({ type: "success", text: `You accepted ${e.buyerName}'s offer for ${e.cropName}.`, time: "Recent" });
        } else {
          alertItems.push({ type: "info", text: `You rejected offer on ${e.cropName}.`, time: "Recent" });
        }
      });

      if (alertItems.length === 0) {
        alertItems.push({ type: "info", text: "No received enquiries yet.", time: "Now" });
      }

      alertItems.forEach(item => {
        const li = document.createElement("li");
        li.className = "activity-item";
        li.innerHTML = `
          <div class="activity-marker">
            <div class="activity-dot ${item.type}"></div>
            <div class="activity-line"></div>
          </div>
          <div class="activity-content">
            <span class="activity-time">${item.time}</span>
            <span class="activity-text">${item.text}</span>
          </div>
        `;
        alertsFeed.appendChild(li);
      });
    } else {
      // BUYER DASHBOARD LOGIC
      // 1. Compute KPIs
      // Available Crops (crops from other farmers that are available/reserved)
      const availableCrops = this.listings.filter(c => c.farmerId !== userUid && c.status !== "Sold");
      document.getElementById("kpi-buyer-available").innerText = `${availableCrops.length} Crops`;

      // Sent Enquiries (enquiries sent by this buyer)
      const myEnquiries = this.enquiries.filter(e => e.buyerId === userUid);
      const pendingSent = myEnquiries.filter(e => e.status === "Pending").length;
      document.getElementById("kpi-buyer-enquiries").innerText = `${pendingSent} Pending`;

      // Purchasing Value (Sum of accepted quote prices * qty)
      let totalSpent = 0;
      myEnquiries.forEach(e => {
        if (e.status === "Accepted") {
          totalSpent += (e.priceOffered * e.quantityRequested);
        }
      });
      document.getElementById("kpi-buyer-spent").innerText = `Rs. ${totalSpent.toLocaleString("en-IN")}`;

      // Active Offers Quantity
      let activeQty = 0;
      myEnquiries.forEach(e => {
        if (e.status === "Pending") {
          activeQty += Number(e.quantityRequested);
        }
      });
      document.getElementById("kpi-buyer-active-offers").innerText = `${activeQty.toLocaleString("en-IN")} kg`;

      // 2. Render Sent Enquiries Table
      const tableBody = document.getElementById("dashboard-buyer-enquiries-table");
      tableBody.innerHTML = "";

      if (myEnquiries.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">You haven't sent any enquiries yet. Browse the "Marketplace" to make an offer!</td></tr>`;
      } else {
        const recent = [...myEnquiries].reverse().slice(0, 5);
        recent.forEach(e => {
          let statusBadge = "";
          if (e.status === "Pending") statusBadge = `<span class="badge badge-warning">Pending</span>`;
          else if (e.status === "Accepted") statusBadge = `<span class="badge badge-success">Accepted</span>`;
          else if (e.status === "Counter Offered") statusBadge = `<span class="badge badge-accent">Counter Offered</span>`;
          else statusBadge = `<span class="badge badge-danger">Rejected</span>`;

          const row = document.createElement("tr");
          row.innerHTML = `
            <td><strong>${e.cropName}</strong></td>
            <td>${e.farmerName}</td>
            <td>${e.quantityRequested.toLocaleString("en-IN")}</td>
            <td>Rs. ${e.priceOffered}</td>
            <td>${new Date(e.createdAt).toLocaleDateString()}</td>
            <td>${statusBadge}</td>
          `;
          tableBody.appendChild(row);
        });
      }

      // 3. Render Marketplace Updates Feed
      const alertsFeed = document.getElementById("dashboard-buyer-alerts");
      alertsFeed.innerHTML = "";

      const alertItems = [];
      myEnquiries.forEach(e => {
        if (e.status === "Accepted") {
          alertItems.push({ type: "success", text: `Your quote for ${e.cropName} was accepted by the seller!`, time: "Recent" });
        } else if (e.status === "Rejected") {
          alertItems.push({ type: "danger", text: `Your offer for ${e.cropName} was declined.`, time: "Recent" });
        } else if (e.status === "Counter Offered") {
          alertItems.push({ type: "accent", text: `Seller sent a counter bid of Rs. ${e.priceOffered} on ${e.cropName}.`, time: "Recent" });
        } else {
          alertItems.push({ type: "info", text: `Your bid for ${e.cropName} is currently pending review.`, time: "Active" });
        }
      });

      const othersCrops = this.listings.filter(c => c.farmerId !== userUid);
      othersCrops.slice(-2).forEach(c => {
        alertItems.push({ type: "accent", text: `New arrival: ${c.cropName} (${c.quantity} ${c.unit}) listed in ${c.location} by ${c.farmerName}.`, time: c.createdAt });
      });

      if (alertItems.length === 0) {
        alertItems.push({ type: "info", text: "No marketplace updates yet. Go to Marketplace to explore.", time: "Now" });
      }

      alertItems.slice(0, 5).forEach(item => {
        const li = document.createElement("li");
        li.className = "activity-item";
        li.innerHTML = `
          <div class="activity-marker">
            <div class="activity-dot ${item.type}"></div>
            <div class="activity-line"></div>
          </div>
          <div class="activity-content">
            <span class="activity-time">${item.time}</span>
            <span class="activity-text">${item.text}</span>
          </div>
        `;
        alertsFeed.appendChild(li);
      });
    }
  }

  populateChartSelect() {
    const select = document.getElementById("dashboard-chart-crop-select");
    select.innerHTML = "";
    Object.keys(this.marketTrends.crops).forEach(cropName => {
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
    const prices = this.marketTrends.crops[selectedCrop] || [];
    const months = this.marketTrends.months;

    const ctx = document.getElementById("trendsChart");
    if (!ctx) return;

    // Destroy existing chart to prevent garbage overlays
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
            grid: {
              color: gridColor
            },
            ticks: {
              color: textColor
            }
          },
          y: {
            grid: {
              color: gridColor
            },
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
    grid.innerHTML = "";

    const userUid = this.currentUser ? this.currentUser.uid : "demo-user-123";
    const farmerListings = this.listings.filter(c => c.farmerId === userUid);
    
    // Sort so most recent comes first
    const sorted = [...farmerListings].reverse();

    if (sorted.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: span 3;">
          <i class="fa-solid fa-seedling"></i>
          <h3>No Crop Listings Created</h3>
          <p>You have not published any crops yet. Click the "Add Crop Listing" button to list your current inventory.</p>
        </div>
      `;
      this.renderReceivedEnquiries();
      return;
    }

    sorted.forEach(c => {
      let statusBadge = "";
      if (c.status === "Available") statusBadge = `<span class="badge badge-success crop-card-badge">Available</span>`;
      else if (c.status === "Reserved") statusBadge = `<span class="badge badge-warning crop-card-badge">Reserved</span>`;
      else statusBadge = `<span class="badge badge-neutral crop-card-badge">Sold</span>`;

      const card = document.createElement("div");
      card.className = "crop-card";
      
      // Determine placeholder icons based on categories
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
          <p class="crop-card-desc">${c.description}</p>
          <div class="crop-card-details">
            <div class="crop-card-detail-item"><i class="fa-solid fa-scale-balanced"></i>Qty: ${c.quantity.toLocaleString("en-IN")} ${c.unit}</div>
            <div class="crop-card-detail-item"><i class="fa-solid fa-location-dot"></i>${c.location}</div>
            <div class="crop-card-detail-item"><i class="fa-solid fa-calendar-check"></i>Harv: ${c.harvestDate}</div>
            <div class="crop-card-detail-item"><i class="fa-solid fa-clock"></i>Pub: ${c.createdAt}</div>
          </div>
          <div class="crop-card-price-row">
            <span class="price-label">Expected Price</span>
            <span class="price-value">Rs. ${c.price}/${c.unit}</span>
          </div>
        </div>
        <div class="crop-card-footer">
          <button class="btn btn-secondary btn-sm" onclick="app.openEditListingModal('${c.id}')" title="Edit Listing"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
          <button class="btn btn-secondary btn-sm" onclick="app.quickToggleStatus('${c.id}')" title="Change Status"><i class="fa-solid fa-rotate"></i> Status</button>
          <button class="btn btn-danger btn-sm btn-icon-only" onclick="app.deleteListing('${c.id}')" title="Delete Listing" style="margin-left: auto;"><i class="fa-solid fa-trash-can"></i></button>
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
    
    // Clear and filter
    const userUid = this.currentUser ? this.currentUser.uid : "demo-user-123";
    const farmerListings = this.listings.filter(c => c.farmerId === userUid);
    
    const filtered = farmerListings.filter(c => {
      const matchQuery = c.cropName.toLowerCase().includes(query) || 
                          c.variety.toLowerCase().includes(query) || 
                          c.location.toLowerCase().includes(query);
      const matchCategory = category === "all" || c.category === category;
      return matchQuery && matchCategory;
    });

    // Re-render
    grid.innerHTML = "";
    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: span 3;">
          <i class="fa-solid fa-magnifying-glass"></i>
          <h3>No Match Found</h3>
          <p>We couldn't find any listings matching "${query}" or category "${category}".</p>
        </div>
      `;
      return;
    }

    filtered.reverse().forEach(c => {
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
          <p class="crop-card-desc">${c.description}</p>
          <div class="crop-card-details">
            <div class="crop-card-detail-item"><i class="fa-solid fa-scale-balanced"></i>Qty: ${c.quantity.toLocaleString("en-IN")} ${c.unit}</div>
            <div class="crop-card-detail-item"><i class="fa-solid fa-location-dot"></i>${c.location}</div>
            <div class="crop-card-detail-item"><i class="fa-solid fa-calendar-check"></i>Harv: ${c.harvestDate}</div>
            <div class="crop-card-detail-item"><i class="fa-solid fa-clock"></i>Pub: ${c.createdAt}</div>
          </div>
          <div class="crop-card-price-row">
            <span class="price-label">Expected Price</span>
            <span class="price-value">Rs. ${c.price}/${c.unit}</span>
          </div>
        </div>
        <div class="crop-card-footer">
          <button class="btn btn-secondary btn-sm" onclick="app.openEditListingModal('${c.id}')"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
          <button class="btn btn-secondary btn-sm" onclick="app.quickToggleStatus('${c.id}')"><i class="fa-solid fa-rotate"></i> Status</button>
          <button class="btn btn-danger btn-sm btn-icon-only" onclick="app.deleteListing('${c.id}')" style="margin-left: auto;"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // ENQUIRIES HANDLER
  renderReceivedEnquiries() {
    const listContainer = document.getElementById("received-enquiries-list");
    listContainer.innerHTML = "";

    const userUid = this.currentUser ? this.currentUser.uid : "demo-user-123";
    const relevant = this.enquiries.filter(e => e.farmerId === userUid);
    
    // Counter badge
    const countBadge = document.getElementById("received-enquiries-count");
    const pendingCount = relevant.filter(e => e.status === "Pending").length;
    if (countBadge) {
      countBadge.innerText = `${pendingCount} Pending`;
    }

    if (relevant.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state" style="padding: 20px;">
          <i class="fa-solid fa-comments"></i>
          <p style="font-size: 0.85rem;">No enquiries received yet for your crops.</p>
        </div>
      `;
      return;
    }

    relevant.reverse().forEach(e => {
      let statusBadge = "";
      if (e.status === "Pending") statusBadge = `<span class="badge proposal-badge-pending">Pending</span>`;
      else if (e.status === "Accepted") statusBadge = `<span class="badge proposal-badge-accepted">Accepted</span>`;
      else if (e.status === "Counter Offered") statusBadge = `<span class="badge proposal-badge-pending">Counter Offered</span>`;
      else statusBadge = `<span class="badge proposal-badge-rejected">Rejected</span>`;

      const crop = this.listings.find(c => c.id === e.listingId) || { unit: "kg" };

      const enqCard = document.createElement("div");
      enqCard.className = "enquiry-proposal-card";
      enqCard.innerHTML = `
        <div class="enquiry-proposal-header">
          <div>
            <h4 class="enquiry-proposal-title"><i class="fa-solid fa-wheat-awn"></i> Crop Offer: ${e.cropName}</h4>
            <span class="enquiry-proposal-date">Submitted on: ${new Date(e.createdAt).toLocaleDateString()}</span>
          </div>
          ${statusBadge}
        </div>
        
        <div class="proposal-grid">
          <!-- Buyer Information Section -->
          <div>
            <h5 class="proposal-sec-title"><i class="fa-solid fa-tractor"></i> Buyer Information</h5>
            <ul class="proposal-details-list">
              <li>Company: <strong>${e.buyerCompany || "Not Specified"}</strong></li>
              <li>Contact Person: <strong>${e.buyerName}</strong></li>
              <li>Phone: <strong>${e.buyerPhone}</strong></li>
              <li>Email: <strong>${e.buyerEmail}</strong></li>
            </ul>
          </div>
          
          <!-- Offer Details Section -->
          <div>
            <h5 class="proposal-sec-title"><i class="fa-solid fa-handshake"></i> Offer Details</h5>
            <ul class="proposal-details-list">
              <li>Quantity Requested: <strong>${e.quantityRequested.toLocaleString()} ${crop.unit}</strong></li>
              <li>Offered Price: <strong>Rs. ${e.priceOffered}/${crop.unit}</strong></li>
              <li>Expected Delivery: <strong>${e.expectedDeliveryDate || "Not Specified"}</strong></li>
              <li>Payment Method: <strong>${e.preferredPayment || "Not Specified"}</strong></li>
            </ul>
          </div>
        </div>
        
        <!-- Message Box -->
        <div class="proposal-message-block">
          <h5 class="proposal-sec-title"><i class="fa-solid fa-money-bill-wave"></i> Message from Buyer</h5>
          <p class="proposal-message-box">"${e.message}"</p>
        </div>
        
        <!-- Actions Row -->
        <div class="proposal-actions-row">
          ${e.status === "Pending" ? `
            <button class="btn btn-proposal-accept btn-sm" onclick="app.updateEnquiryStatus('${e.id}', 'Accepted')"><i class="fa-solid fa-check"></i> Accept Offer</button>
            <button class="btn btn-proposal-reject btn-sm" onclick="app.updateEnquiryStatus('${e.id}', 'Rejected')"><i class="fa-solid fa-xmark"></i> Reject Offer</button>
            <button class="btn btn-proposal-counter btn-sm" onclick="app.makeCounterOffer('${e.id}')"><i class="fa-solid fa-coins"></i> Counter Offer</button>
          ` : ""}
          <button class="btn btn-secondary btn-sm" onclick="app.contactBuyer('${e.id}')"><i class="fa-solid fa-phone"></i> Contact Buyer</button>
        </div>
      `;
      listContainer.appendChild(enqCard);
    });
  }

  updateEnquiryStatus(enqId, status) {
    const enq = this.enquiries.find(e => e.id === enqId);
    if (!enq) return;

    enq.status = status;

    // If accepted, reserve the crop listing
    if (status === "Accepted") {
      const crop = this.listings.find(c => c.id === enq.listingId);
      if (crop) {
        crop.status = "Reserved";
        this.showToast(`Enquiry Accepted! Crop listing "${crop.cropName}" has been updated to "Reserved" status.`, "success");
      }
    } else if (status === "Rejected") {
      this.showToast(`Enquiry proposal for "${enq.cropName}" was rejected.`, "info");
    }

    this.saveToStorage();
  }

  makeCounterOffer(enqId) {
    const enq = this.enquiries.find(e => e.id === enqId);
    if (!enq) return;
    const counterRate = prompt(`Enter your counter offer price per unit (Current Buyer Offer: Rs. ${enq.priceOffered}):`, enq.priceOffered);
    if (counterRate !== null && !isNaN(counterRate) && Number(counterRate) > 0) {
      enq.status = "Counter Offered";
      enq.priceOffered = Number(counterRate);
      this.saveToStorage();
      this.showToast(`Counter offer of Rs. ${counterRate}/unit sent to ${enq.buyerName}!`, "success");
    }
  }

  contactBuyer(enqId) {
    const enq = this.enquiries.find(e => e.id === enqId);
    if (!enq) return;
    this.showToast(`Contact Details for ${enq.buyerName}:\nPhone: ${enq.buyerPhone} | Email: ${enq.buyerEmail}`, "info");
  }

  // --- MARKETPLACE SCREEN LOGIC ---
  renderMarketplace() {
    const grid = document.getElementById("marketplace-grid");
    grid.innerHTML = "";

    const userUid = this.currentUser ? this.currentUser.uid : "demo-user-123";
    
    // Show only crop listings from other farmers
    const sorted = this.listings
      .filter(c => c.farmerId !== userUid)
      .reverse();

    if (sorted.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: span 3;">
          <i class="fa-solid fa-store"></i>
          <h3>Marketplace Empty</h3>
          <p>No crops are currently listed on HarvestLink by other farmers.</p>
        </div>
      `;
      return;
    }

    sorted.forEach(c => {
      if (c.status === "Sold") return;

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
          <p class="crop-card-desc">${c.description}</p>
          <div class="crop-card-details">
            <div class="crop-card-detail-item"><i class="fa-solid fa-scale-balanced"></i>Qty: ${c.quantity.toLocaleString("en-IN")} ${c.unit}</div>
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

  filterMarketplace() {
    const query = document.getElementById("market-search").value.toLowerCase();
    const category = document.getElementById("market-category").value;
    const status = document.getElementById("market-status").value;
    const grid = document.getElementById("marketplace-grid");
    const userUid = this.currentUser ? this.currentUser.uid : "demo-user-123";

    const filtered = this.listings.filter(c => {
      if (c.status === "Sold") return false;
      if (c.farmerId === userUid) return false;
      
      const matchQuery = c.cropName.toLowerCase().includes(query) || 
                          c.variety.toLowerCase().includes(query) || 
                          c.location.toLowerCase().includes(query) ||
                          c.farmerName.toLowerCase().includes(query);
      const matchCategory = category === "all" || c.category === category;
      const matchStatus = status === "all" || c.status === status;
      return matchQuery && matchCategory && matchStatus;
    });

    grid.innerHTML = "";
    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: span 3;">
          <i class="fa-solid fa-magnifying-glass"></i>
          <h3>No Produce Found</h3>
          <p>No listings match filters: "${query}", Category: "${category}" or Status: "${status}".</p>
        </div>
      `;
      return;
    }

    filtered.reverse().forEach(c => {
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
          <p class="crop-card-desc">${c.description}</p>
          <div class="crop-card-details">
            <div class="crop-card-detail-item"><i class="fa-solid fa-scale-balanced"></i>Qty: ${c.quantity.toLocaleString("en-IN")} ${c.unit}</div>
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

  // --- CRUD ACTION HANDLERS ---
  openAddListingModal() {
    document.getElementById("listing-modal-title").innerText = "Add Crop Listing";
    document.getElementById("listing-form").reset();
    document.getElementById("listing-id").value = "";
    document.getElementById("listing-harvest-date").value = new Date().toISOString().split('T')[0];
    document.getElementById("listing-location").value = this.farmerProfile.location;
    
    const modal = document.getElementById("add-listing-modal");
    modal.classList.add("active");
  }

  openEditListingModal(id) {
    const crop = this.listings.find(c => c.id === id);
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
    document.getElementById("listing-description").value = crop.description;

    const modal = document.getElementById("add-listing-modal");
    modal.classList.add("active");
  }

  closeAddListingModal() {
    const modal = document.getElementById("add-listing-modal");
    modal.classList.remove("active");
  }

  quickToggleStatus(id) {
    const crop = this.listings.find(c => c.id === id);
    if (!crop) return;

    // Cycle Available -> Reserved -> Sold -> Available
    if (crop.status === "Available") crop.status = "Reserved";
    else if (crop.status === "Reserved") crop.status = "Sold";
    else crop.status = "Available";

    this.saveToStorage();
    this.renderMyListings();
  }

  saveListing(event) {
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

    if (id) {
      const index = this.listings.findIndex(c => c.id === id);
      if (index !== -1) {
        this.listings[index] = {
          ...this.listings[index],
          cropName, category, variety, quantity, unit, price, harvestDate, location, description
        };
        this.showToast(`Listing "${cropName}" updated successfully.`, "success");
      }
    } else {
      const newCrop = {
        id: "list-" + Date.now(),
        farmerId: this.currentUser ? this.currentUser.uid : "demo-user-123",
        farmerName: this.farmerProfile.name,
        farmerEmail: this.farmerProfile.email,
        farmName: this.farmerProfile.farmName,
        cropName, category, variety, quantity, unit, price, harvestDate, 
        location: location || this.farmerProfile.location, 
        description,
        status: "Available",
        createdAt: new Date().toISOString().split('T')[0]
      };
      this.listings.push(newCrop);
      this.showToast(`Listing "${cropName}" created successfully!`, "success");
    }

    this.saveToStorage();
    this.closeAddListingModal();
  }

  deleteListing(id) {
    if (!confirm("Are you sure you want to delete this listing?")) return;

    this.listings = this.listings.filter(c => c.id !== id);
    this.enquiries = this.enquiries.filter(e => e.listingId !== id);

    this.saveToStorage();
    this.showToast("Listing deleted successfully.", "info");
  }

  // --- BUYER ENQUIRY FORM LOGIC ---
  openEnquiryModal(listingId) {
    const crop = this.listings.find(c => c.id === listingId);
    if (!crop) return;

    document.getElementById("enquiry-listing-id").value = crop.id;
    document.getElementById("enquiry-crop-title").innerText = crop.cropName;
    document.getElementById("enquiry-crop-meta").innerText = `Seller: ${crop.farmerName} | Price: Rs. ${crop.price}/${crop.unit}`;
    
    // Pre-fill quantities & rates
    document.getElementById("enquiry-quantity").value = crop.quantity;
    document.getElementById("enquiry-price").value = crop.price;
    document.getElementById("enquiry-message").value = `We are interested in buying your ${crop.cropName}. Can you share your preferred pickup times?`;

    // Defaults for new fields
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    document.getElementById("enquiry-delivery-date").value = nextWeek.toISOString().split('T')[0];
    document.getElementById("enquiry-payment-method").value = "Bank Transfer";

    // Auto-fill buyer contact details from active profile if user is Buyer
    if (this.currentRole === "Buyer") {
      document.getElementById("enquiry-buyer-name").value = this.buyerProfile.name;
      document.getElementById("enquiry-buyer-company").value = this.buyerProfile.farmName || "BigBasket Procurement";
      document.getElementById("enquiry-buyer-phone").value = this.buyerProfile.phone;
      document.getElementById("enquiry-buyer-email").value = this.buyerProfile.email;
    } else {
      // Default placeholder buyer text
      document.getElementById("enquiry-buyer-name").value = "Sourcing Officer";
      document.getElementById("enquiry-buyer-company").value = "BigBasket Sourcing";
      document.getElementById("enquiry-buyer-phone").value = "+91 98877 66554";
      document.getElementById("enquiry-buyer-email").value = "sourcing@bigbasket.in";
    }

    const modal = document.getElementById("enquiry-modal");
    modal.classList.add("active");
  }

  closeEnquiryModal() {
    const modal = document.getElementById("enquiry-modal");
    modal.classList.remove("active");
  }

  saveEnquiry(event) {
    event.preventDefault();
    const listingId = document.getElementById("enquiry-listing-id").value;
    const buyerName = document.getElementById("enquiry-buyer-name").value.trim();
    const buyerCompany = document.getElementById("enquiry-buyer-company").value.trim();
    const buyerPhone = document.getElementById("enquiry-buyer-phone").value.trim();
    const buyerEmail = document.getElementById("enquiry-buyer-email").value.trim();
    const quantityRequested = Number(document.getElementById("enquiry-quantity").value);
    const priceOffered = Number(document.getElementById("enquiry-price").value);
    const expectedDeliveryDate = document.getElementById("enquiry-delivery-date").value;
    const preferredPayment = document.getElementById("enquiry-payment-method").value;
    const message = document.getElementById("enquiry-message").value.trim();

    const crop = this.listings.find(c => c.id === listingId);
    if (!crop) return;

    const newEnquiry = {
      id: "enq-" + Date.now(),
      listingId,
      farmerId: crop.farmerId || "demo-user-123",
      farmerEmail: crop.farmerEmail || "ramesh.patel@greenvalley.com",
      farmerName: crop.farmerName || "Ramesh Patel",
      buyerId: this.currentUser ? this.currentUser.uid : "demo-user-123",
      buyerEmail,
      buyerName,
      buyerCompany,
      buyerPhone,
      cropName: crop.cropName,
      quantityRequested,
      priceOffered,
      expectedDeliveryDate,
      paymentMethod: preferredPayment,
      message,
      status: "Pending",
      createdAt: new Date().toISOString()
    };

    this.enquiries.push(newEnquiry);
    this.saveToStorage();
    this.closeEnquiryModal();
    this.showToast("Your business proposal has been submitted to the farmer!", "success");
  }

  // --- PROFILE SAVE LOGIC ---
  saveProfile(event) {
    event.preventDefault();
    this.profile.name = document.getElementById("profile-name").value.trim();
    this.profile.farmName = document.getElementById("profile-farm-name").value.trim();
    this.profile.location = document.getElementById("profile-location").value.trim();
    if (this.currentRole === "Farmer") {
      this.profile.farmSize = document.getElementById("profile-farm-size").value.trim();
    } else {
      this.profile.farmSize = "";
    }
    this.profile.phone = document.getElementById("profile-phone").value.trim();
    this.profile.email = document.getElementById("profile-email").value.trim();
    this.profile.mainCrops = document.getElementById("profile-crops").value.trim();
    
    this.saveToStorage();
    this.showToast("Profile saved successfully!", "success");
  }

  // API KEYS LOGIC
  async saveApiKeyFromSettings() {
    const key = document.getElementById("settings-api-key").value.trim();
    if (!key) {
      this.clearApiKeyFromSettings();
      return;
    }

    const saveBtn = document.querySelector(".api-key-container .btn-primary") || document.querySelector("button[onclick='app.saveApiKeyFromSettings()']");
    const originalText = saveBtn ? saveBtn.innerHTML : "";
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<i class="fa-solid fa-spinner spinner-icon"></i> Validating...`;
    }

    try {
      await window.GeminiService.validateApiKey(key);
      window.GeminiService.setApiKey(key);
      this.syncApiStatus();
      document.getElementById("modal-api-key").value = key;
      this.showToast("Google Gemini Live Key activated!", "success");
    } catch (err) {
      console.error(err);
      this.showToast(`Validation Failed: ${err.message}`, "error");
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText || "Save Key";
      }
    }
  }

  clearApiKeyFromSettings() {
    document.getElementById("settings-api-key").value = "";
    document.getElementById("modal-api-key").value = "";
    window.GeminiService.setApiKey("");
    this.syncApiStatus();
    this.showToast("API Key cleared. Switched back to simulated Demo Mode.", "info");
  }

  openApiKeyModal() {
    document.getElementById("modal-api-key").value = window.GeminiService.getApiKey();
    document.getElementById("api-modal").classList.add("active");
  }

  closeApiKeyModal() {
    document.getElementById("api-modal").classList.remove("active");
  }

  async saveApiKeyFromModal() {
    const key = document.getElementById("modal-api-key").value.trim();
    if (!key) {
      this.clearApiKeyFromSettings();
      this.closeApiKeyModal();
      return;
    }

    const saveBtn = document.querySelector("#api-modal .btn-primary");
    const originalText = saveBtn ? saveBtn.innerHTML : "";
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<i class="fa-solid fa-spinner spinner-icon"></i> Validating...`;
    }

    try {
      await window.GeminiService.validateApiKey(key);
      window.GeminiService.setApiKey(key);
      this.syncApiStatus();
      document.getElementById("settings-api-key").value = key;
      this.closeApiKeyModal();
      this.showToast("Google Gemini Live Key activated!", "success");
    } catch (err) {
      console.error(err);
      this.showToast(`Validation Failed: ${err.message}`, "error");
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText || "Activate Key";
      }
    }
  }

  // ==============================================
  // GEMINI AI INTEGRATION WRAPPERS
  // ==============================================
  
  // 1. Description Generator in Form Modal
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
      this.showToast("Please fill in Crop Name, Quantity, Price, and Location first so AI has crop parameters to describe!", "error");
      return;
    }

    const descButton = document.getElementById("listing-ai-desc-btn");
    const descTextarea = document.getElementById("listing-description");
    const originalText = descButton.innerHTML;

    // Show loading spinner
    descButton.innerHTML = `<i class="fa-solid fa-spinner spinner-icon"></i> Generating...`;
    descButton.disabled = true;

    try {
      const generated = await window.GeminiService.generateCropDescription({
        name, category, variety, quantity, unit, price, location, harvestDate
      });
      descTextarea.value = generated;
      this.showToast("Crop description generated by Gemini AI!", "success");
    } catch (err) {
      this.showToast("Error generating description: " + err.message, "error");
    } finally {
      descButton.innerHTML = originalText;
      descButton.disabled = false;
    }
  }

  // 2. AI Advisor: Dynamic Selling / Buying Recommendations
  populateAdvisorSelect() {
    const select = document.getElementById("advisor-crop-select");
    if (!select) return;
    select.innerHTML = "";
    
    const isFarmer = this.currentRole === "Farmer";
    const userUid = this.currentUser ? this.currentUser.uid : "demo-user-123";
    const crops = isFarmer
      ? this.listings.filter(c => c.farmerId === userUid && c.status !== "Sold")
      : this.listings.filter(c => c.farmerId !== userUid && c.status !== "Sold");

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
      opt.innerText = `${c.cropName} (${c.quantity} ${c.unit})${isFarmer ? '' : ' - ' + c.farmerName}`;
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

    const crop = this.listings.find(c => c.id === cropId);
    if (!crop) return;

    const isFarmer = this.currentRole === "Farmer";
    const btn = isFarmer
      ? document.getElementById("advisor-generate-btn-farmer")
      : document.getElementById("advisor-generate-btn-buyer");

    if (!btn) return;
    const originalText = btn.innerHTML;
    
    // Set loading
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
          <p style="color:var(--color-text-medium);">${isFarmer ? 'AI is gathering local Mandi pricing index data & forecasting recommendations...' : 'AI is assessing seller pricing, quality factors, and transport logistics...'}</p>
        </div>
      `;
    }

    try {
      const markdown = await window.GeminiService.getSellingSuggestions(crop, !isFarmer);
      if (resultBox) resultBox.innerHTML = this.parseBasicMarkdown(markdown);
      this.showToast("Gemini recommendations generated successfully!", "success");
    } catch(err) {
      if (resultBox) resultBox.innerHTML = `<p style="color:var(--color-danger); padding:16px;">Failed to generate AI insights: ${err.message}</p>`;
      this.showToast(`AI Insight failed: ${err.message}`, "error");
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }

  // 3. AI Chat Interface Q&A
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

    // User Message
    this.chatHistory.push({ sender: "user", text });
    this.renderChatMessages();
    input.value = "";
    this.saveToStorage();

    // Show loading indicators
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
      this.saveToStorage();
      this.renderChatMessages();
    } catch(err) {
      const load = document.getElementById("chat-typing-loader");
      if (load) load.remove();
      
      this.chatHistory.push({ sender: "bot", text: `Error: Unable to reach Gemini. ${err.message}` });
      this.saveToStorage();
      this.renderChatMessages();
    }
  }

  clearChatHistory() {
    this.chatHistory = [
      { sender: "bot", text: "Chat history cleared. How can I help you today with your farm crops, pest controls, or mandi market rates?" }
    ];
    this.saveToStorage();
    this.renderChatMessages();
  }

  // Tiny helper to parse simple Markdown syntax like lists (*, -), bold (**), and headers (###)
  parseBasicMarkdown(md) {
    if (!md) return "";
    let html = md;
    
    // Replace HTML brackets to prevent XSS
    html = html.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Headings ###
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Bold **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Lists bullets
    // Replace line items starts with * or - with list elements
    html = html.replace(/^\s*[\*\-]\s+(.*)$/gim, '<li>$1</li>');
    
    // Wrap groups of <li> in <ul>. We search for adjacent <li> items
    // This is a naive regex parser but works great for our controlled responses
    html = html.replace(/(<li>.*<\/li>)/sim, '<ul>$1</ul>');

    // Paragraph breaks
    html = html.replace(/\n\n/g, '<br><br>');

    return html;
  }
}

// Global Instantiate
window.app = new HarvestLinkApp();
