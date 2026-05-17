/**
 * Global GSAP Animation Utilities
 */

// Animate numbers counting up (e.g., for balances)
export function animateCounter(element, targetValue, duration = 1.5) {
    if (!window.gsap) {
        element.innerText = targetValue;
        return;
    }
    
    // We use a dummy object to tween the value
    const obj = { val: 0 };
    
    // Parse current value if possible, else 0
    let currentText = element.innerText.replace(/[^0-9.-]+/g,"");
    if(currentText) obj.val = parseFloat(currentText);

    gsap.to(obj, {
        val: targetValue,
        duration: duration,
        ease: "power2.out",
        onUpdate: function() {
            // Format as INR
            element.innerText = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR'
            }).format(obj.val);
        }
    });
}

// Page transition out
export function animatePageOut(container, callback) {
    if(!window.gsap) {
        if(callback) callback();
        return;
    }
    gsap.to(container.children, {
        y: -20,
        opacity: 0,
        duration: 0.3,
        stagger: 0.05,
        ease: "power2.in",
        onComplete: callback
    });
}
