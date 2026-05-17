import { loginUser, signupUser } from './auth-service.js';

export function initAuthUI() {
    const authContainer = document.getElementById('auth-container');
    if (!authContainer) return;
    
    // Build Auth Forms HTML
    authContainer.innerHTML = `
        <div class="auth-box glass-card">
            <h2 class="text-gradient text-center" style="margin-bottom: 8px;">Expence</h2>
            <p class="text-muted text-center" style="margin-bottom: var(--spacing-xl);">Premium Finance Tracking</p>
            
            <!-- Login Form -->
            <form id="login-form" class="auth-form">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="login-email" required placeholder="name@example.com" class="glass-input">
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="login-password" required placeholder="••••••••" class="glass-input">
                </div>
                <button type="submit" class="btn btn-primary" id="login-btn">Log In</button>
                <p class="auth-switch text-center text-muted">Don't have an account? <a href="#" id="to-signup">Sign Up</a></p>
            </form>

            <!-- Signup Form (Hidden by default) -->
            <form id="signup-form" class="auth-form hidden">
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" id="signup-name" required placeholder="John Doe" class="glass-input">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="signup-email" required placeholder="name@example.com" class="glass-input">
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="signup-password" required placeholder="••••••••" class="glass-input">
                </div>
                <button type="submit" class="btn btn-primary" id="signup-btn">Create Account</button>
                <p class="auth-switch text-center text-muted">Already have an account? <a href="#" id="to-login">Log In</a></p>
            </form>
        </div>
    `;

    // Toggle logic
    document.getElementById('to-signup').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('signup-form').classList.remove('hidden');
        if(window.gsap) gsap.fromTo('#signup-form', {opacity: 0, x: 20}, {opacity: 1, x: 0, duration: 0.3});
    });

    document.getElementById('to-login').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('signup-form').classList.add('hidden');
        document.getElementById('login-form').classList.remove('hidden');
        if(window.gsap) gsap.fromTo('#login-form', {opacity: 0, x: -20}, {opacity: 1, x: 0, duration: 0.3});
    });

    // Form Submissions
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        const btn = document.getElementById('login-btn');
        const originalText = btn.innerText;
        btn.innerText = "Logging in...";
        btn.disabled = true;
        
        try {
            await loginUser(email, pass);
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });

    document.getElementById('signup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const pass = document.getElementById('signup-password').value;
        const btn = document.getElementById('signup-btn');
        
        const originalText = btn.innerText;
        btn.innerText = "Creating account...";
        btn.disabled = true;
        
        try {
            await signupUser(email, pass, name);
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });
}

export function showAuthScreen() {
    const authContainer = document.getElementById('auth-container');
    authContainer.classList.remove('hidden');
    if(window.gsap) {
        gsap.fromTo(authContainer, {opacity: 0}, {opacity: 1, duration: 0.5});
    }
}

export function hideAuthScreen() {
    const authContainer = document.getElementById('auth-container');
    if(window.gsap) {
        gsap.to(authContainer, {opacity: 0, duration: 0.5, onComplete: () => {
            authContainer.classList.add('hidden');
        }});
    } else {
        authContainer.classList.add('hidden');
    }
}
