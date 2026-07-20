class HarvestLinkApp {
  constructor() {
    this.initStorage();
    this.currentTab = "dashboard";
    this.currentRole = this.profile.role || "Farmer";
    this.chart = null;
    
    // Initial Chat log
    this.chatHistory = [
      { sender: "bot", text: "Welcome to HarvestLink AI! I am your agricultural advisor. How can I help you today with crops, pest control, weather preparation, or market insights?" }
    ];

    // Initialize UI on page load
    document.addEventListener("DOMContentLoaded", () => {
      this.initUI();
    });
  }

  // --- LOCAL STORAGE STATE MANAGEMENT ---
  initStorage() {
    const seed = window.HarvestLinkMockData;
    
    // Profile
    const storedProfile = localStorage.getItem("harvestlink_profile");
    this.profile = storedProfile ? JSON.parse(storedProfile) : { ...seed.INITIAL_PROFILE };
    
    // Listings
    const storedListings = localStorage.getItem("harvestlink_listings");
    this.listings = storedListings ? JSON.parse(storedListings) : [ ...seed.INITIAL_LISTINGS ];
    
    // Enquiries
    const storedEnquiries = localStorage.getItem("harvestlink_enquiries");
    this.enquiries = storedEnquiries ? JSON.parse(storedEnquiries) : [ ...seed.INITIAL_ENQUIRIES ];

    // Market Trends pricing seed
    this.marketTrends = seed.MARKET_TRENDS_SEED;

    this.saveToStorage();
  }

  saveToStorage() {
    localStorage.setItem("harvestlink_profile", JSON.stringify(this.profile));
    localStorage.setItem("harvestlink_listings", JSON.stringify(this.listings));
    localStorage.setItem("harvestlink_enquiries", JSON.stringify(this.enquiries));
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
        subtitle.innerText = `Welcome back, ${this.profile.name}! Here is your farming summary.`;
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
      // Change dashboard view welcome
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
    if (this.currentRole === "Farmer") {
      // 1. Compute KPIs
      // Active Farmer Listings
      const farmerListings = this.listings.filter(c => c.farmerName === this.profile.name);
      const activeListingsCount = farmerListings.filter(c => c.status === "Available" || c.status === "Reserved").length;
      document.getElementById("kpi-active-listings").innerText = `${activeListingsCount} Crops`;

      // Received Enquiries
      const listingsIds = farmerListings.map(c => c.id);
      const pendingEnquiries = this.enquiries.filter(e => listingsIds.includes(e.listingId) && e.status === "Pending").length;
      document.getElementById("kpi-enquiries").innerText = `${pendingEnquiries} Pending`;

      // Sales Revenue (Sold crops)
      let totalSales = 0;
      farmerListings.forEach(c => {
        if (c.status === "Sold") {
          totalSales += (c.price * c.quantity);
        }
      });
      // Format to INR Currency layout
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
        // Sort recently created
        const recent = [...farmerListings].slice(0, 5);
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
      
      // Add default styled suggestions
      const alertItems = [
        { type: "success", text: "Organic Roma Tomatoes listing reserved by FreshBasket Sourcing.", time: "Today, 02:30 PM" },
        { type: "info", text: "Wheat market prices trending upwards in Nashik mandi. Recommended to sell soon.", time: "Yesterday" },
        { type: "accent", text: "Basmati Rice inquiry received from Karan Johar (Heritage Flour Mills).", time: "2 days ago" }
      ];

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
      const availableCrops = this.listings.filter(c => c.farmerName !== this.profile.name && c.status !== "Sold");
      document.getElementById("kpi-buyer-available").innerText = `${availableCrops.length} Crops`;

      // Sent Enquiries (enquiries sent by this buyer)
      const myEnquiries = this.enquiries.filter(e => e.buyerEmail === this.profile.email);
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
          else statusBadge = `<span class="badge badge-danger">Rejected</span>`;

          // find seller name
          const crop = this.listings.find(c => c.id === e.listingId);
          const sellerName = crop ? crop.farmerName : "Unknown";

          const row = document.createElement("tr");
          row.innerHTML = `
            <td><strong>${e.cropName}</strong></td>
            <td>${sellerName}</td>
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
      // Pull recent enquiries statuses
      myEnquiries.forEach(e => {
        if (e.status === "Accepted") {
          alertItems.push({ type: "success", text: `Your quote for ${e.cropName} was accepted by the seller!`, time: "Recent" });
        } else if (e.status === "Rejected") {
          alertItems.push({ type: "danger", text: `Your offer for ${e.cropName} was declined.`, time: "Recent" });
        } else {
          alertItems.push({ type: "info", text: `Your bid for ${e.cropName} is currently pending review.`, time: "Active" });
        }
      });

      // Add general notifications for newly listed crops by other farmers
      const othersCrops = this.listings.filter(c => c.farmerName !== this.profile.name);
      othersCrops.slice(-2).forEach(c => {
        alertItems.push({ type: "accent", text: `New arrival: ${c.cropName} (${c.quantity} ${c.unit}) listed in ${c.location} by ${c.farmerName}.`, time: c.createdAt });
      });

      // Ensure we have some items in the feed
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

    const farmerListings = this.listings.filter(c => c.farmerName === this.profile.name);
    
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
    const farmerListings = this.listings.filter(c => c.farmerName === this.profile.name);
    
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

    const farmerListings = this.listings.filter(c => c.farmerName === this.profile.name);
    const listingsIds = farmerListings.map(c => c.id);
    
    // Filter enquiries relating to farmer's crops
    const relevant = this.enquiries.filter(e => listingsIds.includes(e.listingId));
    
    // Counter badge
    const countBadge = document.getElementById("received-enquiries-count");
    const pendingCount = relevant.filter(e => e.status === "Pending").length;
    countBadge.innerText = `${pendingCount} Pending`;

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
      if (e.status === "Pending") statusBadge = `<span class="badge badge-warning">Pending</span>`;
      else if (e.status === "Accepted") statusBadge = `<span class="badge badge-success">Accepted</span>`;
      else statusBadge = `<span class="badge badge-danger">Rejected</span>`;

      // Get crop details
      const crop = this.listings.find(c => c.id === e.listingId) || { unit: "kg" };

      const enqCard = document.createElement("div");
      enqCard.className = "enquiry-card";
      enqCard.innerHTML = `
        <div class="enquiry-header">
          <div class="enquiry-meta">
            <span class="enquiry-crop-tag">${e.cropName}</span>
            <h4 class="enquiry-buyer-name">${e.buyerName}</h4>
            <span class="enquiry-date">Received: ${new Date(e.createdAt).toLocaleDateString()}</span>
          </div>
          ${statusBadge}
        </div>
        <p class="enquiry-body">"${e.message}"</p>
        <div class="enquiry-deal-details">
          <div class="enquiry-deal-item">Quantity Proposed: <span>${e.quantityRequested.toLocaleString()} ${crop.unit}</span></div>
          <div class="enquiry-deal-item">Price Offered: <span>Rs. ${e.priceOffered}/${crop.unit}</span></div>
          <div class="enquiry-deal-item">Contact: <span>${e.buyerPhone} / ${e.buyerEmail}</span></div>
        </div>
        ${e.status === "Pending" ? `
          <div class="enquiry-actions">
            <button class="btn btn-secondary btn-sm" onclick="app.updateEnquiryStatus('${e.id}', 'Rejected')"><i class="fa-solid fa-xmark"></i> Reject Offer</button>
            <button class="btn btn-primary btn-sm" onclick="app.updateEnquiryStatus('${e.id}', 'Accepted')"><i class="fa-solid fa-check"></i> Accept Offer</button>
          </div>
        ` : ""}
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
        alert(`Enquiry Accepted! Crop listing "${crop.cropName}" has been updated to "Reserved" status.`);
      }
    }

    this.saveToStorage();
    this.renderMyListings();
  }

  // --- MARKETPLACE SCREEN LOGIC ---
  renderMarketplace() {
    const grid = document.getElementById("marketplace-grid");
    grid.innerHTML = "";

    // Show ALL listings
    const sorted = [...this.listings].reverse();

    if (sorted.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: span 3;">
          <i class="fa-solid fa-store"></i>
          <h3>Marketplace Empty</h3>
          <p>No crops are currently listed on HarvestLink. Switch to Farmer role to list a crop.</p>
        </div>
      `;
      return;
    }

    sorted.forEach(c => {
      // Don't show sold items in active buyer marketplace
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

      const isOwn = c.farmerName === this.profile.name;

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
            <span>Farmer: <strong>${isOwn ? 'Me (' + c.farmerName + ')' : c.farmerName}</strong></span>
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
          ${isOwn ? `
            <button class="btn btn-secondary btn-sm btn-block" disabled style="cursor: not-allowed;"><i class="fa-solid fa-user"></i> My Listing</button>
          ` : `
            <button class="btn btn-primary btn-sm btn-block" onclick="app.openEnquiryModal('${c.id}')"><i class="fa-solid fa-paper-plane"></i> Send Enquiry / Quote</button>
          `}
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

    const filtered = this.listings.filter(c => {
      if (c.status === "Sold") return false;
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

      const isOwn = c.farmerName === this.profile.name;

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
            <span>Farmer: <strong>${isOwn ? 'Me (' + c.farmerName + ')' : c.farmerName}</strong></span>
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
          ${isOwn ? `
            <button class="btn btn-secondary btn-sm btn-block" disabled><i class="fa-solid fa-user"></i> My Listing</button>
          ` : `
            <button class="btn btn-primary btn-sm btn-block" onclick="app.openEnquiryModal('${c.id}')"><i class="fa-solid fa-paper-plane"></i> Send Enquiry / Quote</button>
          `}
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
    document.getElementById("listing-location").value = this.profile.location;
    
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
      // Edit mode
      const index = this.listings.findIndex(c => c.id === id);
      if (index !== -1) {
        this.listings[index] = {
          ...this.listings[index],
          cropName, category, variety, quantity, unit, price, harvestDate, location, description
        };
      }
    } else {
      // Create mode
      const newCrop = {
        id: "list-" + Date.now(),
        farmerName: this.profile.name,
        cropName, category, variety, quantity, unit, price, harvestDate, location, description,
        status: "Available",
        createdAt: new Date().toISOString().split('T')[0]
      };
      this.listings.push(newCrop);
    }

    this.saveToStorage();
    this.closeAddListingModal();
    this.renderMyListings();
  }

  deleteListing(id) {
    if (!confirm("Are you sure you want to delete this listing?")) return;

    this.listings = this.listings.filter(c => c.id !== id);
    // clean relevant inquiries
    this.enquiries = this.enquiries.filter(e => e.listingId !== id);

    this.saveToStorage();
    this.renderMyListings();
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

    // Auto-fill buyer contact details from active profile if user is Buyer
    if (this.currentRole === "Buyer") {
      document.getElementById("enquiry-buyer-name").value = this.profile.name;
      document.getElementById("enquiry-buyer-phone").value = this.profile.phone;
      document.getElementById("enquiry-buyer-email").value = this.profile.email;
    } else {
      // Default placeholder buyer text
      document.getElementById("enquiry-buyer-name").value = "Sourcing Officer (BigBasket)";
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
    const buyerPhone = document.getElementById("enquiry-buyer-phone").value.trim();
    const buyerEmail = document.getElementById("enquiry-buyer-email").value.trim();
    const quantityRequested = Number(document.getElementById("enquiry-quantity").value);
    const priceOffered = Number(document.getElementById("enquiry-price").value);
    const message = document.getElementById("enquiry-message").value.trim();

    const crop = this.listings.find(c => c.id === listingId);
    if (!crop) return;

    const newEnquiry = {
      id: "enq-" + Date.now(),
      listingId,
      cropName: crop.cropName,
      buyerName, buyerPhone, buyerEmail, quantityRequested, priceOffered, message,
      status: "Pending",
      createdAt: new Date().toISOString()
    };

    this.enquiries.push(newEnquiry);
    this.saveToStorage();
    this.closeEnquiryModal();
    alert("Enquiry sent! The farmer will review your quote on their dashboard.");
    this.renderMarketplace();
  }

  // --- PROFILE SAVE LOGIC ---
  saveProfile(event) {
    event.preventDefault();
    this.profile.name = document.getElementById("profile-name").value.trim();
    this.profile.farmName = document.getElementById("profile-farm-name").value.trim();
    this.profile.location = document.getElementById("profile-location").value.trim();
    this.profile.farmSize = document.getElementById("profile-farm-size").value.trim();
    this.profile.phone = document.getElementById("profile-phone").value.trim();
    this.profile.email = document.getElementById("profile-email").value.trim();
    this.profile.mainCrops = document.getElementById("profile-crops").value.trim();
    
    this.saveToStorage();
    this.updateUserDisplay();
    alert("Profile saved successfully!");
  }

  // API KEYS LOGIC
  saveApiKeyFromSettings() {
    const key = document.getElementById("settings-api-key").value;
    window.GeminiService.setApiKey(key);
    this.syncApiStatus();
    
    // Sync header modals input
    document.getElementById("modal-api-key").value = key;
    
    const successMsg = document.getElementById("api-key-success-msg");
    successMsg.style.display = "block";
    setTimeout(() => successMsg.style.display = "none", 4000);
  }

  clearApiKeyFromSettings() {
    document.getElementById("settings-api-key").value = "";
    document.getElementById("modal-api-key").value = "";
    window.GeminiService.setApiKey("");
    this.syncApiStatus();
    alert("API Key cleared. Switched back to simulated Demo Mode.");
  }

  openApiKeyModal() {
    document.getElementById("modal-api-key").value = window.GeminiService.getApiKey();
    document.getElementById("api-modal").classList.add("active");
  }

  closeApiKeyModal() {
    document.getElementById("api-modal").classList.remove("active");
  }

  saveApiKeyFromModal() {
    const key = document.getElementById("modal-api-key").value;
    window.GeminiService.setApiKey(key);
    this.syncApiStatus();
    document.getElementById("settings-api-key").value = key;
    this.closeApiKeyModal();
    alert(key ? "Gemini Live API activated!" : "Switched to Demo Mode.");
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
      alert("Please fill in Crop Name, Quantity, Price, and Location first so AI has crop parameters to describe!");
      return;
    }

    const descButton = document.getElementById("listing-ai-desc-btn");
    const descTextarea = document.getElementById("listing-description");
    const originalText = descButton.innerHTML;

    // Show loading spinner
    descButton.innerHTML = `<span class="spinner"></span> Generating...`;
    descButton.disabled = true;

    try {
      const generated = await window.GeminiService.generateCropDescription({
        name, category, variety, quantity, unit, price, location, harvestDate
      });
      descTextarea.value = generated;
    } catch (err) {
      alert("Error generating description: " + err.message);
    } finally {
      descButton.innerHTML = originalText;
      descButton.disabled = false;
    }
  }

  // 2. AI Advisor: Dynamic Selling / Buying Recommendations
  populateAdvisorSelect() {
    const select = document.getElementById("advisor-crop-select");
    select.innerHTML = "";
    
    const isFarmer = this.currentRole === "Farmer";
    const crops = isFarmer
      ? this.listings.filter(c => c.farmerName === this.profile.name && c.status !== "Sold")
      : this.listings.filter(c => c.farmerName !== this.profile.name && c.status !== "Sold");

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
    document.getElementById("advisor-insights-empty").style.display = "flex";
    document.getElementById("advisor-insights-result").style.display = "none";
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
    btn.innerHTML = `<span class="spinner"></span> Analyzing...`;
    btn.disabled = true;
    
    const resultBox = document.getElementById("advisor-insights-result");
    const emptyBox = document.getElementById("advisor-insights-empty");
    
    emptyBox.style.display = "none";
    resultBox.style.display = "block";
    resultBox.innerHTML = `
      <div style="text-align:center; padding: 30px;">
        <div class="spinner spinner-primary" style="width: 32px; height: 32px; margin-bottom:12px;"></div>
        <p style="color:var(--color-text-medium);">${isFarmer ? 'AI is gathering local Mandi pricing index data & forecasting recommendations...' : 'AI is assessing seller pricing, quality factors, and transport logistics...'}</p>
      </div>
    `;

    try {
      const markdown = await window.GeminiService.getSellingSuggestions(crop, !isFarmer);
      // Basic markdown conversions
      resultBox.innerHTML = this.parseBasicMarkdown(markdown);
    } catch(err) {
      resultBox.innerHTML = `<p style="color:var(--color-danger); padding:16px;">Failed to generate AI insights: ${err.message}</p>`;
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }

  // 3. AI Chat Interface Q&A
  renderChatMessages() {
    const container = document.getElementById("chat-messages-container");
    container.innerHTML = "";

    this.chatHistory.forEach(msg => {
      const div = document.createElement("div");
      div.className = `chat-message ${msg.sender}`;
      div.innerHTML = this.parseBasicMarkdown(msg.text);
      container.appendChild(div);
    });

    // Auto scroll
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

    // Show loading indicators
    const container = document.getElementById("chat-messages-container");
    const loader = document.createElement("div");
    loader.className = "chat-message bot";
    loader.id = "chat-typing-loader";
    loader.innerHTML = `<span class="spinner spinner-primary"></span> HarvestLink AI is typing...`;
    container.appendChild(loader);
    container.scrollTop = container.scrollHeight;

    try {
      const reply = await window.GeminiService.askFarmingQuestion(text, this.chatHistory.slice(0, -1));
      
      // Remove loader & push bot reply
      const load = document.getElementById("chat-typing-loader");
      if (load) load.remove();
      
      this.chatHistory.push({ sender: "bot", text: reply });
      this.renderChatMessages();
    } catch(err) {
      const load = document.getElementById("chat-typing-loader");
      if (load) load.remove();
      
      this.chatHistory.push({ sender: "bot", text: `Error: Unable to reach Gemini. ${err.message}` });
      this.renderChatMessages();
    }
  }

  clearChatHistory() {
    this.chatHistory = [
      { sender: "bot", text: "Chat history cleared. How can I help you today with your farm crops, pest controls, or mandi market rates?" }
    ];
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
