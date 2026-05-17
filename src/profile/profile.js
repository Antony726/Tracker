import { getCurrentUser, logoutUser } from '../auth/auth-service.js';
import { exportToPDF, exportToExcel } from '../utils/export-service.js';
import { openCategoryManager } from '../categories/category-ui.js';
import { openSubscriptionManager } from '../subscriptions/subscription-ui.js';
import { evaluateAchievements } from '../gamification/gamification-service.js';

export async function loadProfileUI(container) {
    const user = getCurrentUser();
    if (!user) {
        container.innerHTML = `<p class="text-error">Please log in.</p>`;
        return;
    }

    // Fetch achievements asynchronously
    const achievements = await evaluateAchievements(user.uid);
    let badgesHtml = '';
    if (achievements.length > 0) {
        badgesHtml = achievements.map(a => `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; width: 80px;">
                <div style="width: 50px; height: 50px; border-radius: 50%; background: ${a.color}20; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px ${a.color}40;">
                    <span class="material-symbols-rounded" style="color: ${a.color}; font-size: 28px;">${a.icon}</span>
                </div>
                <span style="font-size: 0.7rem; font-weight: bold; color: ${a.color};">${a.title}</span>
            </div>
        `).join('');
    } else {
        badgesHtml = `<p class="text-muted" style="font-size: 0.8rem; text-align: center; width:100%;">Log expenses to earn badges!</p>`;
    }

    container.innerHTML = `
        <div class="glass-card" style="margin-bottom: var(--spacing-md); text-align: center;">
            <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--accent-teal)); margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center; font-size: 32px; color: white;">
                ${user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
            <h2>${user.displayName || 'User'}</h2>
            <p class="text-muted">${user.email}</p>
        </div>

        <div class="glass-card" style="margin-bottom: var(--spacing-md);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <span class="material-symbols-rounded text-primary">military_tech</span>
                <h3 style="margin:0;">Achievements</h3>
            </div>
            <div style="display: flex; gap: 16px; overflow-x: auto; padding: 12px 4px;">
                ${badgesHtml}
            </div>
        </div>

        <div class="glass-card" style="margin-bottom: var(--spacing-md);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                <span class="material-symbols-rounded text-primary">settings</span>
                <h3 style="margin:0;">Settings</h3>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-light);">
                <span>Subscriptions</span>
                <button id="btn-manage-subs" class="btn" style="width:auto; padding: 4px 12px; font-size: 0.8rem; background: rgba(255,255,255,0.1); color: white;">Manage</button>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-light);">
                <span>Categories</span>
                <button id="btn-manage-cat" class="btn" style="width:auto; padding: 4px 12px; font-size: 0.8rem; background: rgba(255,255,255,0.1); color: white;">Edit</button>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-light);">
                <span>Dark Mode</span>
                <div style="width: 40px; height: 24px; background: var(--primary); border-radius: 12px; position: relative;">
                    <div style="width: 20px; height: 20px; background: white; border-radius: 50%; position: absolute; right: 2px; top: 2px;"></div>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-light);">
                <span>Currency</span>
                <span class="text-muted">INR (₹)</span>
            </div>
        </div>

        <div class="glass-card" style="margin-bottom: var(--spacing-md);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                <span class="material-symbols-rounded text-primary">download</span>
                <h3 style="margin:0;">Exports</h3>
            </div>
            <button id="btn-export-pdf" class="btn" style="background: rgba(255,255,255,0.05); color: white; margin-bottom: 8px;">Export as PDF</button>
            <button id="btn-export-excel" class="btn" style="background: rgba(255,255,255,0.05); color: white;">Export as Excel</button>
        </div>

        <button id="logout-btn" class="btn" style="background: rgba(255,82,82,0.1); color: var(--expense); border: 1px solid var(--expense);">
            Log Out
        </button>
    `;

    document.getElementById('btn-manage-subs').addEventListener('click', () => {
        openSubscriptionManager();
    });

    document.getElementById('btn-manage-cat').addEventListener('click', () => {
        openCategoryManager();
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        logoutUser();
    });

    document.getElementById('btn-export-pdf').addEventListener('click', () => {
        exportToPDF();
    });

    document.getElementById('btn-export-excel').addEventListener('click', () => {
        exportToExcel();
    });
}
