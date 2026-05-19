document.addEventListener('DOMContentLoaded', () => {
    // Setup file uploads
    setupFileUpload('charUploadArea', 'charImage', 'charImagePreview', 'charImgElement', 'charClearPreview');
    setupFileUpload('duelUploadArea', 'duelImage', 'duelImagePreview', 'duelImgElement', 'duelClearPreview');

    // Forms
    const charForm = document.getElementById('characterForm');
    if (charForm) {
        charForm.addEventListener('submit', handleCharacterSubmit);
    }

    const duelForm = document.getElementById('duelForm');
    if (duelForm) {
        duelForm.addEventListener('submit', handleDuelSubmit);
    }

    const charCancelBtn = document.getElementById('charCancelBtn');
    if (charCancelBtn) {
        charCancelBtn.addEventListener('click', resetCharacterForm);
    }

    const duelCancelBtn = document.getElementById('duelCancelBtn');
    if (duelCancelBtn) {
        duelCancelBtn.addEventListener('click', resetDuelForm);
    }

    // Initial load
    loadData();

    // Close custom selects on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-select')) {
            document.querySelectorAll('.custom-select').forEach(el => el.classList.remove('active'));
        }
    });
});

window.updateSelectText = function(optionsId) {
    const options = document.getElementById(optionsId);
    const textSpan = document.getElementById(optionsId.replace('Options', 'SelectText'));
    const checked = Array.from(options.querySelectorAll('input:checked'));
    if (checked.length === 0) {
        textSpan.textContent = 'Select characters...';
    } else if (checked.length === 1) {
        textSpan.textContent = checked[0].dataset.name;
    } else {
        textSpan.textContent = `${checked.length} characters selected`;
    }
};

window.filterDropdown = function(input, optionsId) {
    const filter = input.value.toLowerCase();
    const options = document.getElementById(optionsId).getElementsByTagName('label');
    for (let i = 0; i < options.length; i++) {
        const text = options[i].textContent || options[i].innerText;
        if (text.toLowerCase().indexOf(filter) > -1) {
            options[i].style.display = "";
        } else {
            options[i].style.display = "none";
        }
    }
};

// Setup drag/drop and preview for file inputs
function setupFileUpload(areaId, inputId, previewBoxId, imgElementId, clearBtnId) {
    const area = document.getElementById(areaId);
    const input = document.getElementById(inputId);
    const previewBox = document.getElementById(previewBoxId);
    const imgElement = document.getElementById(imgElementId);
    const clearBtn = document.getElementById(clearBtnId);

    if (!area || !input) return;

    // Click to open file dialog
    area.addEventListener('click', () => input.click());

    // Drag and drop events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        area.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        area.addEventListener(eventName, () => area.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        area.addEventListener(eventName, () => area.classList.remove('dragover'), false);
    });

    area.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            input.files = files;
            handleFiles(files);
        }
    });

    input.addEventListener('change', function() {
        if (this.files && this.files.length > 0) {
            handleFiles(this.files);
        }
    });

    function handleFiles(files) {
        const file = files[0];
        if (!file.type.match('image.*')) {
            showNotification('Please select an image file', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            imgElement.src = e.target.result;
            previewBox.style.display = 'block';
            area.style.display = 'none';
        }
        reader.readAsDataURL(file);
    }

    clearBtn.addEventListener('click', () => {
        input.value = '';
        imgElement.src = '';
        previewBox.style.display = 'none';
        area.style.display = 'block';
    });
}

// Data loading
async function loadData() {
    await Promise.all([
        loadCharacters(),
        loadDuels()
    ]);
}

