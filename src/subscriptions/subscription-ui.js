import { openBottomSheet, closeBottomSheet } from '../components/bottom-sheet.js';
import { getSubscriptions, addSubscription, deleteSubscription } from './subscription-service.js';
import { getCurrentUser } from '../auth/auth-service.js';
import { showToast } from '../components/toast.js';
import { formatCurrency } from '../utils/dom.js';

export async function openSubscriptionManager() {
    const user = getCurrentUser();
    if (!user) return;

    let subscriptions = await getSubscriptions(user.uid);

    const renderList = () => {
        if (subscriptions.length === 0) {
            return `<p class="text-muted" style="text-align:center; padding: 20px;">No active subscriptions.</p>`;
        }
        
        let totalMonthly = 0;
        const now = new Date();
        
        const listHtml = subscriptions.map(sub => {
            // Very basic normalization to monthly for display
            const monthlyCost = sub.frequency === 'yearly' ? sub.amount / 12 : sub.amount;
            totalMonthly += monthlyCost;
            
            // Check if renewal is soon (within 7 days)
            const renewalDate = new Date(sub.renewalDate);
            const daysUntil = Math.ceil((renewalDate - now) / (1000 * 60 * 60 * 24));
            
            let alertBadge = '';
            if (daysUntil >= 0 && daysUntil <= 7) {
                alertBadge = `<span style="font-size: 0.7rem; background: var(--expense); color: white; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">Due in ${daysUntil}d</span>`;
            } else if (daysUntil < 0) {
                alertBadge = `<span style="font-size: 0.7rem; background: var(--expense); color: white; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">Overdue</span>`;
            }

            return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 8px;">
                <div>
                    <h4 style="margin:0;">${sub.name} ${alertBadge}</h4>
                    <span class="text-muted" style="font-size:0.8rem;">Renews: ${renewalDate.toLocaleDateString()}</span>
                </div>
                <div style="text-align: right; display:flex; align-items:center; gap:12px;">
                    <div>
                        <h4 style="margin:0;">${formatCurrency(sub.amount)}</h4>
                        <span class="text-muted" style="font-size:0.7rem;">/${sub.frequency === 'yearly' ? 'yr' : 'mo'}</span>
                    </div>
                    <button class="btn-delete-sub" data-id="${sub.id}" style="background: none; border: none; color: var(--expense); cursor: pointer;">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                </div>
            </div>
            `;
        }).join('');

        return `
            <div style="margin-bottom: 12px; padding: 12px; background: rgba(108,93,211,0.1); border-radius: 8px; border-left: 4px solid var(--primary);">
                <p style="margin:0; font-size: 0.9rem;">Estimated Monthly Cost: <strong>${formatCurrency(totalMonthly)}</strong></p>
            </div>
            ${listHtml}
        `;
    };

    const html = `
        <h3 class="text-gradient" style="margin-bottom: var(--spacing-md); text-align:center;">Subscriptions</h3>
        
        <div id="sub-list-container" style="max-height: 250px; overflow-y: auto; margin-bottom: var(--spacing-md);">
            ${renderList()}
        </div>

        <h4 style="margin-bottom: var(--spacing-sm);">Add Subscription</h4>
        <form id="add-sub-form" style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
            <div class="form-group" style="margin:0;">
                <input type="text" id="new-sub-name" required placeholder="Service Name (e.g. Netflix)" class="glass-input">
            </div>
            <div style="display: flex; gap: var(--spacing-sm);">
                <div class="form-group" style="margin:0; flex:1;">
                    <input type="number" id="new-sub-amount" required placeholder="Amount" step="0.01" class="glass-input">
                </div>
                <div class="form-group" style="margin:0; flex:1;">
                    <select id="new-sub-frequency" class="glass-input" required>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                </div>
            </div>
            <div class="form-group" style="margin:0;">
                <label>Next Renewal Date</label>
                <input type="date" id="new-sub-date" required class="glass-input">
            </div>
            <button type="submit" class="btn btn-primary" id="sub-submit-btn">Add Subscription</button>
        </form>
    `;

    openBottomSheet(html, () => {
        setupListeners(user.uid, renderList);
    });

    function setupListeners(uid, renderListFn) {
        const attachDeleteListeners = () => {
            document.querySelectorAll('.btn-delete-sub').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.dataset.id;
                    if(confirm("Delete this subscription?")) {
                        try {
                            await deleteSubscription(uid, id);
                            subscriptions = subscriptions.filter(s => s.id !== id);
                            document.getElementById('sub-list-container').innerHTML = renderListFn();
                            attachDeleteListeners();
                            showToast("Subscription deleted", "success");
                        } catch (err) {
                            showToast("Failed to delete", "error");
                        }
                    }
                });
            });
        };
        attachDeleteListeners();

        document.getElementById('add-sub-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('sub-submit-btn');
            btn.innerText = "Adding...";
            btn.disabled = true;

            const name = document.getElementById('new-sub-name').value;
            const amount = parseFloat(document.getElementById('new-sub-amount').value);
            const frequency = document.getElementById('new-sub-frequency').value;
            const dateStr = document.getElementById('new-sub-date').value;

            try {
                const newSub = await addSubscription(uid, { 
                    name, 
                    amount, 
                    frequency, 
                    renewalDate: new Date(dateStr).getTime() 
                });
                subscriptions.push(newSub);
                subscriptions.sort((a, b) => a.renewalDate - b.renewalDate);
                document.getElementById('sub-list-container').innerHTML = renderListFn();
                attachDeleteListeners();
                
                document.getElementById('add-sub-form').reset();
                showToast("Subscription added", "success");
            } catch (err) {
                showToast("Failed to add subscription", "error");
            } finally {
                btn.innerText = "Add Subscription";
                btn.disabled = false;
            }
        });
    }
}
