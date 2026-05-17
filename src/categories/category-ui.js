import { openBottomSheet, closeBottomSheet } from '../components/bottom-sheet.js';
import { getUserCategories, addCategory, deleteCategory } from './category-service.js';
import { getCurrentUser } from '../auth/auth-service.js';
import { showToast } from '../components/toast.js';

export async function openCategoryManager() {
    const user = getCurrentUser();
    if (!user) return;

    let categories = await getUserCategories(user.uid);

    const renderList = () => {
        return categories.map(c => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 32px; height: 32px; border-radius: 50%; background: ${c.color}20; color: ${c.color}; display: flex; align-items: center; justify-content: center;">
                        <span class="material-symbols-rounded" style="font-size: 18px;">${c.icon}</span>
                    </div>
                    <span>${c.name}</span>
                </div>
                <button class="btn-delete-cat" data-id="${c.id}" style="background: none; border: none; color: var(--expense); cursor: pointer; padding: 4px;">
                    <span class="material-symbols-rounded">delete</span>
                </button>
            </div>
        `).join('');
    };

    const colorOptions = [
        { val: '#FF5252', label: 'Red' },
        { val: '#00B0FF', label: 'Blue' },
        { val: '#4CAF50', label: 'Green' },
        { val: '#FFC107', label: 'Yellow' },
        { val: '#7C4DFF', label: 'Purple' },
        { val: '#FF4081', label: 'Pink' }
    ];
    
    const colorOptionsHtml = colorOptions.map(c => `
        <div class="custom-color-option" data-value="${c.val}" style="padding: 10px 12px; display:flex; align-items:center; gap:8px; cursor: pointer; transition: background 0.2s; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <div style="width:16px; height:16px; border-radius:50%; background:${c.val};"></div>
            <span style="color:${c.val};">${c.label}</span>
        </div>
    `).join('');

    const iconOptions = [
        { val: 'category', label: 'Default Icon' },
        { val: 'pets', label: 'Pets' },
        { val: 'sports_esports', label: 'Gaming' },
        { val: 'fitness_center', label: 'Fitness' },
        { val: 'shopping_cart', label: 'Groceries' },
        { val: 'home', label: 'Home' }
    ];

    const iconOptionsHtml = iconOptions.map(i => `
        <div class="custom-icon-option" data-value="${i.val}" style="padding: 10px 12px; display:flex; align-items:center; gap:8px; cursor: pointer; transition: background 0.2s; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <span class="material-symbols-rounded" style="font-size:18px;">${i.val}</span>
            <span>${i.label}</span>
        </div>
    `).join('');

    const html = `
        <h3 class="text-gradient" style="margin-bottom: var(--spacing-md); text-align:center;">Manage Categories</h3>
        
        <div id="cat-list-container" style="max-height: 250px; overflow-y: auto; margin-bottom: var(--spacing-md);">
            ${renderList()}
        </div>

        <h4 style="margin-bottom: var(--spacing-sm);">Add New Category</h4>
        <form id="add-cat-form" style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
            <div class="form-group" style="margin:0;">
                <input type="text" id="new-cat-name" required placeholder="Category Name" class="glass-input">
            </div>
            <div style="display: flex; gap: var(--spacing-sm);">
                <div class="form-group" style="margin:0; flex:1; position:relative;">
                    <div id="color-select-trigger" class="glass-input" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none;">
                        <span id="color-select-value" style="display:flex; align-items:center; gap:8px; color:#FF5252;"><div style="width:16px; height:16px; border-radius:50%; background:#FF5252;"></div>Red</span>
                        <span class="material-symbols-rounded">expand_more</span>
                    </div>
                    <div id="color-select-dropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-card); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid var(--border-light); border-radius: 8px; margin-top: 4px; z-index: 100; max-height: 200px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                        ${colorOptionsHtml}
                    </div>
                    <input type="hidden" id="new-cat-color" value="#FF5252">
                </div>
                <div class="form-group" style="margin:0; flex:1; position:relative;">
                    <div id="icon-select-trigger" class="glass-input" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none;">
                        <span id="icon-select-value" style="display:flex; align-items:center; gap:8px;"><span class="material-symbols-rounded" style="font-size:18px;">category</span>Default Icon</span>
                        <span class="material-symbols-rounded">expand_more</span>
                    </div>
                    <div id="icon-select-dropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-card); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid var(--border-light); border-radius: 8px; margin-top: 4px; z-index: 100; max-height: 200px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                        ${iconOptionsHtml}
                    </div>
                    <input type="hidden" id="new-cat-icon" value="category">
                </div>
            </div>
            <button type="submit" class="btn btn-primary" id="cat-submit-btn">Add Category</button>
        </form>
    `;

    openBottomSheet(html, () => {
        setupListeners(user.uid, renderList);
    });

    function setupListeners(uid, renderListFn) {
        
        // Custom Dropdown Logic (Color)
        const colTrigger = document.getElementById('color-select-trigger');
        const colDropdown = document.getElementById('color-select-dropdown');
        const colValueDisplay = document.getElementById('color-select-value');
        const hiddenColInput = document.getElementById('new-cat-color');

        colTrigger.addEventListener('click', () => {
            const isVisible = colDropdown.style.display === 'block';
            colDropdown.style.display = isVisible ? 'none' : 'block';
            document.getElementById('icon-select-dropdown').style.display = 'none';
        });

        document.querySelectorAll('.custom-color-option').forEach(opt => {
            opt.addEventListener('click', () => {
                hiddenColInput.value = opt.dataset.value;
                colValueDisplay.innerHTML = opt.innerHTML;
                colDropdown.style.display = 'none';
            });
            opt.addEventListener('mouseenter', () => opt.style.background = 'rgba(255,255,255,0.1)');
            opt.addEventListener('mouseleave', () => opt.style.background = 'transparent');
        });

        // Custom Dropdown Logic (Icon)
        const iconTrigger = document.getElementById('icon-select-trigger');
        const iconDropdown = document.getElementById('icon-select-dropdown');
        const iconValueDisplay = document.getElementById('icon-select-value');
        const hiddenIconInput = document.getElementById('new-cat-icon');

        iconTrigger.addEventListener('click', () => {
            const isVisible = iconDropdown.style.display === 'block';
            iconDropdown.style.display = isVisible ? 'none' : 'block';
            colDropdown.style.display = 'none';
        });

        document.querySelectorAll('.custom-icon-option').forEach(opt => {
            opt.addEventListener('click', () => {
                hiddenIconInput.value = opt.dataset.value;
                iconValueDisplay.innerHTML = opt.innerHTML;
                iconDropdown.style.display = 'none';
            });
            opt.addEventListener('mouseenter', () => opt.style.background = 'rgba(255,255,255,0.1)');
            opt.addEventListener('mouseleave', () => opt.style.background = 'transparent');
        });

        document.addEventListener('click', (e) => {
            if (!colTrigger.contains(e.target) && !colDropdown.contains(e.target)) colDropdown.style.display = 'none';
            if (!iconTrigger.contains(e.target) && !iconDropdown.contains(e.target)) iconDropdown.style.display = 'none';
        });

        // Handle Deletes
        const attachDeleteListeners = () => {
            document.querySelectorAll('.btn-delete-cat').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.dataset.id;
                    if(confirm("Delete this category?")) {
                        try {
                            await deleteCategory(uid, id);
                            categories = categories.filter(c => c.id !== id);
                            document.getElementById('cat-list-container').innerHTML = renderListFn();
                            attachDeleteListeners();
                            showToast("Category deleted", "success");
                            
                            window.dispatchEvent(new Event('categories-updated'));
                        } catch (err) {
                            showToast("Failed to delete", "error");
                        }
                    }
                });
            });
        };
        attachDeleteListeners();

        // Handle Add
        document.getElementById('add-cat-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('cat-submit-btn');
            btn.innerText = "Adding...";
            btn.disabled = true;

            const name = document.getElementById('new-cat-name').value;
            const color = document.getElementById('new-cat-color').value;
            const icon = document.getElementById('new-cat-icon').value;

            try {
                const newCat = await addCategory(uid, { name, color, icon });
                categories.push(newCat);
                document.getElementById('cat-list-container').innerHTML = renderListFn();
                attachDeleteListeners();
                
                document.getElementById('new-cat-name').value = '';
                showToast("Category added", "success");
                
                window.dispatchEvent(new Event('categories-updated'));
            } catch (err) {
                showToast("Failed to add category", "error");
            } finally {
                btn.innerText = "Add Category";
                btn.disabled = false;
            }
        });
    }
}