async function loadCharacters() {
    const loader = document.getElementById('manageCharactersLoader');
    const list = document.getElementById('manageCharactersList');
    const ramaOptions = document.getElementById('ramaOptions');
    const ravanaOptions = document.getElementById('ravanaOptions');

    try {
        const res = await fetch(`${API_URL}/characters`);
        const data = await res.json();

        if (data.success) {
            loader.style.display = 'none';
            
            // Populate lists
            list.innerHTML = '';
            ramaOptions.innerHTML = '';
            ravanaOptions.innerHTML = '';

            if (data.data.length === 0) {
                list.innerHTML = '<li class="admin-list-item" style="justify-content:center; color:#999;">No characters found</li>';
            } else {
                data.data.forEach(char => {
                    // List item
                    const li = document.createElement('li');
                    li.className = 'admin-list-item';
                    
                    const imgHtml = char.image 
                        ? `<img src="${char.image}" class="item-img" alt="">`
                        : `<div class="item-img" style="display:flex;align-items:center;justify-content:center;">👤</div>`;

                    li.innerHTML = `
                        <div class="item-info">
                            ${imgHtml}
                            <div>
                                <div class="item-title">${char.name}</div>
                                <div class="item-subtitle">${char.description || 'No description'}</div>
                            </div>
                        </div>
                        <div>
                            <button class="btn btn-secondary btn-small" onclick="editCharacter(${char.id})">Edit</button>
                            <button class="btn btn-danger btn-small" onclick="deleteCharacter(${char.id})">Delete</button>
                        </div>
                    `;
                    list.appendChild(li);

                    // Dropdown options
                    const checkboxHtml = `
                        <div class="select-option">
                            <label style="display:flex; align-items:center; gap:0.5rem; width:100%; cursor:pointer;">
                                <input type="checkbox" class="participant-cb" value="${char.id}" data-name="${char.name}" onchange="updateSelectText(this.closest('.dropdown-options-list').id)">
                                ${char.name}
                            </label>
                            <label title="Died in this duel?" style="cursor:pointer; display:flex; align-items:center; gap:0.2rem;">
                                <input type="checkbox" class="death-cb" value="${char.id}"> ☠️
                            </label>
                        </div>
                    `;
                    ramaOptions.insertAdjacentHTML('beforeend', checkboxHtml);
                    ravanaOptions.insertAdjacentHTML('beforeend', checkboxHtml);
                });
            }
        }
    } catch (err) {
        console.error('Error loading characters:', err);
        showNotification('Error loading characters', 'error');
    }
}

async function loadDuels() {
    const loader = document.getElementById('manageDuelsLoader');
    const list = document.getElementById('manageDuelsList');

    try {
        const res = await fetch(`${API_URL}/duels`);
        const data = await res.json();

        if (data.success) {
            loader.style.display = 'none';
            list.innerHTML = '';

            if (data.data.length === 0) {
                list.innerHTML = '<li class="admin-list-item" style="justify-content:center; color:#999;">No duels found</li>';
            } else {
                data.data.forEach(duel => {
                    const li = document.createElement('li');
                    li.className = 'admin-list-item';
                    
                    const title = `Day ${duel.day || 1} (Order: ${duel.order_index || 0}): Rama Army vs Ravana Army (ID: ${duel.id})`;
                    
                    li.innerHTML = `
                        <div class="item-info">
                            <div class="item-img" style="display:flex;align-items:center;justify-content:center;">⚔️</div>
                            <div>
                                <div class="item-title">${title}</div>
                                <div class="item-subtitle">${duel.description || 'No description'}</div>
                            </div>
                        </div>
                        <div>
                            <button class="btn btn-secondary btn-small" onclick="editDuel(${duel.id})">Edit</button>
                            <button class="btn btn-danger btn-small" onclick="deleteDuel(${duel.id})">Delete</button>
                        </div>
                    `;
                    list.appendChild(li);
                });
            }
        }
    } catch (err) {
        console.error('Error loading duels:', err);
        showNotification('Error loading duels', 'error');
    }
}

