import { getCurrentUser } from '../auth/auth-service.js';
import { getUserBudget, saveUserBudget } from './budget-service.js';
import { getTransactionsByDate } from '../transactions/transaction-service.js';
import { formatCurrency } from '../utils/dom.js';

export async function loadBudgetUI(container) {
    const user = getCurrentUser();
    if (!user) {
        container.innerHTML = `<p class="text-error">Please log in.</p>`;
        return;
    }

    // Fetch budget settings
    const budgetSettings = await getUserBudget(user.uid);
    const monthlyBudget = budgetSettings.monthly || 50000;
    
    // Fetch current month's transactions
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();
    
    const transactions = await getTransactionsByDate(user.uid, startOfMonth, endOfMonth);
    
    let totalSpent = 0;
    let categorySpent = {};
    
    transactions.forEach(tx => {
        if (tx.type === 'expense' && tx.expenseMode === 'personal') {
            const amount = parseFloat(tx.amount) || 0;
            totalSpent += amount;
            categorySpent[tx.category || 'Other'] = (categorySpent[tx.category || 'Other'] || 0) + amount;
        }
    });

    const percentage = Math.min(Math.round((totalSpent / monthlyBudget) * 100), 100);
    
    let alertHtml = '';
    if (percentage > 80) {
        alertHtml = `
            <div style="padding: 12px; background: rgba(255,82,82,0.1); border-radius: 8px; border-left: 4px solid var(--expense); margin-bottom: var(--spacing-md);">
                <p class="text-expense" style="margin:0; font-weight: 500; display:flex; align-items:center; gap: 8px;">
                    <span class="material-symbols-rounded">warning</span>
                    Warning: You've used ${percentage}% of your monthly budget!
                </p>
            </div>
        `;
    }

    // Render Category Budgets
    let categoryHtml = '';
    if (budgetSettings.categories && Object.keys(budgetSettings.categories).length > 0) {
        for (const [cat, limit] of Object.entries(budgetSettings.categories)) {
            const spent = categorySpent[cat] || 0;
            const catPct = Math.min(Math.round((spent / limit) * 100), 100);
            const isOver = spent > limit;
            
            categoryHtml += `
                <div style="margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span>${cat}</span>
                        <span class="${isOver ? 'text-expense' : 'text-muted'}">${formatCurrency(spent)} / ${formatCurrency(limit)}</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: var(--bg-card); border-radius: 4px; overflow: hidden;">
                        <div style="height: 100%; width: ${catPct}%; background: ${isOver ? 'var(--expense)' : 'var(--primary)'}; border-radius: 4px;"></div>
                    </div>
                </div>
            `;
        }
    } else {
        categoryHtml = `<p class="text-muted">No custom category budgets set. Tap Edit to add them.</p>`;
    }

    container.innerHTML = `
        <div class="glass-card" style="margin-bottom: var(--spacing-md);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md);">
                <h2 class="text-gradient">Monthly Budget</h2>
                <button class="btn btn-primary" id="btn-edit-budget" style="padding: 6px 12px; width: auto; font-size: 0.8rem;">Edit</button>
            </div>
            
            ${alertHtml}

            <div style="text-align: center; margin-bottom: var(--spacing-md);">
                <div style="position: relative; width: 150px; height: 150px; margin: 0 auto;">
                    <svg viewBox="0 0 36 36" style="width: 100%; height: 100%; transform: rotate(-90deg);">
                        <path stroke="rgba(255,255,255,0.1)" stroke-width="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path stroke="url(#gradient)" stroke-dasharray="${percentage}, 100" stroke-linecap="round" stroke-width="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style="transition: stroke-dasharray 1s ease-out;" />
                        <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stop-color="${percentage > 90 ? 'var(--expense)' : 'var(--accent-teal)'}" />
                                <stop offset="100%" stop-color="${percentage > 90 ? 'var(--expense)' : 'var(--primary)'}" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
                        <h2 style="margin:0;">${percentage}%</h2>
                        <span class="text-muted" style="font-size: 0.7rem;">Spent</span>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; justify-content: space-between;">
                <div>
                    <p class="text-muted" style="font-size: 0.8rem;">Spent</p>
                    <h4>${formatCurrency(totalSpent)}</h4>
                </div>
                <div style="text-align: right;">
                    <p class="text-muted" style="font-size: 0.8rem;">Limit</p>
                    <h4 class="text-income">${formatCurrency(monthlyBudget)}</h4>
                </div>
            </div>
        </div>

        <div class="glass-card">
            <h3 style="margin-bottom: var(--spacing-sm);">Category Budgets</h3>
            ${categoryHtml}
        </div>
    `;

    document.getElementById('btn-edit-budget').addEventListener('click', async () => {
        const { openBottomSheet, closeBottomSheet } = await import('../components/bottom-sheet.js');
        const { getUserCategories } = await import('../categories/category-service.js');
        const { showToast } = await import('../components/toast.js');
        
        const categories = await getUserCategories(user.uid);
        
        let catInputsHtml = '';
        categories.forEach(c => {
            const currentLimit = budgetSettings.categories ? (budgetSettings.categories[c.name] || '') : '';
            catInputsHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="display:flex; align-items:center; gap:8px;"><span class="material-symbols-rounded" style="font-size: 16px; color:${c.color}">${c.icon}</span> ${c.name}</span>
                    <input type="number" data-catname="${c.name}" value="${currentLimit}" placeholder="Limit" class="glass-input cat-limit-input" style="width: 120px; padding: 6px; text-align:right;">
                </div>
            `;
        });

        const html = `
            <h3 class="text-gradient" style="margin-bottom: var(--spacing-md); text-align:center;">Edit Budgets</h3>
            <form id="edit-budget-form" style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
                <div class="form-group" style="margin:0;">
                    <label>Overall Monthly Limit</label>
                    <input type="number" id="edit-monthly-limit" required value="${monthlyBudget}" class="glass-input" style="font-size: 1.2rem; font-weight:bold;">
                </div>
                
                <h4 style="margin-top: var(--spacing-sm);">Category Limits</h4>
                <div style="max-height: 200px; overflow-y: auto; padding-right: 8px; margin-bottom: var(--spacing-sm);">
                    ${catInputsHtml}
                </div>
                
                <button type="submit" class="btn btn-primary" id="save-budget-btn">Save Budgets</button>
            </form>
        `;

        openBottomSheet(html, () => {
            document.getElementById('edit-budget-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = document.getElementById('save-budget-btn');
                btn.innerText = "Saving...";
                btn.disabled = true;

                const newMonthly = parseFloat(document.getElementById('edit-monthly-limit').value);
                const newCategories = {};
                
                document.querySelectorAll('.cat-limit-input').forEach(input => {
                    const val = parseFloat(input.value);
                    if (val > 0) {
                        newCategories[input.dataset.catname] = val;
                    }
                });

                try {
                    await saveUserBudget(user.uid, { monthly: newMonthly, categories: newCategories });
                    showToast("Budgets saved successfully", "success");
                    closeBottomSheet();
                    // Reload budget UI
                    loadBudgetUI(container);
                } catch (err) {
                    showToast("Failed to save budget", "error");
                    btn.innerText = "Save Budgets";
                    btn.disabled = false;
                }
            });
        });
    });
}
