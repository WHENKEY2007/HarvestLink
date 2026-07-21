/**
 * HarvestLink AI - Google Authentication & Diagnostics Module
 * Encapsulates Firebase initialization, environment checks, error handling, and session management.
 */

window.HarvestLinkAuth = {
  initialized: false,
  auth: null,
  provider: null,
  currentUser: null,
  isSigningIn: false,

  // Diagnostics status
  diagnostics: {
    sdkLoaded: false,
    initialized: false,
    authInitialized: false,
    providerCreated: false,
    httpProtocol: false,
    popupSupported: false,
    authorizedDomain: true,
    internetConnection: true,
    logs: []
  },

  // State Change Listeners
  onStateChangedCallback: null,
  onNetworkChangedCallback: null,

  log(msg, isError = false) {
    const prefix = isError ? "❌" : "✓";
    const logStr = `${prefix} ${msg}`;
    console.log(`[HarvestLink Auth Diagnostics] ${logStr}`);
    this.diagnostics.logs.push(`${new Date().toLocaleTimeString()}: ${logStr}`);
  },

  /**
   * Initializes the Auth module, runs diagnostics, and registers hooks.
   */
  async init(onStateChanged, onNetworkChanged) {
    this.onStateChangedCallback = onStateChanged;
    this.onNetworkChangedCallback = onNetworkChanged;

    this.log("Starting authentication diagnostics...");

    // 1. Check Internet Connection
    this.diagnostics.internetConnection = navigator.onLine;
    this.log(`Internet Connection: ${this.diagnostics.internetConnection ? "Connected" : "Disconnected"}`);

    // Register network status listeners
    window.addEventListener("online", () => this.handleNetworkChange(true));
    window.addEventListener("offline", () => this.handleNetworkChange(false));

    // 2. Check Protocol
    const protocol = window.location.protocol;
    this.diagnostics.httpProtocol = (protocol === "http:" || protocol === "https:");
    this.log(`Protocol Check: '${protocol}' (HTTP/HTTPS supported: ${this.diagnostics.httpProtocol})`);

    if (!this.diagnostics.httpProtocol) {
      this.log("Running on file:// protocol. Firebase Auth cannot initialize.", true);
      this.triggerStateUpdate(null, null);
      return;
    }

    // 3. Check Firebase SDK Loaded
    this.diagnostics.sdkLoaded = (typeof firebase !== "undefined");
    this.log(`Firebase SDK Loaded: ${this.diagnostics.sdkLoaded}`);
    if (!this.diagnostics.sdkLoaded) {
      this.log("Firebase SDK script not loaded in index.html.", true);
      this.triggerStateUpdate(null, new Error("Firebase SDK is missing. Unable to initialize Google Authentication."));
      return;
    }

    // 4. Validate Firebase Config
    // For Firebase JS SDK v7.20.0 and later, measurementId is optional
    const firebaseConfig = {
      apiKey: "AIzaSyCQTbGXYqMBjoHEuo-mIgWV-rRyFTcW5G4",
      authDomain: "harvestlink-ai-a5e0d.firebaseapp.com",
      projectId: "harvestlink-ai-a5e0d",
      storageBucket: "harvestlink-ai-a5e0d.firebasestorage.app",
      messagingSenderId: "678383726867",
      appId: "1:678383726867:web:42d880b7f7497a3925eae6",
      measurementId: "G-W1W4LVV9K8"
    };

    if (!this.isConfigComplete(firebaseConfig)) {
      this.log("Firebase configuration is incomplete.", true);
      this.triggerStateUpdate(null, null);
      return;
    }

    // 5. Initialize Firebase
    try {
      if (firebase.apps.length === 0) {
        firebase.initializeApp(firebaseConfig);
      }
      this.diagnostics.initialized = true;
      this.log("Firebase initialized successfully.");
    } catch (err) {
      this.log(`Firebase initialization error: ${err.message}`, true);
      this.triggerStateUpdate(null, new Error(`Firebase initialization failed: ${err.message}`));
      return;
    }

    // 6. Initialize Auth
    try {
      this.auth = firebase.auth();
      this.diagnostics.authInitialized = true;
      this.log("Authentication service initialized successfully.");
    } catch (err) {
      this.log(`Auth service initialization error: ${err.message}`, true);
      this.triggerStateUpdate(null, new Error(`Auth initialization failed: ${err.message}`));
      return;
    }

    // 7. Set Auth Persistence
    try {
      await this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      this.log("Auth session persistence set to LOCAL.");
    } catch (err) {
      this.log(`Set persistence error: ${err.message}`, true);
    }

    // 8. Create Google Provider
    try {
      this.provider = new firebase.auth.GoogleAuthProvider();
      this.provider.addScope("profile");
      this.provider.addScope("email");
      this.diagnostics.providerCreated = true;
      this.log("Google Auth Provider created.");
    } catch (err) {
      this.log(`Provider creation error: ${err.message}`, true);
    }

    // 9. Browser Popup Support Check
    const userAgent = navigator.userAgent.toLowerCase();
    this.diagnostics.popupSupported = !userAgent.includes("webview") && !userAgent.includes("fb_iab") && !userAgent.includes("instagram");
    this.log(`Browser Supports Popup: ${this.diagnostics.popupSupported}`);

    // Register active user listener
    this.auth.onAuthStateChanged(
      (user) => {
        if (user) {
          this.currentUser = {
            uid: user.uid,
            displayName: user.displayName || "Google User",
            email: user.email,
            photoURL: user.photoURL || ""
          };
          this.log(`User logged in: ${this.currentUser.email}`);
          this.triggerStateUpdate(this.currentUser, null);
        } else {
          this.currentUser = null;
          this.log("No authenticated session active.");
          this.triggerStateUpdate(null, null);
        }
      },
      (error) => {
        this.log(`Auth state listener error: ${error.message}`, true);
        this.triggerStateUpdate(null, error);
      }
    );

    this.initialized = true;
    this.log("Authentication diagnostics complete.");
  },

  /**
   * Helper to inspect if firebaseConfig keys contain required attributes.
   */
  isConfigComplete(config) {
    if (!config) return false;
    const requiredKeys = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"];
    for (const key of requiredKeys) {
      if (!config[key] || config[key].trim() === "") {
        return false;
      }
    }
    // Check if configuration relies on dummy keys
    if (config.apiKey === "AIzaSyDummyKeyForHarvestLinkHackathon" || config.appId.includes("1234567890")) {
      return false;
    }
    return true;
  },

  /**
   * Fires state updates to registered observer.
   */
  triggerStateUpdate(user, error) {
    if (this.onStateChangedCallback) {
      this.onStateChangedCallback(user, error ? this.translateError(error) : null);
    }
  },

  /**
   * Tracks browser connection changes.
   */
  handleNetworkChange(isOnline) {
    this.diagnostics.internetConnection = isOnline;
    this.log(`Network status changed: ${isOnline ? "Online" : "Offline"}`);
    if (this.onNetworkChangedCallback) {
      this.onNetworkChangedCallback(isOnline);
    }
  },

  /**
   * Connects to Firebase Google Sign In Popup.
   */
  async signInWithGoogle() {
    if (!this.auth || !this.provider) {
      throw new Error("Authentication provider is not initialized. Please use Demo Mode.");
    }
    if (!navigator.onLine) {
      throw new Error("Internet connection required for Google Authentication.");
    }
    if (this.isSigningIn) {
      throw new Error("Sign-in popup is already active. Please finish the current request.");
    }

    this.isSigningIn = true;
    this.log("Opening Google Sign-In Popup...");

    try {
      const result = await this.auth.signInWithPopup(this.provider);
      const user = result.user;
      this.currentUser = {
        uid: user.uid,
        displayName: user.displayName || "Google User",
        email: user.email,
        photoURL: user.photoURL || ""
      };
      this.log(`Successfully authenticated user: ${this.currentUser.email}`);
      return this.currentUser;
    } catch (error) {
      this.log(`Sign-In error: ${error.code} - ${error.message}`, true);
      if (error.code === "auth/unauthorized-domain") {
        this.diagnostics.authorizedDomain = false;
      }
      throw new Error(this.translateError(error));
    } finally {
      this.isSigningIn = false;
    }
  },

  /**
   * Clean Sign-Out wrapper.
   */
  async signOut() {
    if (this.auth) {
      await this.auth.signOut();
    }
    this.currentUser = null;
    this.log("Signed out successfully.");
  },

  /**
   * Translates internal Firebase exceptions to friendly messages.
   */
  translateError(error) {
    if (!error) return "Authentication failed.";
    const code = error.code || "";

    switch (code) {
      case "auth/unauthorized-domain":
        return "This domain is not authorized in Firebase Console.\nPlease add this domain under Authentication → Authorized Domains.";
      case "auth/popup-closed-by-user":
        return "Sign-in popup was closed before completion. Please try again.";
      case "auth/popup-blocked":
        return "Popup blocked by browser. Please allow popups for this site.";
      case "auth/cancelled-popup-request":
        return "Login request was cancelled.";
      case "auth/network-request-failed":
        return "Network connection error. Please check your internet connection.";
      case "auth/operation-not-allowed":
        return "Google authentication is not enabled in Firebase Console. Please enable it in Authentication → Sign-in method.";
      case "auth/configuration-not-found":
        return "Google Sign-In configuration was not found. Please ensure that Google Sign-In is enabled in the Firebase Console (Authentication → Sign-in method).";
      case "auth/quota-exceeded":
        return "Firebase authentication quota exceeded. Please try again later.";
      case "auth/user-disabled":
        return "This user account has been disabled.";
      case "auth/internal-error":
        return "Internal authentication error. Please try again.";
      default:
        return error.message || "An authentication error occurred. Please try again.";
    }
  }
};
