import { getRecentTransactions, deleteTransaction } from '../transactions/transaction-service.js';
import { getCurrentUser } from '../auth/auth-service.js';
import { formatCurrency, formatDate } from '../utils/dom.js';
import { animateCounter } from '../animations/gsap-setup.js';
import { openViewTransactionsSheet } from '../transactions/view-transactions.js';
import { showToast } from '../components/toast.js';

export async function loadDashboardData(container) {
    const user = getCurrentUser();
    if (!user) return;
    
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
    let txHtml = recentTx.length > 0 ? recentTx.map(tx => {
        const isIncome = tx.type === 'income';
        const displayTitle = tx.shopName ? `${tx.category || 'General'} • ${tx.shopName}` : (tx.category || 'General');
        
        return `
            <div class="dashboard-tx-row" data-id="${tx.id}" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid var(--border-light); padding-bottom: 8px; transition: all 0.2s;">
                <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--bg-card); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <span class="material-symbols-rounded" style="color: ${isIncome ? 'var(--income)' : (tx.expenseMode === 'external' ? 'var(--external)' : 'var(--expense)')}">${isIncome ? 'arrow_downward' : 'arrow_upward'}</span>
                    </div>
                    <div style="min-width: 0; flex: 1;">
                        <h4 style="margin:0; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayTitle}</h4>
                        <span class="text-muted" style="font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${formatDate(tx.timestamp)} ${tx.expenseMode === 'external' ? '• Shared' : ''}</span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; margin-left: 8px; flex-shrink: 0;">
                    <div style="text-align: right;">
                        <h4 class="${isIncome ? 'text-income' : (tx.expenseMode === 'external' ? 'text-external' : 'text-expense')}" style="margin:0;">
                            ${isIncome ? '+' : '-'}${formatCurrency(tx.amount)}
                        </h4>
                    </div>
                    
                    <!-- Direct Delete button -->
                    <button class="dash-delete-btn" data-id="${tx.id}" style="background: transparent; border: none; padding: 4px; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 6px; transition: all 0.2s;">
                        <span class="material-symbols-rounded" style="font-size: 18px;">delete</span>
                    </button>
                </div>
            </div>
        `;
    }).join('') : '<p class="text-muted">No recent transactions</p>';

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
            <div id="recent-activity-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md); cursor: pointer; user-select: none;">
                <h3>Recent Activity</h3>
                <span class="material-symbols-rounded text-muted" style="font-size: 18px; transition: transform 0.2s;">arrow_forward</span>
            </div>
            <div>
                ${txHtml}
            </div>
        </div>
    `;

    // Setup Recent Activity header navigation click
    const recentActivityHeader = document.getElementById('recent-activity-header');
    if (recentActivityHeader) {
        recentActivityHeader.addEventListener('click', () => {
            openViewTransactionsSheet();
        });
        
        const arrow = recentActivityHeader.querySelector('.material-symbols-rounded');
        recentActivityHeader.addEventListener('mouseenter', () => {
            if (arrow) arrow.style.transform = 'translateX(4px)';
        });
        recentActivityHeader.addEventListener('mouseleave', () => {
            if (arrow) arrow.style.transform = 'translateX(0px)';
        });
    }

    // Setup direct delete button listeners
    const deleteBtns = container.querySelectorAll('.dash-delete-btn');
    deleteBtns.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            btn.style.color = 'var(--expense)';
            btn.style.background = 'rgba(255,82,82,0.1)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.color = 'var(--text-muted)';
            btn.style.background = 'transparent';
        });
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const txId = btn.dataset.id;
            const confirmed = confirm("Are you sure you want to delete this transaction?");
            if (!confirmed) return;

            const user = getCurrentUser();
            if (!user) return;

            // Animate row removal if GSAP is loaded
            const row = container.querySelector(`.dashboard-tx-row[data-id="${txId}"]`);
            if (row && window.gsap) {
                gsap.to(row, {
                    x: -30, opacity: 0, duration: 0.2, onComplete: async () => {
                        await performDelete(user.uid, txId);
                    }
                });
            } else {
                await performDelete(user.uid, txId);
            }
        });
    });

    async function performDelete(uid, txId) {
        try {
            await deleteTransaction(uid, txId);
            showToast("Transaction deleted", "success");
            // Re-load the dashboard to recompute balance and refresh dashboard counters
            await loadDashboardData(container);
        } catch (error) {
            showToast("Failed to delete transaction", "error");
        }
    }

    // Animate numbers
    setTimeout(() => {
        animateCounter(document.getElementById('dash-balance'), balance);
        animateCounter(document.getElementById('dash-income'), income, 1);
        animateCounter(document.getElementById('dash-my-expense'), myExpense, 1);
        animateCounter(document.getElementById('dash-total-expense'), totalExpense, 1);
    }, 100);
}