// Submissions
async function handleCharacterSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('charName').value;
    const desc = document.getElementById('charDesc').value;
    const imageInput = document.getElementById('charImage');
    const form = document.getElementById('characterForm');
    const mode = form.dataset.mode || 'add';
    const id = form.dataset.id;
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', desc);
    
    if (imageInput.files.length > 0) {
        formData.append('image', imageInput.files[0]);
    }

    try {
        const url = mode === 'add' ? `${API_URL}/characters` : `${API_URL}/characters/${id}`;
        const method = mode === 'add' ? 'POST' : 'PUT';

        const res = await fetch(url, {
            method: method,
            body: formData
        });
        
        const data = await res.json();
        
        if (data.success) {
            showNotification(`Character ${mode === 'add' ? 'added' : 'updated'} successfully!`);
            resetCharacterForm();
            loadData(); // Reload lists
        } else {
            showNotification(data.error || `Failed to ${mode} character`, 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('Server error', 'error');
    }
}

function resetCharacterForm() {
    const form = document.getElementById('characterForm');
    form.reset();
    form.dataset.mode = 'add';
    form.dataset.id = '';
    document.getElementById('charFormTitle').textContent = 'Add Character';
    document.getElementById('charSubmitBtn').textContent = 'Save Character';
    document.getElementById('charCancelBtn').style.display = 'none';
    document.getElementById('charClearPreview').click();
}

async function handleDuelSubmit(e) {
    e.preventDefault();
    
    const desc = document.getElementById('duelDesc').value;
    const day = document.getElementById('duelDay').value;
    const orderIndex = document.getElementById('duelOrder').value;
    const imageInput = document.getElementById('duelImage');
    const form = document.getElementById('duelForm');
    const mode = form.dataset.mode || 'add';
    const id = form.dataset.id;
    
    // Get selected IDs
    const ramaIds = Array.from(document.querySelectorAll('#ramaOptions .participant-cb:checked')).map(cb => cb.value);
    const ravanaIds = Array.from(document.querySelectorAll('#ravanaOptions .participant-cb:checked')).map(cb => cb.value);
    
    const ramaDeadIds = Array.from(document.querySelectorAll('#ramaOptions .death-cb:checked')).map(cb => cb.value);
    const ravanaDeadIds = Array.from(document.querySelectorAll('#ravanaOptions .death-cb:checked')).map(cb => cb.value);
    
    if (ramaIds.length === 0 && ravanaIds.length === 0) {
        showNotification('Please select at least one character for the armies', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('day', day);
    formData.append('order_index', orderIndex);
    formData.append('description', desc);
    formData.append('rama_ids', JSON.stringify(ramaIds));
    formData.append('ravana_ids', JSON.stringify(ravanaIds));
    formData.append('rama_dead_ids', JSON.stringify(ramaDeadIds));
    formData.append('ravana_dead_ids', JSON.stringify(ravanaDeadIds));
    
    if (imageInput.files.length > 0) {
        formData.append('image', imageInput.files[0]);
    }

    try {
        const url = mode === 'add' ? `${API_URL}/duels` : `${API_URL}/duels/${id}`;
        const method = mode === 'add' ? 'POST' : 'PUT';

        const res = await fetch(url, {
            method: method,
            body: formData
        });
        
        const data = await res.json();
        
        if (data.success) {
            showNotification(`Duel ${mode === 'add' ? 'added' : 'updated'} successfully!`);
            resetDuelForm();
            loadData();
        } else {
            showNotification(data.error || `Failed to ${mode} duel`, 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('Server error', 'error');
    }
}

function resetDuelForm() {
    const form = document.getElementById('duelForm');
    form.reset();
    document.getElementById('duelDay').value = 1;
    document.getElementById('duelOrder').value = 0;
    document.querySelectorAll('#ramaOptions input[type="checkbox"], #ravanaOptions input[type="checkbox"]').forEach(cb => cb.checked = false);
    updateSelectText('ramaOptions');
    updateSelectText('ravanaOptions');
    form.dataset.mode = 'add';
    form.dataset.id = '';
    document.getElementById('duelFormTitle').textContent = 'Add Duel';
    document.getElementById('duelSubmitBtn').textContent = 'Save Duel';
    document.getElementById('duelCancelBtn').style.display = 'none';
    document.getElementById('duelClearPreview').click();
}

// Deletions
window.deleteCharacter = async function(id) {
    if (!confirm('Are you sure you want to delete this character? This will also remove them from any duels.')) return;

    try {
        const res = await fetch(`${API_URL}/characters/${id}`, { method: 'DELETE' });
        const data = await res.json();
        
        if (data.success) {
            showNotification('Character deleted');
            // If editing this character, reset form
            const form = document.getElementById('characterForm');
            if (form.dataset.mode === 'edit' && form.dataset.id == id) {
                resetCharacterForm();
            }
            loadData();
        } else {
            showNotification(data.error || 'Failed to delete character', 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('Server error', 'error');
    }
};

window.deleteDuel = async function(id) {
    if (!confirm('Are you sure you want to delete this duel?')) return;

    try {
        const res = await fetch(`${API_URL}/duels/${id}`, { method: 'DELETE' });
        const data = await res.json();
        
        if (data.success) {
            showNotification('Duel deleted');
            // If editing this duel, reset form
            const form = document.getElementById('duelForm');
            if (form.dataset.mode === 'edit' && form.dataset.id == id) {
                resetDuelForm();
            }
            loadData();
        } else {
            showNotification(data.error || 'Failed to delete duel', 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('Server error', 'error');
    }
};

// Edits
window.editCharacter = async function(id) {
    try {
        const res = await fetch(`${API_URL}/characters/${id}`);
        const data = await res.json();
        if (data.success) {
            const char = data.data;
            document.getElementById('charName').value = char.name;
            document.getElementById('charDesc').value = char.description || '';
            document.getElementById('charFormTitle').textContent = 'Edit Character';
            document.getElementById('charSubmitBtn').textContent = 'Update Character';
            document.getElementById('charCancelBtn').style.display = 'block';
            document.getElementById('characterForm').dataset.mode = 'edit';
            document.getElementById('characterForm').dataset.id = id;
            if (char.image) {
                const imgElement = document.getElementById('charImgElement');
                imgElement.src = char.image;
                document.getElementById('charImagePreview').style.display = 'block';
                document.getElementById('charUploadArea').style.display = 'none';
            } else {
                document.getElementById('charClearPreview').click();
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            showNotification('Character not found', 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('Error loading character', 'error');
    }
};

window.editDuel = async function(id) {
    try {
        const res = await fetch(`${API_URL}/duels/${id}`);
        const data = await res.json();
        if (data.success) {
            const duel = data.data;
            document.getElementById('duelDay').value = duel.day || 1;
            document.getElementById('duelOrder').value = duel.order_index || 0;
            document.getElementById('duelDesc').value = duel.description || '';
            
            document.querySelectorAll('#ramaOptions .participant-cb').forEach(cb => {
                cb.checked = duel.rama_army.some(p => p.id == cb.value);
            });
            document.querySelectorAll('#ramaOptions .death-cb').forEach(cb => {
                cb.checked = duel.rama_army.some(p => p.id == cb.value && p.is_dead);
            });
            document.querySelectorAll('#ravanaOptions .participant-cb').forEach(cb => {
                cb.checked = duel.ravana_army.some(p => p.id == cb.value);
            });
            document.querySelectorAll('#ravanaOptions .death-cb').forEach(cb => {
                cb.checked = duel.ravana_army.some(p => p.id == cb.value && p.is_dead);
            });
            updateSelectText('ramaOptions');
            updateSelectText('ravanaOptions');

            document.getElementById('duelFormTitle').textContent = 'Edit Duel';
            document.getElementById('duelSubmitBtn').textContent = 'Update Duel';
            document.getElementById('duelCancelBtn').style.display = 'block';
            document.getElementById('duelForm').dataset.mode = 'edit';
            document.getElementById('duelForm').dataset.id = id;
            if (duel.image) {
                const imgElement = document.getElementById('duelImgElement');
                imgElement.src = duel.image;
                document.getElementById('duelImagePreview').style.display = 'block';
                document.getElementById('duelUploadArea').style.display = 'none';
            } else {
                document.getElementById('duelClearPreview').click();
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            showNotification('Duel not found', 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('Error loading duel', 'error');
    }
};
