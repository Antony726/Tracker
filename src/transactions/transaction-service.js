import { db } from '../firebase/firebase-config.js';
import { collection, addDoc, getDocs, query, orderBy, where, serverTimestamp, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// Save a new transaction
export async function addTransaction(userId, transactionData) {
    try {
        const txRef = collection(db, 'users', userId, 'transactions');
        const docRef = await addDoc(txRef, {
            ...transactionData,
            timestamp: transactionData.timestamp || Date.now(),
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error adding transaction: ", error);
        throw error;
    }
}

// Get recent transactions
export async function getRecentTransactions(userId, limitNum = 10) {
    try {
        const txRef = collection(db, 'users', userId, 'transactions');
        // Simple query without complex indexes for now
        const q = query(txRef, orderBy('timestamp', 'desc')); 
        const querySnapshot = await getDocs(q);
        
        let transactions = [];
        querySnapshot.forEach((doc) => {
            transactions.push({ id: doc.id, ...doc.data() });
        });
        return transactions.slice(0, limitNum); // Slice to limit since we didn't add limit() to avoid index requirement for now
    } catch (error) {
        console.error("Error getting transactions: ", error);
        throw error;
    }
}

// Get transactions by date range
export async function getTransactionsByDate(userId, startDate, endDate) {
    try {
        const txRef = collection(db, 'users', userId, 'transactions');
        const q = query(
            txRef, 
            where('timestamp', '>=', startDate),
            where('timestamp', '<=', endDate),
            orderBy('timestamp', 'desc')
        );
        const querySnapshot = await getDocs(q);
        
        let transactions = [];
        querySnapshot.forEach((doc) => {
            transactions.push({ id: doc.id, ...doc.data() });
        });
        return transactions;
    } catch (error) {
        console.error("Error getting transactions by date: ", error);
        throw error;
    }
}

// Delete a transaction
export async function deleteTransaction(userId, transactionId) {
    try {
        const txRef = doc(db, 'users', userId, 'transactions', transactionId);
        await deleteDoc(txRef);
    } catch (error) {
        console.error("Error deleting transaction: ", error);
        throw error;
    }
}
