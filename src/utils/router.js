import { loadDashboardData } from '../dashboard/dashboard.js';
import { loadAnalyticsData } from '../analytics/analytics.js';
import { loadBudgetUI } from '../budget/budget-ui.js';
import { loadProfileUI } from '../profile/profile.js';

export function initRouter() {
    const navItems = document.querySelectorAll('.nav-item');
    const mainContent = document.getElementById('main-content');
    
    // Simple routing logic based on hash
    function handleRoute() {
        let hash = window.location.hash.replace('#', '') || 'home';
        
        // Update active nav item
        navItems.forEach(item => {
            if (item.dataset.route === hash) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Load page content (Mocked for now, will dynamically import or render)
        loadPage(hash, mainContent);
    }
    
    window.addEventListener('hashchange', handleRoute);
    
    // Trigger initial route
    handleRoute();
}

function loadPage(route, container) {
    // Basic Page Shells for Phase 1
    switch (route) {
        case 'home':
            container.innerHTML = `<div class="skeleton" style="height: 100px; width: 100%; margin-bottom: 20px;"></div>
                                   <div class="skeleton" style="height: 200px; width: 100%;"></div>`;
            loadDashboardData(container);
            break;
        case 'analytics':
            container.innerHTML = `<div class="skeleton" style="height: 300px; width: 100%;"></div>`;
            loadAnalyticsData(container);
            break;
        case 'budget':
            container.innerHTML = `<div class="skeleton" style="height: 200px; width: 100%;"></div>`;
            loadBudgetUI(container);
            break;
        case 'profile':
            container.innerHTML = `<div class="skeleton" style="height: 200px; width: 100%;"></div>`;
            loadProfileUI(container);
            break;
        default:
            container.innerHTML = `<h2>Page Not Found</h2>`;
    }
    
    // Add page transition animation with GSAP if loaded
    if (window.gsap) {
        gsap.fromTo(container.children, 
            { y: 20, opacity: 0 }, 
            { y: 0, opacity: 1, duration: 0.4, stagger: 0.1, ease: 'power2.out' }
        );
    }
}
