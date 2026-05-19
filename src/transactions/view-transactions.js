import { openBottomSheet, closeBottomSheet } from '../components/bottom-sheet.js';
import { getRecentTransactions, deleteTransaction } from './transaction-service.js';
import { getCurrentUser } from '../auth/auth-service.js';
import { formatCurrency, formatDate } from '../utils/dom.js';
import { showToast } from '../components/toast.js';
import { loadDashboardData } from '../dashboard/dashboard.js';
import { updateHeaderStats } from '../utils/header.js';

export async function openViewTransactionsSheet() {
    const user = getCurrentUser();
    if (!user) {
        showToast("Please log in to view transactions", "error");
        return;
    }

    // HTML Shell for View Transactions
    const html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md);">
            <h3 class="text-gradient" style="margin:0;">Recent Activity</h3>
            <span id="close-view-tx" class="material-symbols-rounded" style="cursor: pointer; color: var(--text-muted);">close</span>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: var(--spacing-sm); margin-bottom: var(--spacing-md);">
            <!-- Live Search -->
            <div style="position: relative;">
                <input type="text" id="tx-search-input" placeholder="Search shop, category, notes..." class="glass-input" style="padding-left: 40px; font-size: 0.95rem;">
                <span class="material-symbols-rounded text-muted" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 20px;">search</span>
            </div>
            
            <!-- Type Filters -->
            <div style="display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding-bottom: 4px;">
                <button class="filter-chip active" data-type="all">All</button>
                <button class="filter-chip" data-type="expense">Expense</button>
                <button class="filter-chip" data-type="income">Income</button>
                <button class="filter-chip" data-mode="personal">My Personal</button>
                <button class="filter-chip" data-mode="external">Shared</button>
            </div>
        </div>

        <!-- Transactions Container -->
        <div id="view-tx-list-container" style="max-height: 55vh; overflow-y: auto; display: flex; flex-direction: column; gap: var(--spacing-sm); scrollbar-width: none;">
            <div class="skeleton" style="height: 60px; width: 100%;"></div>
            <div class="skeleton" style="height: 60px; width: 100%;"></div>
            <div class="skeleton" style="height: 60px; width: 100%;"></div>
        </div>
        
        <!-- Summary Stats inside Browser -->
        <div id="view-tx-summary" style="display: flex; justify-content: space-between; align-items: center; margin-top: var(--spacing-md); border-top: 1px solid var(--border-light); padding-top: var(--spacing-sm); font-size: 0.85rem; color: var(--text-muted);">
            <span>Showing 0 transactions</span>
            <span id="view-tx-total-amount" class="text-gradient" style="font-weight: 600;">Total: $0.00</span>
        </div>
    `;

    openBottomSheet(html, () => setupViewTransactionsListeners(user.uid));
}

async function setupViewTransactionsListeners(userId) {
    const listContainer = document.getElementById('view-tx-list-container');
    const searchInput = document.getElementById('tx-search-input');
    const filterChips = document.querySelectorAll('.filter-chip');
    const closeBtn = document.getElementById('close-view-tx');
    const summarySpan = document.querySelector('#view-tx-summary span');
    const totalAmountSpan = document.getElementById('view-tx-total-amount');

    if (closeBtn) {
        closeBtn.addEventListener('click', closeBottomSheet);
    }

    let allTransactions = [];
    let currentFilterType = 'all'; // all, expense, income
    let currentFilterMode = 'all'; // all, personal, external
    let searchQuery = '';

    // Load and cache all recent transactions (up to 100)
    async function loadTransactions() {
        try {
            allTransactions = await getRecentTransactions(userId, 100);
            renderFilteredTransactions();
        } catch (error) {
            console.error("Failed to load list:", error);
            listContainer.innerHTML = `<p class="text-error" style="text-align:center;">Failed to load transactions.</p>`;
        }
    }

    function renderFilteredTransactions() {
        const filtered = allTransactions.filter(tx => {
            // Filter by search query
            const matchesSearch = searchQuery === '' || 
                (tx.category || '').toLowerCase().includes(searchQuery) ||
                (tx.note || '').toLowerCase().includes(searchQuery) ||
                (tx.shopName || '').toLowerCase().includes(searchQuery);

            // Filter by type
            const matchesType = currentFilterType === 'all' || tx.type === currentFilterType;

            // Filter by mode
            const matchesMode = currentFilterMode === 'all' || tx.expenseMode === currentFilterMode;

            return matchesSearch && matchesType && matchesMode;
        });

        if (filtered.length === 0) {
            listContainer.innerHTML = `<p class="text-muted" style="text-align: center; padding: var(--spacing-lg) 0;">No matching transactions</p>`;
            summarySpan.innerText = `Showing 0 transactions`;
            totalAmountSpan.innerText = `Total: ${formatCurrency(0)}`;
            return;
        }

        // Calculate total amount in current filter selection
        let sum = 0;
        filtered.forEach(tx => {
            const amt = parseFloat(tx.amount) || 0;
            if (tx.type === 'income') {
                sum += amt;
            } else {
                sum -= amt;
            }
        });

        // Update summaries
        summarySpan.innerText = `Showing ${filtered.length} transactions`;
        totalAmountSpan.innerText = `Net Total: ${sum >= 0 ? '+' : ''}${formatCurrency(sum)}`;
        totalAmountSpan.className = sum >= 0 ? 'text-income' : 'text-expense';
        totalAmountSpan.style.fontWeight = 'bold';

        // Render rows
        listContainer.innerHTML = filtered.map(tx => {
            const isIncome = tx.type === 'income';
            const badgeColor = isIncome ? 'var(--income)' : (tx.expenseMode === 'external' ? 'var(--external)' : 'var(--expense)');
            const displayTitle = tx.shopName ? `${tx.category || 'General'} • ${tx.shopName}` : (tx.category || 'General');
            
            return `
                <div class="glass-card view-tx-row" data-id="${tx.id}" style="padding: 12px; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s; position: relative; border-radius: 12px;">
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                        <div style="width: 36px; height: 36px; border-radius: 50%; background: ${badgeColor}15; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <span class="material-symbols-rounded" style="color: ${badgeColor}; font-size: 18px;">
                                ${isIncome ? 'arrow_downward' : 'arrow_upward'}
                            </span>
                        </div>
                        <div style="min-width: 0; flex: 1;">
                            <h4 style="margin:0; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 6px;">
                                ${displayTitle}
                                ${tx.expenseMode === 'external' ? '<span style="font-size: 0.65rem; background: rgba(255,193,7,0.15); color: var(--external); padding: 1px 4px; border-radius: 4px;">Shared</span>' : ''}
                            </h4>
                            <p class="text-muted" style="margin:0; font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${formatDate(tx.timestamp)}${tx.note ? ` • ${tx.note}` : ''}
                            </p>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px; margin-left: 8px; flex-shrink: 0;">
                        <h4 class="${isIncome ? 'text-income' : (tx.expenseMode === 'external' ? 'text-external' : 'text-expense')}" style="margin:0; font-size: 1rem;">
                            ${isIncome ? '+' : '-'}${formatCurrency(tx.amount)}
                        </h4>
                        
                        <!-- Delete Transaction Button -->
                        <button class="delete-row-btn" data-id="${tx.id}" style="background: transparent; border: none; padding: 4px; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 6px; transition: all 0.2s;">
                            <span class="material-symbols-rounded" style="font-size: 18px;">delete</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Add Delete Event Handlers
        const deleteButtons = listContainer.querySelectorAll('.delete-row-btn');
        deleteButtons.forEach(btn => {
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
                
                // Beautiful standard prompt check
                const confirmed = confirm("Are you sure you want to delete this transaction?");
                if (!confirmed) return;

                // Visual row delete animation
                const row = listContainer.querySelector(`.view-tx-row[data-id="${txId}"]`);
                if (row && window.gsap) {
                    gsap.to(row, {
                        x: -50, opacity: 0, duration: 0.2, onComplete: async () => {
                            await executeDelete(txId);
                        }
                    });
                } else {
                    await executeDelete(txId);
                }
            });
        });
    }

    async function executeDelete(txId) {
        try {
            await deleteTransaction(userId, txId);
            showToast("Transaction deleted successfully", "success");
            
            // Update global header stats
            updateHeaderStats();
            
            // Reload list internally
            await loadTransactions();
            
            // Reload dashboard behind the overlay to keep data completely sync'd
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                await loadDashboardData(mainContent);
            }
        } catch (error) {
            showToast("Failed to delete transaction", "error");
        }
    }

    // Search input listener
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderFilteredTransactions();
    });

    // Filtering chips listeners
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const isType = chip.dataset.type !== undefined;
            
            // Reset active state for siblings
            if (isType) {
                filterChips.forEach(c => {
                    if (c.dataset.type !== undefined) c.classList.remove('active');
                });
                currentFilterType = chip.dataset.type;
            } else {
                // If it is mode filter, it is a toggle filter chip
                const targetMode = chip.dataset.mode;
                if (chip.classList.contains('active')) {
                    chip.classList.remove('active');
                    currentFilterMode = 'all';
                } else {
                    filterChips.forEach(c => {
                        if (c.dataset.mode !== undefined) c.classList.remove('active');
                    });
                    chip.classList.add('active');
                    currentFilterMode = targetMode;
                }
            }

            if (isType) chip.classList.add('active');
            
            renderFilteredTransactions();
        });
    });

    // Style the chips on fly
    const style = document.createElement('style');
    style.id = 'filter-chip-styles';
    style.innerHTML = `
        .filter-chip {
            background: rgba(255,255,255,0.05);
            border: 1px solid var(--border-light);
            border-radius: 20px;
            color: var(--text-muted);
            padding: 6px 14px;
            font-size: 0.8rem;
            font-weight: 500;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.2s ease;
            font-family: var(--font-family);
        }
        .filter-chip.active {
            background: var(--primary);
            border-color: var(--primary);
            color: white;
            box-shadow: 0 2px 8px var(--primary-glow);
        }
    `;
    if (!document.getElementById('filter-chip-styles')) {
        document.head.appendChild(style);
    }

    // Trigger initial transaction fetch
    await loadTransactions();
}
