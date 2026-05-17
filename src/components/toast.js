export function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} glass-card`;
    
    // Icon based on type
    const icon = type === 'success' ? 'check_circle' : (type === 'error' ? 'error' : 'info');
    
    toast.innerHTML = `
        <span class="material-symbols-rounded">${icon}</span>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Animate in
    if (window.gsap) {
        gsap.fromTo(toast, 
            { y: 50, opacity: 0 }, 
            { y: 0, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' }
        );
    }
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (window.gsap) {
            gsap.to(toast, {
                y: -20, opacity: 0, duration: 0.3, onComplete: () => {
                    toast.remove();
                }
            });
        } else {
            toast.remove();
        }
    }, 3000);
}
