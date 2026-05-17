import { db } from '../firebase/firebase-config.js';
import { collection, doc, setDoc, getDocs, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const DEFAULT_CATEGORIES = [
    { id: 'cat_food', name: 'Food', color: '#FF5252', icon: 'restaurant' },
    { id: 'cat_shopping', name: 'Shopping', color: '#FF4081', icon: 'shopping_bag' },
    { id: 'cat_bills', name: 'Bills', color: '#7C4DFF', icon: 'receipt_long' },
    { id: 'cat_entertainment', name: 'Entertainment', color: '#536DFE', icon: 'movie' },
    { id: 'cat_health', name: 'Health', color: '#00B0FF', icon: 'medical_services' },
    { id: 'cat_fuel', name: 'Fuel', color: '#00E676', icon: 'local_gas_station' },
    { id: 'cat_travel', name: 'Travel', color: '#FFD740', icon: 'flight' },
    { id: 'cat_education', name: 'Education', color: '#FFAB40', icon: 'school' },
    { id: 'cat_salary', name: 'Salary', color: '#4CAF50', icon: 'payments' }
];

// Initialize default categories for a new user if they don't have any
export async function initUserCategories(userId) {
    try {
        const userCatRef = doc(db, 'users', userId, 'settings', 'categories_initialized');
        const snap = await getDoc(userCatRef);
        
        if (!snap.exists()) {
            const catCollectionRef = collection(db, 'users', userId, 'categories');
            
            // Add all default categories
            for (const cat of DEFAULT_CATEGORIES) {
                await setDoc(doc(catCollectionRef, cat.id), cat);
            }
            
            // Mark as initialized
            await setDoc(userCatRef, { initialized: true, timestamp: Date.now() });
        }
    } catch (error) {
        console.error("Error initializing categories: ", error);
    }
}

// Get user categories
export async function getUserCategories(userId) {
    try {
        const catCollectionRef = collection(db, 'users', userId, 'categories');
        const snapshot = await getDocs(catCollectionRef);
        
        let categories = [];
        snapshot.forEach((doc) => {
            categories.push({ id: doc.id, ...doc.data() });
        });
        
        // Fallback if empty (e.g., initialization failed or delay)
        if (categories.length === 0) return DEFAULT_CATEGORIES;
        
        return categories.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error("Error fetching categories: ", error);
        return DEFAULT_CATEGORIES;
    }
}

// Add a custom category
export async function addCategory(userId, categoryData) {
    try {
        const catId = `cat_${Date.now()}`;
        const catRef = doc(db, 'users', userId, 'categories', catId);
        const data = { id: catId, ...categoryData };
        await setDoc(catRef, data);
        return data;
    } catch (error) {
        console.error("Error adding category: ", error);
        throw error;
    }
}

// Delete a category
export async function deleteCategory(userId, categoryId) {
    try {
        const catRef = doc(db, 'users', userId, 'categories', categoryId);
        await deleteDoc(catRef);
    } catch (error) {
        console.error("Error deleting category: ", error);
        throw error;
    }
}
