import { auth, db } from '../firebase/firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updateProfile 
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { showToast } from '../components/toast.js';
import { initAuthUI, showAuthScreen, hideAuthScreen } from './auth-ui.js';
import { initUserCategories } from '../categories/category-service.js';
import { loadDashboardData } from '../dashboard/dashboard.js';

let currentUser = null;

export function initAuth() {
    initAuthUI();
    
    // Listen for auth state changes
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            console.log("User logged in:", user.email);
            hideAuthScreen();
            
            // Check if user profile exists in Firestore, if not create it
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    email: user.email,
                    displayName: user.displayName || 'User',
                    createdAt: Date.now(),
                    currency: 'INR',
                    balance: 0
                });
            }
            
            // Initialize defaults
            await initUserCategories(user.uid);
            
            // Load dashboard if on home
            if (window.location.hash === '' || window.location.hash === '#home') {
                const mainContent = document.getElementById('main-content');
                await loadDashboardData(mainContent);
            }
        } else {
            currentUser = null;
            console.log("User logged out");
            showAuthScreen();
        }
    });
}

export async function loginUser(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("Successfully logged in", "success");
    } catch (error) {
        console.error("Login Error:", error);
        showToast(error.message, "error");
        throw error; // Rethrow so UI can handle loading states
    }
}

export async function signupUser(email, password, name) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update display name
        await updateProfile(user, { displayName: name });
        
        showToast("Account created successfully", "success");
    } catch (error) {
        console.error("Signup Error:", error);
        showToast(error.message, "error");
        throw error;
    }
}

export async function logoutUser() {
    try {
        await signOut(auth);
        showToast("Logged out", "info");
    } catch (error) {
        console.error("Logout Error:", error);
        showToast("Failed to log out", "error");
    }
}

export function getCurrentUser() {
    return currentUser;
}
