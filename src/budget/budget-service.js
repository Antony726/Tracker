import { db } from '../firebase/firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// Fetch user budget settings
export async function getUserBudget(userId) {
    try {
        const budgetRef = doc(db, 'users', userId, 'settings', 'budget');
        const snap = await getDoc(budgetRef);
        if (snap.exists()) {
            return snap.data();
        } else {
            // Default budget if not set
            return {
                monthly: 50000,
                categories: {} // e.g. { 'Food': 10000, 'Shopping': 5000 }
            };
        }
    } catch (error) {
        console.error("Error fetching budget: ", error);
        return { monthly: 50000, categories: {} };
    }
}

// Save user budget settings
export async function saveUserBudget(userId, budgetData) {
    try {
        const budgetRef = doc(db, 'users', userId, 'settings', 'budget');
        await setDoc(budgetRef, budgetData, { merge: true });
    } catch (error) {
        console.error("Error saving budget: ", error);
        throw error;
    }
}
