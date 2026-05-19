let allCharacters = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchCharacters();

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterCharacters(searchTerm);
        });
    }
});

async function fetchCharacters() {
    const loader = document.getElementById('loader');
    const grid = document.getElementById('charactersGrid');
    const emptyState = document.getElementById('emptyState');

    try {
        const response = await fetch(`${API_URL}/characters`);
        const data = await response.json();

        if (data.success) {
            allCharacters = data.data;
            loader.style.display = 'none';
            
            if (allCharacters.length > 0) {
                renderCharacters(allCharacters);
                grid.style.display = 'grid';
                emptyState.style.display = 'none';
            } else {
                grid.style.display = 'none';
                emptyState.style.display = 'block';
            }
        } else {
            showNotification('Failed to load characters', 'error');
        }
    } catch (error) {
        console.error('Error fetching characters:', error);
        loader.style.display = 'none';
        showNotification('Server error while loading characters', 'error');
    }
}

function renderCharacters(characters) {
    const grid = document.getElementById('charactersGrid');
    grid.innerHTML = '';

    characters.forEach(char => {
        const card = document.createElement('div');
        card.className = 'card';
        
        const imgSrc = char.image ? char.image : '';
        const imgHtml = imgSrc 
            ? `<img src="${imgSrc}" alt="${char.name}" class="card-img" onerror="this.onerror=null; this.parentNode.innerHTML='<div class=\\'card-img-placeholder\\'>👤</div>';">`
            : `<div class="card-img-placeholder">👤</div>`;

        card.innerHTML = `
            <div class="card-img-container">
                ${imgHtml}
            </div>
            <div class="card-content">
                <h3 class="card-title">${char.name}</h3>
                <p class="card-desc">${char.description || 'No description available.'}</p>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

function filterCharacters(searchTerm) {
    const filtered = allCharacters.filter(char => 
        char.name.toLowerCase().includes(searchTerm) || 
        (char.description && char.description.toLowerCase().includes(searchTerm))
    );

    const grid = document.getElementById('charactersGrid');
    const emptyState = document.getElementById('emptyState');

    if (filtered.length > 0) {
        renderCharacters(filtered);
        grid.style.display = 'grid';
        emptyState.style.display = 'none';
    } else {
        grid.style.display = 'none';
        emptyState.style.display = 'block';
    }
}
