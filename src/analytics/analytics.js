import { getTransactionsByDate } from '../transactions/transaction-service.js';
import { getCurrentUser } from '../auth/auth-service.js';

export async function loadAnalyticsData(container) {
    const user = getCurrentUser();
    if (!user) {
        container.innerHTML = `<p class="text-error">Please log in to view analytics.</p>`;
        return;
    }

    // Segment Switcher and Time Filter Shell
    container.innerHTML = `
        <!-- Analytics Type Segmented Control -->
        <div style="display: flex; background: rgba(255,255,255,0.05); border: 1px solid var(--border-light); border-radius: 12px; padding: 4px; margin-bottom: var(--spacing-sm);">
            <button class="btn analytics-type-btn active" data-type="personal" style="flex: 1; padding: 8px; border-radius: 8px; font-size: 0.85rem; background: var(--primary); color: white; border: none; font-weight: 600; font-family: var(--font-family); cursor: pointer; transition: all 0.2s;">Personal Analytics</button>
            <button class="btn analytics-type-btn" data-type="total" style="flex: 1; padding: 8px; border-radius: 8px; font-size: 0.85rem; background: transparent; color: var(--text-muted); border: none; font-weight: 500; font-family: var(--font-family); cursor: pointer; transition: all 0.2s;">Total Analytics</button>
        </div>

        <!-- Time Range Filters -->
        <div style="display: flex; gap: var(--spacing-sm); margin-bottom: var(--spacing-md); overflow-x: auto; padding-bottom: 4px;">
            <button class="btn time-filter active" data-days="7" style="padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; background: var(--primary); color: white; border: none; white-space: nowrap; cursor: pointer;">7 Days</button>
            <button class="btn time-filter" data-days="30" style="padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; background: rgba(255,255,255,0.1); color: white; border: none; white-space: nowrap; cursor: pointer;">30 Days</button>
            <button class="btn time-filter" data-days="90" style="padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; background: rgba(255,255,255,0.1); color: white; border: none; white-space: nowrap; cursor: pointer;">90 Days</button>
            <button class="btn time-filter" data-days="365" style="padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; background: rgba(255,255,255,0.1); color: white; border: none; white-space: nowrap; cursor: pointer;">1 Year</button>
        </div>

        <div id="analytics-content">
            <div class="skeleton" style="height: 300px; width: 100%; margin-bottom: 16px;"></div>
            <div class="skeleton" style="height: 200px; width: 100%;"></div>
        </div>
    `;

    const contentDiv = document.getElementById('analytics-content');
    
    let currentDays = 7;
    let currentType = 'personal'; // personal (only personal expenses) vs. total (all expenses)

    const renderData = async () => {
        try {
            contentDiv.innerHTML = `
                <div class="skeleton" style="height: 300px; width: 100%; margin-bottom: 16px;"></div>
                <div class="skeleton" style="height: 200px; width: 100%;"></div>
            `;

            const endDate = Date.now();
            const startDate = endDate - (currentDays * 24 * 60 * 60 * 1000);
            
            // For comparison, get the previous period
            const prevStartDate = startDate - (currentDays * 24 * 60 * 60 * 1000);
            
            const currentTxRaw = await getTransactionsByDate(user.uid, startDate, endDate);
            const prevTxRaw = await getTransactionsByDate(user.uid, prevStartDate, startDate);
            
            // Client-side filtering based on selected analytics type
            const currentTx = currentTxRaw.filter(tx => {
                if (tx.type === 'expense') {
                    return currentType === 'total' || tx.expenseMode === 'personal';
                }
                return true; // incomes are personal by definition
            });

            const prevTx = prevTxRaw.filter(tx => {
                if (tx.type === 'expense') {
                    return currentType === 'total' || tx.expenseMode === 'personal';
                }
                return true;
            });
            
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
                    <h2 class="text-gradient">${currentType === 'personal' ? 'Personal' : 'Total'} Expense Breakdown</h2>
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
                            <p style="font-size: 0.9rem; margin:0;"><strong>Top Spending Category:</strong> <b>${highestCat || 'N/A'}</b> (${formatCurrency(highestVal)})</p>
                        </div>
                        <div style="padding: 12px; background: rgba(63,223,209,0.1); border-radius: 8px; border-left: 4px solid var(--accent-teal);">
                            <p style="font-size: 0.9rem; margin:0;"><strong>Daily Average:</strong> ${formatCurrency(Math.round(currentTotalExpense / currentDays))} per day</p>
                        </div>
                        <div style="padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; border-left: 4px solid var(--text-muted);">
                            <p style="font-size: 0.9rem; margin:0;"><strong>Expense Trend:</strong> ${expenseTrendHtml}</p>
                        </div>
                    </div>
                </div>

                <div class="glass-card" style="margin-bottom: var(--spacing-md); overflow-x: auto;">
                    <h2 class="text-gradient" style="margin-bottom: 8px;">Activity Heatmap</h2>
                    <p class="text-muted" style="font-size: 0.8rem; margin-bottom: 12px;">Darker blocks indicate higher spending intensity.</p>
                    <div style="min-width: 320px; display: flex; justify-content: center; padding: 8px 0;">
                        <div id="cal-heatmap"></div>
                    </div>
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
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#FFFFFF', font: { family: 'Outfit' } } } } }
                });
            }

            // Draw Trend Bar Chart
            const ctxTrend = document.getElementById('trend-chart');
            if (ctxTrend && window.Chart) {
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
                            x: { ticks: { color: '#8E8E93', font: { family: 'Outfit' } }, grid: { display: false } }
                        }
                    }
                });
            }

            // Draw Cal-Heatmap (with Popper and Tooltip Plugin Support)
            if (window.CalHeatmap) {
                const heatmapData = [];
                currentTx.forEach(tx => {
                    if (tx.type === 'expense') {
                        heatmapData.push({
                            date: new Date(tx.timestamp).toISOString(),
                            value: parseFloat(tx.amount)
                        });
                    }
                });

                // Calculate required domain range (months count) dynamically based on date filter
                const monthRange = Math.max(1, Math.ceil(currentDays / 30) + 1);

                const cal = new CalHeatmap();
                
                // Set up visual config
                const paintOptions = {
                    itemSelector: '#cal-heatmap',
                    range: monthRange,
                    domain: { 
                        type: 'month', 
                        label: { text: 'MMM', color: '#8E8E93', font: { family: 'Outfit' } } 
                    },
                    subDomain: { type: 'day', radius: 2, width: 12, height: 12, gutter: 2 },
                    date: { start: new Date(startDate) },
                    data: { source: heatmapData, x: 'date', y: 'value' },
                    scale: { 
                        color: { 
                            type: 'linear', 
                            range: ['rgba(255,255,255,0.03)', '#6c5dd3'], 
                            domain: [0, Math.max(1, highestVal / 4)] 
                        } 
                    },
                    theme: 'dark'
                };

                // Add Tooltip plugin array if the Tooltip class is available on window
                const plugins = [];
                if (window.Tooltip) {
                    plugins.push([
                        window.Tooltip, 
                        { 
                            text: (timestamp, value, dayjsDate) => {
                                return value ? `₹${value} on ${dayjsDate.format('MMM DD, YYYY')}` : 'No spending';
                            }
                        }
                    ]);
                }

                cal.paint(paintOptions, plugins);
            }

        } catch (error) {
            console.error("Analytics error:", error);
            contentDiv.innerHTML = `<p class="text-error">Failed to load analytics data.</p>`;
        }
    };

    // Initial render
    renderData();

    // Type Switcher Logic
    document.querySelectorAll('.analytics-type-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.analytics-type-btn').forEach(b => {
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

            currentType = target.dataset.type;
            renderData();
        });
    });

    // Time Filter Buttons logic
    document.querySelectorAll('.time-filter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.time-filter').forEach(b => {
                b.style.background = 'rgba(255,255,255,0.1)';
                b.classList.remove('active');
            });
            const target = e.currentTarget;
            target.style.background = 'var(--primary)';
            target.classList.add('active');
            
            currentDays = parseInt(target.dataset.days);
            renderData();
        });
    });
}
