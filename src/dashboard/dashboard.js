import { getRecentTransactions } from '../transactions/transaction-service.js';
import { getCurrentUser } from '../auth/auth-service.js';
import { formatCurrency, formatDate } from '../utils/dom.js';
import { animateCounter } from '../animations/gsap-setup.js';

export async function loadDashboardData(container) {
    const user = getCurrentUser();
    if (!user) return;
    
    // Skeleton loading state (already rendered by router ideally, but let's re-render dynamic parts)
    
    try {
        const transactions = await getRecentTransactions(user.uid, 50); // get last 50 for balance calc
        
        let totalIncome = 0;
        let myExpense = 0;
        let totalExpense = 0; // My Expense + External
        
        transactions.forEach(tx => {
            const amount = parseFloat(tx.amount) || 0;
            if (tx.type === 'income') {
                totalIncome += amount;
            } else if (tx.type === 'expense') {
                totalExpense += amount;
                if (tx.expenseMode === 'personal') {
                    myExpense += amount;
                }
            }
        });
        
        const remainingBalance = totalIncome - myExpense;
        
        // Update UI
        renderDashboardUI(container, remainingBalance, totalIncome, myExpense, totalExpense, transactions.slice(0, 5));
        
    } catch (error) {
        console.error("Dashboard error:", error);
        container.innerHTML = `<p class="text-error">Failed to load dashboard data.</p>`;
    }
}

function renderDashboardUI(container, balance, income, myExpense, totalExpense, recentTx) {
    let txHtml = recentTx.length > 0 ? recentTx.map(tx => `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid var(--border-light); padding-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--bg-card); display: flex; align-items: center; justify-content: center;">
                    <span class="material-symbols-rounded" style="color: ${tx.type === 'income' ? 'var(--income)' : (tx.expenseMode === 'external' ? 'var(--external)' : 'var(--expense)')}">${tx.type === 'income' ? 'arrow_downward' : 'arrow_upward'}</span>
                </div>
                <div>
                    <h4 style="margin:0; font-size: 1rem;">${tx.category || 'General'}</h4>
                    <span class="text-muted" style="font-size: 0.75rem;">${formatDate(tx.timestamp)} ${tx.expenseMode === 'external' ? '• Shared' : ''}</span>
                </div>
            </div>
            <div style="text-align: right;">
                <h4 class="${tx.type === 'income' ? 'text-income' : (tx.expenseMode === 'external' ? 'text-external' : 'text-expense')}" style="margin:0;">
                    ${tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}
                </h4>
            </div>
        </div>
    `).join('') : '<p class="text-muted">No recent transactions</p>';

    container.innerHTML = `
        <div class="glass-card" style="margin-bottom: var(--spacing-md); text-align: center;">
            <p class="text-muted" style="margin-bottom: 4px;">Remaining Balance</p>
            <h1 class="text-gradient" id="dash-balance" style="font-size: 2.5rem;">${formatCurrency(0)}</h1>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-sm); margin-bottom: var(--spacing-md);">
            <div class="glass-card" style="padding: var(--spacing-sm);">
                <p class="text-muted" style="font-size: 0.8rem;">Total Income</p>
                <h3 class="text-income" id="dash-income">${formatCurrency(0)}</h3>
            </div>
            <div class="glass-card" style="padding: var(--spacing-sm);">
                <p class="text-muted" style="font-size: 0.8rem;">My Expense</p>
                <h3 class="text-expense" id="dash-my-expense">${formatCurrency(0)}</h3>
            </div>
        </div>

        <div class="glass-card" style="margin-bottom: var(--spacing-md); border-color: rgba(255,193,7,0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <p class="text-muted" style="font-size: 0.8rem;">Total Expense (Inc. Shared)</p>
                    <h3 class="text-external" id="dash-total-expense">${formatCurrency(0)}</h3>
                </div>
                <span class="material-symbols-rounded text-external">group</span>
            </div>
        </div>

        <div class="glass-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md);">
                <h3>Recent Activity</h3>
                <span class="material-symbols-rounded text-muted" style="font-size: 18px;">arrow_forward</span>
            </div>
            <div>
                ${txHtml}
            </div>
        </div>
    `;

    // Animate numbers
    setTimeout(() => {
        animateCounter(document.getElementById('dash-balance'), balance);
        animateCounter(document.getElementById('dash-income'), income, 1);
        animateCounter(document.getElementById('dash-my-expense'), myExpense, 1);
        animateCounter(document.getElementById('dash-total-expense'), totalExpense, 1);
    }, 100);
}
