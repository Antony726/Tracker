import { getRecentTransactions, deleteTransaction } from '../transactions/transaction-service.js';
import { getCurrentUser } from '../auth/auth-service.js';
import { formatCurrency, formatDate } from '../utils/dom.js';
import { animateCounter } from '../animations/gsap-setup.js';
import { openViewTransactionsSheet } from '../transactions/view-transactions.js';
import { showToast } from '../components/toast.js';
import { updateHeaderStats } from '../utils/header.js';

export async function loadDashboardData(container) {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        // Fetch last 150 transactions for robust filtering
        const transactions = await getRecentTransactions(user.uid, 150);
        renderDashboardUI(container, transactions);
    } catch (error) {
        console.error("Dashboard error:", error);
        container.innerHTML = `<p class="text-error">Failed to load dashboard data.</p>`;
    }
}

function renderDashboardUI(container, allTransactions) {
    // Basic structure containing switcher shell and container divs for live updating
    container.innerHTML = `
        <!-- Home Screen Period Switcher Segmented Control -->
        <div style="display: flex; background: rgba(255,255,255,0.05); border: 1px solid var(--border-light); border-radius: 12px; padding: 4px; margin-bottom: var(--spacing-md);">
            <button class="btn period-btn active" data-period="all" style="flex: 1; padding: 8px; border-radius: 8px; font-size: 0.85rem; background: var(--primary); color: white; border: none; font-weight: 600; font-family: var(--font-family); cursor: pointer; transition: all 0.2s;">All Time</button>
            <button class="btn period-btn" data-period="30" style="flex: 1; padding: 8px; border-radius: 8px; font-size: 0.85rem; background: transparent; color: var(--text-muted); border: none; font-weight: 500; font-family: var(--font-family); cursor: pointer; transition: all 0.2s;">30 Days</button>
            <button class="btn period-btn" data-period="1" style="flex: 1; padding: 8px; border-radius: 8px; font-size: 0.85rem; background: transparent; color: var(--text-muted); border: none; font-weight: 500; font-family: var(--font-family); cursor: pointer; transition: all 0.2s;">Today</button>
        </div>

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
            <div id="dash-tx-container">
                <!-- Transaction rows injected dynamically -->
            </div>
        </div>
    `;

    let activePeriod = 'all';

    function updateDashboard() {
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const endOfToday = startOfToday + (24 * 60 * 60 * 1000) - 1;
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

        // Filter transactions
        const filteredTx = allTransactions.filter(tx => {
            const txTime = tx.timestamp || Date.now();
            if (activePeriod === '1') {
                return txTime >= startOfToday && txTime <= endOfToday;
            } else if (activePeriod === '30') {
                return txTime >= thirtyDaysAgo;
            }
            return true; // all time
        });

        // Compute metrics
        let totalIncome = 0;
        let myExpense = 0;
        let totalExpense = 0; // My Expense + Shared/External

        filteredTx.forEach(tx => {
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

        // Animate counter elements
        animateCounter(document.getElementById('dash-balance'), remainingBalance);
        animateCounter(document.getElementById('dash-income'), totalIncome, 1);
        animateCounter(document.getElementById('dash-my-expense'), myExpense, 1);
        animateCounter(document.getElementById('dash-total-expense'), totalExpense, 1);

        // Render Recent Activity (up to 5 items)
        const recentTxSummary = filteredTx.slice(0, 5);
        const txContainer = document.getElementById('dash-tx-container');
        
        if (recentTxSummary.length === 0) {
            txContainer.innerHTML = `<p class="text-muted" style="text-align: center; padding: 12px 0; margin:0;">No transactions for this period</p>`;
            return;
        }

        txContainer.innerHTML = recentTxSummary.map(tx => {
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
        }).join('');

        // Bind delete action listeners to dashboard rows
        const deleteBtns = txContainer.querySelectorAll('.dash-delete-btn');
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

                const row = txContainer.querySelector(`.dashboard-tx-row[data-id="${txId}"]`);
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
    }

    async function performDelete(uid, txId) {
        try {
            await deleteTransaction(uid, txId);
            showToast("Transaction deleted", "success");
            
            // Refresh persistent header quick stats
            updateHeaderStats();
            
            // Re-load the dashboard memory and update the UI
            allTransactions = await getRecentTransactions(uid, 150);
            updateDashboard();
        } catch (error) {
            showToast("Failed to delete transaction", "error");
        }
    }

    // Set up click listeners for period switcher buttons
    const periodBtns = container.querySelectorAll('.period-btn');
    periodBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            periodBtns.forEach(b => {
                b.style.background = 'transparent';
                b.style.color = 'var(--text-muted)';
                b.style.fontWeight = '500';
                b.classList.remove('active');
            });
            
            const target = e.currentTarget;
            target.style.background = 'var(--primary)';
            target.style.color = 'white';
            target.style.fontWeight = '600';
            target.classList.add('active');

            activePeriod = target.dataset.period;
            updateDashboard();
        });
    });

    // Set up Recent Activity header navigation click
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

    // Initial load
    updateDashboard();
}
