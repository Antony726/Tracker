/**
 * Utility functions for DOM manipulation
 */

// Show an element by removing 'hidden' class
export function showElement(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.classList.remove('hidden');
}

// Hide an element by adding 'hidden' class
export function hideElement(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.classList.add('hidden');
}

// Format currency to INR
export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
}

// Format Date
export function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
