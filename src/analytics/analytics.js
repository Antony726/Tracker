import { getTransactionsByDate } from '../transactions/transaction-service.js';
import { getCurrentUser } from '../auth/auth-service.js';

export async function loadAnalyticsData(container) {
    const user = getCurrentUser();
    if (!user) {
        container.innerHTML = `<p class="text-error">Please log in to view analytics.</p>`;
        return;
    }

    container.innerHTML = `
        <div style="display: flex; gap: var(--spacing-sm); margin-bottom: var(--spacing-md); overflow-x: auto; padding-bottom: 4px;">
            <button class="btn time-filter active" data-days="7" style="padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; background: var(--primary); color: white; border: none; white-space: nowrap;">7 Days</button>
            <button class="btn time-filter" data-days="30" style="padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; background: rgba(255,255,255,0.1); color: white; border: none; white-space: nowrap;">30 Days</button>
            <button class="btn time-filter" data-days="90" style="padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; background: rgba(255,255,255,0.1); color: white; border: none; white-space: nowrap;">90 Days</button>
            <button class="btn time-filter" data-days="365" style="padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; background: rgba(255,255,255,0.1); color: white; border: none; white-space: nowrap;">1 Year</button>
        </div>

        <div id="analytics-content">
            <div class="skeleton" style="height: 300px; width: 100%; margin-bottom: 16px;"></div>
            <div class="skeleton" style="height: 200px; width: 100%;"></div>
        </div>
    `;

    const contentDiv = document.getElementById('analytics-content');
    
    const renderData = async (days) => {
        try {
            const endDate = Date.now();
            const startDate = endDate - (days * 24 * 60 * 60 * 1000);
            
            // For comparison, get the previous period
            const prevStartDate = startDate - (days * 24 * 60 * 60 * 1000);
            
            const currentTx = await getTransactionsByDate(user.uid, startDate, endDate);
            const prevTx = await getTransactionsByDate(user.uid, prevStartDate, startDate);
            
            // Process Current Data
            const categoryTotals = {};
            let currentTotalExpense = 0;
            let currentTotalIncome = 0;
            const dailySpending = {}; // For Bar chart

            currentTx.forEach(tx => {
                const amount = parseFloat(tx.amount) || 0;
                if (tx.type === 'expense') {
                    const cat = tx.category || 'Other';
                    categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;
                    currentTotalExpense += amount;
                    
                    const dateStr = new Date(tx.timestamp).toLocaleDateString('en-US', {month:'short', day:'numeric'});
                    dailySpending[dateStr] = (dailySpending[dateStr] || 0) + amount;
                } else if (tx.type === 'income') {
                    currentTotalIncome += amount;
                }
            });

            // Process Previous Data for Comparison
            let prevTotalExpense = 0;
            let prevTotalIncome = 0;
            prevTx.forEach(tx => {
                const amount = parseFloat(tx.amount) || 0;
                if (tx.type === 'expense') prevTotalExpense += amount;
                else if (tx.type === 'income') prevTotalIncome += amount;
            });

            // Calculate Insights
            let highestCat = '';
            let highestVal = 0;
            for (const [cat, val] of Object.entries(categoryTotals)) {
                if (val > highestVal) {
                    highestVal = val;
                    highestCat = cat;
                }
            }

            let expenseTrendHtml = '';
            if (prevTotalExpense > 0) {
                const diff = currentTotalExpense - prevTotalExpense;
                const pct = Math.round(Math.abs(diff) / prevTotalExpense * 100);
                if (diff > 0) {
                    expenseTrendHtml = `<span style="color: var(--expense);">▲ ${pct}% more</span> than previous period`;
                } else {
                    expenseTrendHtml = `<span style="color: var(--income);">▼ ${pct}% less</span> than previous period`;
                }
            } else {
                expenseTrendHtml = `Insufficient past data for comparison`;
            }

            // HTML Structure for Charts & Insights
            contentDiv.innerHTML = `
                <div class="glass-card" style="margin-bottom: var(--spacing-md);">
                    <h2 class="text-gradient">Expense Breakdown</h2>
                    <div style="position: relative; height:250px; width:100%; margin-top: var(--spacing-sm);">
                        <canvas id="category-chart"></canvas>
                    </div>
                </div>

                <div class="glass-card" style="margin-bottom: var(--spacing-md);">
                    <h2 class="text-gradient">Daily Spending Trend</h2>
                    <div style="position: relative; height:200px; width:100%; margin-top: var(--spacing-sm);">
                        <canvas id="trend-chart"></canvas>
                    </div>
                </div>

                <div class="glass-card" style="margin-bottom: var(--spacing-md);">
                    <h2 class="text-gradient">Smart Insights</h2>
                    <div id="insights-container" style="margin-top: var(--spacing-sm); display: flex; flex-direction: column; gap: 8px;">
                        <div style="padding: 12px; background: rgba(108,93,211,0.1); border-radius: 8px; border-left: 4px solid var(--primary);">
                            <p style="font-size: 0.9rem; margin:0;"><strong>Top Spending:</strong> <b>${highestCat || 'N/A'}</b> (₹${highestVal})</p>
                        </div>
                        <div style="padding: 12px; background: rgba(63,223,209,0.1); border-radius: 8px; border-left: 4px solid var(--accent-teal);">
                            <p style="font-size: 0.9rem; margin:0;"><strong>Daily Average:</strong> ₹${Math.round(currentTotalExpense / days)} per day</p>
                        </div>
                        <div style="padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; border-left: 4px solid var(--text-muted);">
                            <p style="font-size: 0.9rem; margin:0;"><strong>Expense Trend:</strong> ${expenseTrendHtml}</p>
                        </div>
                    </div>
                </div>

                <div class="glass-card" style="margin-bottom: var(--spacing-md); overflow-x: auto;">
                    <h2 class="text-gradient" style="margin-bottom: 8px;">Activity Heatmap</h2>
                    <p class="text-muted" style="font-size: 0.8rem; margin-bottom: 12px;">Darker blocks indicate higher spending intensity.</p>
                    <div id="cal-heatmap"></div>
                </div>
            `;

            // Draw Category Doughnut Chart
            const ctxCat = document.getElementById('category-chart');
            if (ctxCat && window.Chart && Object.keys(categoryTotals).length > 0) {
                new Chart(ctxCat, {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(categoryTotals),
                        datasets: [{
                            data: Object.values(categoryTotals),
                            backgroundColor: ['#FF5252', '#FF4081', '#7C4DFF', '#536DFE', '#00B0FF', '#00E676', '#FFD740', '#FFAB40', '#4CAF50'],
                            borderWidth: 0,
                            hoverOffset: 4
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#FFFFFF' } } } }
                });
            }

            // Draw Trend Bar Chart
            const ctxTrend = document.getElementById('trend-chart');
            if (ctxTrend && window.Chart) {
                // sort dailySpending by date keys isn't perfect this way, but works for simple view
                const trendLabels = Object.keys(dailySpending).slice(-14); // max 14 bars for mobile
                const trendData = trendLabels.map(l => dailySpending[l]);
                
                new Chart(ctxTrend, {
                    type: 'bar',
                    data: {
                        labels: trendLabels,
                        datasets: [{
                            label: 'Daily Expense',
                            data: trendData,
                            backgroundColor: 'rgba(63,223,209,0.7)',
                            borderRadius: 4
                        }]
                    },
                    options: { 
                        responsive: true, 
                        maintainAspectRatio: false, 
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { display: false },
                            x: { ticks: { color: '#8E8E93' }, grid: { display: false } }
                        }
                    }
                });
            }

            // Draw Cal-Heatmap
            if (window.CalHeatmap) {
                // Prepare heatmap data: { timestampInSeconds: value }
                const heatmapData = [];
                currentTx.forEach(tx => {
                    if (tx.type === 'expense') {
                        // We push objects { date, value } for cal-heatmap v4
                        heatmapData.push({
                            date: new Date(tx.timestamp).toISOString(),
                            value: parseFloat(tx.amount)
                        });
                    }
                });

                const cal = new CalHeatmap();
                // We use v4 syntax
                cal.paint({
                    itemSelector: '#cal-heatmap',
                    domain: { type: 'month', label: { text: 'MMM' } },
                    subDomain: { type: 'day', radius: 2, width: 12, height: 12, gutter: 2 },
                    date: { start: new Date(startDate) },
                    data: { source: heatmapData, x: 'date', y: 'value' },
                    scale: { color: { type: 'linear', range: ['#1e1e24', '#ff5252'], domain: [0, Math.max(1, highestVal/4)] } },
                    theme: 'dark'
                }, [
                    [ 'Tooltip', { text: function(d, v, d3) { return v ? `₹${v} on ${d3.timeFormat('%b %d')(d)}` : 'No spending'; } } ]
                ]);
            }

        } catch (error) {
            console.error("Analytics error:", error);
            contentDiv.innerHTML = `<p class="text-error">Failed to load analytics data.</p>`;
        }
    };

    // Initial render
    renderData(7);

    // Filter Buttons logic
    document.querySelectorAll('.time-filter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.time-filter').forEach(b => {
                b.style.background = 'rgba(255,255,255,0.1)';
                b.classList.remove('active');
            });
            const target = e.currentTarget;
            target.style.background = 'var(--primary)';
            target.classList.add('active');
            
            contentDiv.innerHTML = `<div class="skeleton" style="height: 300px; width: 100%; margin-bottom: 16px;"></div>`;
            renderData(parseInt(target.dataset.days));
        });
    });
}
