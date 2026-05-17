import { openBottomSheet, closeBottomSheet } from '../components/bottom-sheet.js';
import { addTransaction } from './transaction-service.js';
import { getUserCategories } from '../categories/category-service.js';
import { getCurrentUser } from '../auth/auth-service.js';
import { showToast } from '../components/toast.js';
import { loadDashboardData } from '../dashboard/dashboard.js';

let categoriesList = [];

// Listen for custom event to clear cache
window.addEventListener('categories-updated', () => {
    categoriesList = [];
});

export async function openAddExpenseSheet() {
    const user = getCurrentUser();
    if (!user) {
        showToast("Please log in to add expense", "error");
        return;
    }

    if (categoriesList.length === 0) {
        categoriesList = await getUserCategories(user.uid);
    }

    const catOptionsHtml = categoriesList.map(c => `
        <div class="custom-cat-option" data-value="${c.name}" style="padding: 10px 12px; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: background 0.2s; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <div style="width: 24px; height: 24px; border-radius: 50%; background: ${c.color}20; color: ${c.color}; display: flex; align-items: center; justify-content: center;">
                <span class="material-symbols-rounded" style="font-size: 14px;">${c.icon}</span>
            </div>
            <span>${c.name}</span>
        </div>
    `).join('');

    const paymentOptions = ['UPI', 'Card', 'Cash', 'Bank Transfer'];
    const paymentOptionsHtml = paymentOptions.map(p => `
        <div class="custom-pay-option" data-value="${p}" style="padding: 10px 12px; cursor: pointer; transition: background 0.2s; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <span>${p}</span>
        </div>
    `).join('');

    const html = `
        <h3 class="text-gradient" style="margin-bottom: var(--spacing-md); text-align:center;">Add Transaction</h3>
        
        <form id="add-tx-form" style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
            
            <div style="display: flex; gap: var(--spacing-sm);">
                <button type="button" class="tx-type-btn active" data-type="expense" style="flex:1; padding: 10px; border-radius: 8px; border: 1px solid var(--expense); background: rgba(255,82,82,0.1); color: var(--expense); font-weight: bold;">Expense</button>
                <button type="button" class="tx-type-btn" data-type="income" style="flex:1; padding: 10px; border-radius: 8px; border: 1px solid transparent; background: rgba(255,255,255,0.05); color: var(--text-muted);">Income</button>
            </div>

            <!-- Expense Mode Selection (Only visible for expense) -->
            <div id="expense-mode-container" style="display: flex; gap: var(--spacing-sm);">
                 <button type="button" class="tx-mode-btn active" data-mode="personal" style="flex:1; padding: 8px; border-radius: 8px; border: 1px solid var(--primary); background: rgba(108,93,211,0.1); color: var(--text-main); font-size: 0.85rem;">My Expense</button>
                 <button type="button" class="tx-mode-btn" data-mode="external" style="flex:1; padding: 8px; border-radius: 8px; border: 1px solid transparent; background: rgba(255,255,255,0.05); color: var(--text-muted); font-size: 0.85rem;">Shared/External</button>
            </div>

            <div class="form-group" style="margin:0;">
                <label>Amount</label>
                <input type="number" id="tx-amount" required placeholder="0.00" step="0.01" class="glass-input" style="font-size: 1.5rem; text-align: center;">
            </div>

            <div style="display: flex; gap: var(--spacing-sm);">
                <div class="form-group" style="margin:0; flex:1; position: relative;">
                    <label>Category</label>
                    <div id="cat-select-trigger" class="glass-input" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none;">
                        <span id="cat-select-value" class="text-muted">Select Category</span>
                        <span class="material-symbols-rounded">expand_more</span>
                    </div>
                    <div id="cat-select-dropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-card); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid var(--border-light); border-radius: 8px; margin-top: 4px; z-index: 100; max-height: 200px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                        ${catOptionsHtml}
                    </div>
                    <input type="hidden" id="tx-category" required>
                </div>
                <div class="form-group" style="margin:0; flex:1; position: relative;">
                    <label>Payment Method</label>
                    <div id="pay-select-trigger" class="glass-input" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none;">
                        <span id="pay-select-value">UPI</span>
                        <span class="material-symbols-rounded">expand_more</span>
                    </div>
                    <div id="pay-select-dropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-card); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid var(--border-light); border-radius: 8px; margin-top: 4px; z-index: 100; max-height: 200px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                        ${paymentOptionsHtml}
                    </div>
                    <input type="hidden" id="tx-payment-method" value="UPI">
                </div>
            </div>
            
            <div class="form-group" style="margin:0;">
                <label>Shop/Location Name</label>
                <input type="text" id="tx-shop" placeholder="E.g., Dominos, Amazon" class="glass-input">
            </div>

            <div class="form-group" style="margin:0;">
                <label>Notes (Optional)</label>
                <input type="text" id="tx-notes" placeholder="E.g., Dinner with friends" class="glass-input">
            </div>
            
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0;">
                <label style="color: var(--text-main);">Recurring Expense</label>
                <input type="checkbox" id="tx-recurring" style="width: 20px; height: 20px; accent-color: var(--primary);">
            </div>
            
            <button type="submit" class="btn btn-primary" id="tx-submit-btn">Save Transaction</button>
        </form>
    `;

    openBottomSheet(html, setupFormListeners);
}

