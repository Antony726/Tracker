import { db } from '../firebase/firebase-config.js';
import { collection, doc, setDoc, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

export async function getSubscriptions(userId) {
    try {
        const subRef = collection(db, 'users', userId, 'subscriptions');
        const snapshot = await getDocs(subRef);
        let subs = [];
        snapshot.forEach(doc => {
            subs.push({ id: doc.id, ...doc.data() });
        });
        return subs.sort((a, b) => a.renewalDate - b.renewalDate);
    } catch (error) {
        console.error("Error fetching subscriptions:", error);
        return [];
    }
}

export async function addSubscription(userId, subData) {
    try {
        const subId = `sub_${Date.now()}`;
        const subRef = doc(db, 'users', userId, 'subscriptions', subId);
        const data = { id: subId, ...subData };
        await setDoc(subRef, data);
        return data;
    } catch (error) {
        console.error("Error adding subscription:", error);
        throw error;
    }
}

export async function deleteSubscription(userId, subId) {
    try {
        const subRef = doc(db, 'users', userId, 'subscriptions', subId);
        await deleteDoc(subRef);
    } catch (error) {
        console.error("Error deleting subscription:", error);
        throw error;
    }
}
