// API Configuration - auto-detect production vs development
const API_BASE_URL = (() => {
    const hostname = window.location.hostname;
    // Production domains
    if (hostname === 'personalabai.com' || hostname === 'www.personalabai.com') {
        return 'https://personalabai.com/api';
    }
    if (hostname.includes('onrender.com')) {
        return `https://${hostname}/api`;
    }
    // Development
    return 'http://localhost:3005/api';
})();

// Auth State Management
let authState = {
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null
};

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    console.log('API Base URL:', API_BASE_URL);

    // Check for OAuth callback (tokens in URL hash)
    if (window.location.hash && window.location.hash.includes('access_token')) {
        handleOAuthCallback();
        return;
    }

    // Check for OAuth error in query params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('error')) {
        const errorMessage = urlParams.get('message') || 'Authentication failed';
        console.error('OAuth error:', errorMessage);
        // Show error after modal is ready
        setTimeout(() => {
            showLogin();
            showAuthError(errorMessage);
        }, 100);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }

    // Check if we're on the dashboard page
    if (window.location.pathname.includes('dashboard.html')) {
        checkAuthentication();
    } else {
        // We're on the landing page
        initializeLandingPage();
    }
});

// Initialize landing page
function initializeLandingPage() {
    console.log('Initializing landing page...');

    // Set up auth form handlers
    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', handleAuthSubmit);
    }

    // Set up auth switcher
    const authSwitchBtn = document.getElementById('authSwitchBtn');
    if (authSwitchBtn) {
        authSwitchBtn.addEventListener('click', toggleAuthMode);
    }

    // Check if user is already logged in
    const token = localStorage.getItem('accessToken');
    if (token) {
        // Redirect to dashboard if already logged in
        window.location.href = 'dashboard.html';
    }
}

// Authentication check for dashboard
async function checkAuthentication() {
    console.log('Checking authentication...');

    const token = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (!token) {
        console.log('No access token found, redirecting to login...');
        window.location.href = 'index.html';
        return;
    }

    try {
        // Validate token by making a test API call
        const response = await fetch(`${API_BASE_URL}/billing/subscription`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const subscription = await response.json();
            authState.isAuthenticated = true;
            authState.accessToken = token;
            authState.refreshToken = refreshToken;

            // Get user info from JWT
            const userInfo = parseJWT(token);
            authState.user = userInfo;

            console.log('Authentication successful:', userInfo);
            initializeDashboard(subscription);
        } else if (response.status === 401 && refreshToken) {
            // Try to refresh token
            console.log('Access token expired, attempting to refresh...');
            await refreshAccessToken();
        } else {
            throw new Error('Authentication failed');
        }
    } catch (error) {
        console.error('Authentication check failed:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = 'index.html';
    }
}

// Parse JWT token
function parseJWT(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error parsing JWT:', error);
        return null;
    }
}

// Refresh access token
async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
        throw new Error('No refresh token available');
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refreshToken })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('accessToken', data.accessToken);
            authState.accessToken = data.accessToken;

            // Retry dashboard initialization
            checkAuthentication();
        } else {
            throw new Error('Token refresh failed');
        }
    } catch (error) {
        console.error('Token refresh failed:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = 'index.html';
    }
}

// Show auth modals
function showLogin() {
    setAuthMode('login');
    document.getElementById('authModal').classList.remove('hidden');
    document.getElementById('authModal').classList.add('flex');
}

function showSignup() {
    setAuthMode('signup');
    document.getElementById('authModal').classList.remove('hidden');
    document.getElementById('authModal').classList.add('flex');
}

function closeModal() {
    document.getElementById('authModal').classList.add('hidden');
    document.getElementById('authModal').classList.remove('flex');
    clearAuthErrors();
}

// Set authentication mode
function setAuthMode(mode) {
    const isLogin = mode === 'login';

    // Update UI elements
    document.getElementById('authTitle').textContent = isLogin ? 'Sign In' : 'Create Account';
    document.getElementById('authSubtitle').textContent = isLogin ? 'Welcome back to PersonaLab Pro' : 'Join PersonaLab Pro today';
    document.getElementById('authSubmitBtn').textContent = isLogin ? 'Sign In' : 'Create Account';
    document.getElementById('authSwitchText').textContent = isLogin ? "Don't have an account?" : "Already have an account?";
    document.getElementById('authSwitchBtn').textContent = isLogin ? 'Sign up' : 'Sign in';

    // Show/hide form sections
    document.getElementById('loginForm').classList.toggle('hidden', !isLogin);
    document.getElementById('signupForm').classList.toggle('hidden', isLogin);

    // Clear form
    document.getElementById('authForm').reset();
    clearAuthErrors();
}

