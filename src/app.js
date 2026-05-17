import { initRouter } from './utils/router.js';
import { initAuth } from './auth/auth-service.js';
import { openAddExpenseSheet } from './transactions/add-expense.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("Expence App Initialized");
    
    // Initialize Auth (will handle UI toggle)
    initAuth();

    // Initialize Navigation Router
    initRouter();
    
    // Setup FAB action
    const fab = document.getElementById('fab-add');
    if(fab) {
        fab.addEventListener('click', () => {
            openAddExpenseSheet();
        });
    }

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }
});