function setupFormListeners() {
    let currentType = 'expense';
    let currentMode = 'personal';

    const typeBtns = document.querySelectorAll('.tx-type-btn');
    const modeBtns = document.querySelectorAll('.tx-mode-btn');
    const modeContainer = document.getElementById('expense-mode-container');

    // Category Select Logic
    const catTrigger = document.getElementById('cat-select-trigger');
    const catDropdown = document.getElementById('cat-select-dropdown');
    const catValueDisplay = document.getElementById('cat-select-value');
    const hiddenCategoryInput = document.getElementById('tx-category');

    catTrigger.addEventListener('click', () => {
        const isVisible = catDropdown.style.display === 'block';
        catDropdown.style.display = isVisible ? 'none' : 'block';
        document.getElementById('pay-select-dropdown').style.display = 'none'; // close other
    });

    const catOptions = document.querySelectorAll('.custom-cat-option');
    catOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            const val = opt.dataset.value;
            const htmlContent = opt.innerHTML;
            
            catValueDisplay.innerHTML = htmlContent;
            catValueDisplay.classList.remove('text-muted');
            catValueDisplay.style.display = 'flex';
            catValueDisplay.style.alignItems = 'center';
            catValueDisplay.style.gap = '8px';
            
            hiddenCategoryInput.value = val;
            catDropdown.style.display = 'none';
        });
        opt.addEventListener('mouseenter', () => opt.style.background = 'rgba(255,255,255,0.1)');
        opt.addEventListener('mouseleave', () => opt.style.background = 'transparent');
    });

    // Payment Method Select Logic
    const payTrigger = document.getElementById('pay-select-trigger');
    const payDropdown = document.getElementById('pay-select-dropdown');
    const payValueDisplay = document.getElementById('pay-select-value');
    const hiddenPayInput = document.getElementById('tx-payment-method');

    payTrigger.addEventListener('click', () => {
        const isVisible = payDropdown.style.display === 'block';
        payDropdown.style.display = isVisible ? 'none' : 'block';
        document.getElementById('cat-select-dropdown').style.display = 'none'; // close other
    });

    const payOptions = document.querySelectorAll('.custom-pay-option');
    payOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            const val = opt.dataset.value;
            payValueDisplay.innerHTML = val;
            hiddenPayInput.value = val;
            payDropdown.style.display = 'none';
        });
        opt.addEventListener('mouseenter', () => opt.style.background = 'rgba(255,255,255,0.1)');
        opt.addEventListener('mouseleave', () => opt.style.background = 'transparent');
    });

    // Close dropdowns if clicked outside
    document.addEventListener('click', (e) => {
        if (!catTrigger.contains(e.target) && !catDropdown.contains(e.target)) {
            catDropdown.style.display = 'none';
        }
        if (!payTrigger.contains(e.target) && !payDropdown.contains(e.target)) {
            payDropdown.style.display = 'none';
        }
    });

    typeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            typeBtns.forEach(b => {
                b.classList.remove('active');
                b.style.border = '1px solid transparent';
                b.style.background = 'rgba(255,255,255,0.05)';
                b.style.color = 'var(--text-muted)';
                b.style.fontWeight = 'normal';
            });
            const clicked = e.target;
            clicked.classList.add('active');
            currentType = clicked.dataset.type;
            clicked.style.fontWeight = 'bold';
            
            if (currentType === 'expense') {
                clicked.style.border = '1px solid var(--expense)';
                clicked.style.background = 'rgba(255,82,82,0.1)';
                clicked.style.color = 'var(--expense)';
                modeContainer.classList.remove('hidden');
            } else {
                clicked.style.border = '1px solid var(--income)';
                clicked.style.background = 'rgba(76,175,80,0.1)';
                clicked.style.color = 'var(--income)';
                modeContainer.classList.add('hidden');
            }
        });
    });

    modeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            modeBtns.forEach(b => {
                b.classList.remove('active');
                b.style.border = '1px solid transparent';
                b.style.background = 'rgba(255,255,255,0.05)';
                b.style.color = 'var(--text-muted)';
            });
            const clicked = e.target;
            clicked.classList.add('active');
            currentMode = clicked.dataset.mode;
            
            if (currentMode === 'personal') {
                clicked.style.border = '1px solid var(--primary)';
                clicked.style.background = 'rgba(108,93,211,0.1)';
                clicked.style.color = 'var(--text-main)';
            } else {
                clicked.style.border = '1px solid var(--external)';
                clicked.style.background = 'rgba(255,193,7,0.1)';
                clicked.style.color = 'var(--external)';
            }
        });
    });

    const form = document.getElementById('add-tx-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const category = document.getElementById('tx-category').value;
        if (!category) {
            showToast("Please select a category", "error");
            return;
        }

        const btn = document.getElementById('tx-submit-btn');
        const originalText = btn.innerText;
        btn.innerText = "Saving...";
        btn.disabled = true;

        const user = getCurrentUser();
        const amount = parseFloat(document.getElementById('tx-amount').value);
        const notes = document.getElementById('tx-notes').value;
        const paymentMethod = document.getElementById('tx-payment-method').value;
        const shopName = document.getElementById('tx-shop').value;
        const recurring = document.getElementById('tx-recurring').checked;

        const txData = {
            type: currentType,
            expenseMode: currentType === 'expense' ? currentMode : 'personal',
            amount,
            category,
            note: notes,
            paymentMethod,
            shopName,
            recurring,
            timestamp: Date.now()
        };

        try {
            await addTransaction(user.uid, txData);
            showToast("Transaction saved", "success");
            closeBottomSheet();
            
            // Refresh dashboard if we are on home
            if (window.location.hash === '' || window.location.hash === '#home') {
                const mainContent = document.getElementById('main-content');
                await loadDashboardData(mainContent);
            }
        } catch (error) {
            showToast("Failed to save transaction", "error");
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });
}