function toggleAuthMode() {
    const loginForm = document.getElementById('loginForm');
    const isCurrentlyLogin = !loginForm.classList.contains('hidden');
    setAuthMode(isCurrentlyLogin ? 'signup' : 'login');
}

// Handle auth form submission
async function handleAuthSubmit(event) {
    event.preventDefault();
    clearAuthErrors();

    const loginForm = document.getElementById('loginForm');
    const isLogin = !loginForm.classList.contains('hidden');

    const submitBtn = document.getElementById('authSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = isLogin ? 'Signing In...' : 'Creating Account...';

    try {
        if (isLogin) {
            await handleLogin();
        } else {
            await handleSignup();
        }
    } catch (error) {
        console.error('Auth error:', error);
        showAuthError(error.message || 'An error occurred. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = isLogin ? 'Sign In' : 'Create Account';
    }
}

// Handle login
async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    console.log('Attempting login for:', email);

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
        console.log('Login successful:', data);

        // Store tokens
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        // Update auth state
        authState.isAuthenticated = true;
        authState.user = data.user;
        authState.accessToken = data.accessToken;
        authState.refreshToken = data.refreshToken;

        showAuthSuccess('Login successful! Redirecting...');

        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);

    } else {
        throw new Error(data.error || 'Login failed');
    }
}

// Handle signup
async function handleSignup() {
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const company = document.getElementById('company').value;

    console.log('Attempting signup for:', email);

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            firstName,
            lastName,
            email,
            password,
            company: company || undefined
        })
    });

    const data = await response.json();

    if (response.ok) {
        console.log('Signup successful:', data);

        // Store tokens
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        // Update auth state
        authState.isAuthenticated = true;
        authState.user = data.user;
        authState.accessToken = data.accessToken;
        authState.refreshToken = data.refreshToken;

        showAuthSuccess('Account created successfully! Redirecting...');

        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);

    } else {
        throw new Error(data.error || 'Signup failed');
    }
}

// Show auth error
function showAuthError(message) {
    const errorDiv = document.getElementById('authError');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');

    // Hide success message if shown
    document.getElementById('authSuccess').classList.add('hidden');
}

// Show auth success
function showAuthSuccess(message) {
    const successDiv = document.getElementById('authSuccess');
    successDiv.textContent = message;
    successDiv.classList.remove('hidden');

    // Hide error message if shown
    document.getElementById('authError').classList.add('hidden');
}

// Clear auth errors
function clearAuthErrors() {
    document.getElementById('authError').classList.add('hidden');
    document.getElementById('authSuccess').classList.add('hidden');
}

// Logout
function logout() {
    console.log('Logging out...');

    // Clear local storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');

    // Reset auth state
    authState = {
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null
    };

    // Redirect to landing page
    window.location.href = 'index.html';
}

// API helper function with authentication
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('accessToken');

    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        },
        ...options
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        if (response.status === 401) {
            // Token expired, try to refresh
            await refreshAccessToken();
            // Retry the request with new token
            config.headers['Authorization'] = `Bearer ${localStorage.getItem('accessToken')}`;
            return await fetch(`${API_BASE_URL}${endpoint}`, config);
        }

        return response;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// ============================================
// Google OAuth Functions
// ============================================

// Handle Google sign-in button click
function handleGoogleSignIn() {
    console.log('Initiating Google OAuth...');

    // Get the API base URL without /api suffix
    const apiBase = API_BASE_URL.replace(/\/api$/, '');

    // Build redirect URL (current origin)
    const redirectUrl = encodeURIComponent(window.location.origin);

    // Redirect to backend OAuth endpoint
    window.location.href = `${apiBase}/api/auth/google?redirect=${redirectUrl}`;
}

// Handle OAuth callback (tokens in URL hash)
function handleOAuthCallback() {
    console.log('Processing OAuth callback...');

    // Parse tokens from URL hash
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
        console.log('OAuth tokens received, storing...');

        // Store tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);

        // Update auth state
        authState.isAuthenticated = true;
        authState.accessToken = accessToken;
        authState.refreshToken = refreshToken;

        // Parse user info from JWT
        const userInfo = parseJWT(accessToken);
        authState.user = userInfo;

        console.log('OAuth login successful:', userInfo);

        // Clean URL (remove hash)
        window.history.replaceState({}, document.title, window.location.pathname);

        // Redirect to dashboard
        window.location.href = 'dashboard.html';
    } else {
        console.error('No tokens in OAuth callback');
        showAuthError('Authentication failed - no tokens received');

        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Export for use in other scripts
window.authState = authState;
window.apiRequest = apiRequest;
window.logout = logout;
window.handleGoogleSignIn = handleGoogleSignIn;