export function openBottomSheet(contentHtml, onOpen = null) {
    const container = document.getElementById('bottom-sheet-container');
    const sheet = container.querySelector('.bottom-sheet');
    
    // Insert HTML
    sheet.innerHTML = `
        <div class="sheet-handle"></div>
        <div class="sheet-content">
            ${contentHtml}
        </div>
    `;
    
    // Show container
    container.classList.remove('hidden');
    
    // Animate sheet up
    if (window.gsap) {
        gsap.fromTo(sheet, 
            { y: '100%' }, 
            { y: '0%', duration: 0.4, ease: 'power3.out', onComplete: onOpen }
        );
        gsap.fromTo(container,
            { backgroundColor: 'rgba(0,0,0,0)' },
            { backgroundColor: 'rgba(0,0,0,0.6)', duration: 0.4 }
        );
    }
    
    // Close on overlay click
    container.onclick = (e) => {
        if (e.target === container) {
            closeBottomSheet();
        }
    };
    
    // Add swipe down to close logic (basic implementation)
    let startY = 0;
    const handle = sheet.querySelector('.sheet-handle');
    handle.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
    }, {passive: true});
    
    handle.addEventListener('touchmove', (e) => {
        const deltaY = e.touches[0].clientY - startY;
        if (deltaY > 0) {
            sheet.style.transform = `translateY(${deltaY}px)`;
        }
    }, {passive: true});
    
    handle.addEventListener('touchend', (e) => {
        const deltaY = e.changedTouches[0].clientY - startY;
        sheet.style.transform = ''; // reset style
        if (deltaY > 50) {
            closeBottomSheet();
        }
    });
}

export function closeBottomSheet() {
    const container = document.getElementById('bottom-sheet-container');
    const sheet = container.querySelector('.bottom-sheet');
    
    if (window.gsap) {
        gsap.to(sheet, {
            y: '100%', duration: 0.3, ease: 'power3.in'
        });
        gsap.to(container, {
            backgroundColor: 'rgba(0,0,0,0)', duration: 0.3, onComplete: () => {
                container.classList.add('hidden');
                sheet.innerHTML = '';
            }
        });
    } else {
        container.classList.add('hidden');
        sheet.innerHTML = '';
    }
}
