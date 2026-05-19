import { getCurrentUser } from '../auth/auth-service.js';
import { getRecentTransactions } from '../transactions/transaction-service.js';
import { formatCurrency } from './dom.js';

export function initHeader() {
    const header = document.getElementById('app-header');
    if (!header) return;

    // Load initial preference or default to today's expense
    if (!localStorage.getItem('header-stat-pref')) {
        localStorage.setItem('header-stat-pref', 'today-expense');
    }

    // Render basic structure
    header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, var(--primary), #8F84EA); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px var(--primary-glow);">
                <span class="material-symbols-rounded" style="color: white; font-size: 20px;">account_balance_wallet</span>
            </div>
            <h2 class="text-gradient" style="margin: 0; font-size: 1.3rem; font-weight: 700; letter-spacing: -0.5px;">Expence</h2>
        </div>
        
        <!-- Pinned Stats Pill -->
        <div id="header-stat-pill" class="glass-pill" style="display: none; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; background: rgba(255,255,255,0.05); border: 1px solid var(--border-light); cursor: pointer; user-select: none; transition: all 0.2s;">
            <span class="indicator-dot" style="width: 6px; height: 6px; border-radius: 50%;"></span>
            <span class="stat-label" style="color: var(--text-muted); font-weight: 500;"></span>
            <span class="stat-value" style="font-weight: 600;"></span>
            <span class="material-symbols-rounded" style="font-size: 14px; color: var(--text-muted);">expand_more</span>
        </div>

        <!-- Choice Dropdown Menu -->
        <div id="header-stat-dropdown" style="display: none; position: absolute; top: 58px; right: 16px; width: 200px; background: rgba(20,20,24,0.95); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); border: 1px solid var(--border-light); border-radius: 14px; z-index: 1000; box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 8px; flex-direction: column; gap: 4px;">
            <div style="font-size: 0.7rem; color: var(--text-muted); padding: 4px 8px 6px 8px; border-bottom: 1px solid var(--border-light); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Pin to Header</div>
            <div class="stat-opt" data-pref="today-expense">Today's Expense</div>
            <div class="stat-opt" data-pref="today-income">Today's Income</div>
            <div class="stat-opt" data-pref="month-expense">Month's Expense</div>
            <div class="stat-opt" data-pref="balance">Remaining Balance</div>
            <div class="stat-opt" data-pref="none">App Title Only</div>
        </div>
    `;

    // Dropdown toggle listener
    const pill = document.getElementById('header-stat-pill');
    const dropdown = document.getElementById('header-stat-dropdown');

    if (pill && dropdown) {
        pill.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = dropdown.style.display === 'flex';
            dropdown.style.display = isVisible ? 'none' : 'flex';
        });

        // Outside click to close
        document.addEventListener('click', (e) => {
            if (!pill.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });

        // Dropdown options listeners
        const opts = dropdown.querySelectorAll('.stat-opt');
        opts.forEach(opt => {
            opt.addEventListener('click', () => {
                const pref = opt.dataset.pref;
                localStorage.setItem('header-stat-pref', pref);
                dropdown.style.display = 'none';
                updateHeaderStats();
            });
        });
    }

    // Dynamic style creation
    const styleId = 'header-stats-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            .stat-opt {
                padding: 8px 10px;
                border-radius: 8px;
                font-size: 0.8rem;
                color: var(--text-main);
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-weight: 500;
            }
            .stat-opt:hover {
                background: rgba(255,255,255,0.08);
            }
            .stat-opt.active {
                color: var(--primary);
                background: rgba(108,93,211,0.1);
            }
            .stat-opt.active::after {
                content: 'done';
                font-family: 'Material Symbols Rounded';
                font-size: 14px;
                font-weight: bold;
            }
            .glass-pill:hover {
                background: rgba(255,255,255,0.08) !important;
                border-color: rgba(255,255,255,0.15) !important;
            }
        `;
        document.head.appendChild(style);
    }

    // Load actual values
    updateHeaderStats();
}

export async function updateHeaderStats() {
    const user = getCurrentUser();
    const pill = document.getElementById('header-stat-pill');
    const dropdown = document.getElementById('header-stat-dropdown');
    
    if (!user || !pill) {
        if (pill) pill.style.display = 'none';
        return;
    }

    const currentPref = localStorage.getItem('header-stat-pref') || 'today-expense';

    // Highlight active in dropdown
    if (dropdown) {
        dropdown.querySelectorAll('.stat-opt').forEach(opt => {
            if (opt.dataset.pref === currentPref) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });
    }

    if (currentPref === 'none') {
        pill.style.display = 'none';
        return;
    }

    try {
        const transactions = await getRecentTransactions(user.uid, 100);
        
        // Date helpers
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const endOfToday = startOfToday + (24 * 60 * 60 * 1000) - 1;
        
        let todayExpense = 0;
        let todayIncome = 0;
        let monthExpense = 0;
        let balance = 0;

        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        transactions.forEach(tx => {
            const amount = parseFloat(tx.amount) || 0;
            const txTime = tx.timestamp || Date.now();
            const txDate = new Date(txTime);
            
            // Income calculation (only personal count)
            if (tx.type === 'income') {
                balance += amount;
                if (txTime >= startOfToday && txTime <= endOfToday) {
                    todayIncome += amount;
                }
            } else if (tx.type === 'expense') {
                // Expense mode personal or shared count
                if (tx.expenseMode === 'personal') {
                    balance -= amount;
                }
                
                if (txTime >= startOfToday && txTime <= endOfToday) {
                    todayExpense += amount;
                }

                if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
                    monthExpense += amount;
                }
            }
        });

        // Determine Pinned Content
        let valText = '';
        let lblText = '';
        let dotColor = 'var(--text-muted)';

        switch (currentPref) {
            case 'today-expense':
                lblText = "Today's Exp:";
                valText = formatCurrency(todayExpense);
                dotColor = 'var(--expense)';
                break;
            case 'today-income':
                lblText = "Today's Inc:";
                valText = formatCurrency(todayIncome);
                dotColor = 'var(--income)';
                break;
            case 'month-expense':
                lblText = "Month's Exp:";
                valText = formatCurrency(monthExpense);
                dotColor = 'var(--external)';
                break;
            case 'balance':
                lblText = "Balance:";
                valText = formatCurrency(balance);
                dotColor = balance >= 0 ? 'var(--income)' : 'var(--expense)';
                break;
        }

        // Apply content
        pill.querySelector('.stat-label').innerText = lblText;
        pill.querySelector('.stat-value').innerText = valText;
        pill.querySelector('.indicator-dot').style.backgroundColor = dotColor;
        pill.querySelector('.stat-value').style.color = (currentPref === 'balance') 
            ? (balance >= 0 ? 'var(--income)' : 'var(--expense)')
            : (currentPref === 'today-income' ? 'var(--income)' : 'var(--expense)');
        
        pill.style.display = 'flex';

    } catch (error) {
        console.error("Failed to update header stats:", error);
    }
}
