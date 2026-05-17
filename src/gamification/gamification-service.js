import { getRecentTransactions } from '../transactions/transaction-service.js';

export async function evaluateAchievements(userId) {
    const transactions = await getRecentTransactions(userId, 100);
    const achievements = [];

    // 1. First Log
    if (transactions.length >= 1) {
        achievements.push({
            id: 'first_log',
            title: 'First Step',
            desc: 'Logged your first expense.',
            icon: 'emoji_events',
            color: '#FFD740'
        });
    }

    // 2. 10 Expenses
    if (transactions.length >= 10) {
        achievements.push({
            id: 'ten_expenses',
            title: 'Habit Builder',
            desc: 'Logged 10 expenses.',
            icon: 'military_tech',
            color: '#00E676'
        });
    }

    // 3. 50 Expenses
    if (transactions.length >= 50) {
        achievements.push({
            id: 'fifty_expenses',
            title: 'Power Tracker',
            desc: 'Logged 50 expenses.',
            icon: 'workspace_premium',
            color: '#00B0FF'
        });
    }

    // 4. Savings (Income > Expense logic mock)
    let totalIncome = 0;
    let totalExpense = 0;
    transactions.forEach(tx => {
        if (tx.type === 'income') totalIncome += parseFloat(tx.amount);
        if (tx.type === 'expense') totalExpense += parseFloat(tx.amount);
    });

    if (totalIncome > 0 && (totalIncome - totalExpense) >= 10000) {
        achievements.push({
            id: 'super_saver',
            title: 'Super Saver',
            desc: 'Saved over ₹10,000.',
            icon: 'savings',
            color: '#7C4DFF'
        });
    }

    return achievements;
}
