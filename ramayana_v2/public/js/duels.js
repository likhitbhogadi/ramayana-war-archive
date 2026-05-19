document.addEventListener('DOMContentLoaded', () => {
    fetchDuels();
});

async function fetchDuels() {
    const loader = document.getElementById('loader');
    const container = document.getElementById('duelsContainer');
    const emptyState = document.getElementById('emptyState');

    try {
        const [duelsRes, charsRes] = await Promise.all([
            fetch(`${API_URL}/duels`),
            fetch(`${API_URL}/characters`)
        ]);
        const data = await duelsRes.json();
        const charsData = await charsRes.json();

        if (data.success && charsData.success) {
            loader.style.display = 'none';
            
            if (data.data.length > 0) {
                renderDuels(data.data, charsData.data);
                container.style.display = 'block';
                emptyState.style.display = 'none';
            } else {
                container.style.display = 'none';
                emptyState.style.display = 'block';
            }
        } else {
            showNotification('Failed to load duels', 'error');
        }
    } catch (error) {
        console.error('Error fetching duels:', error);
        loader.style.display = 'none';
        showNotification('Server error while loading duels', 'error');
    }
}

function renderDuels(duels, allCharacters) {
    const container = document.getElementById('duelsContainer');
    const nav = document.getElementById('dayNavigation');
    container.innerHTML = '';
    
    if (nav) nav.innerHTML = '';

    const deadSet = new Set();
    const ramaArmySet = new Set();
    const ravanaArmySet = new Set();

    // Group by day
    const duelsByDay = {};
    duels.forEach(duel => {
        const day = duel.day || 1;
        if (!duelsByDay[day]) {
            duelsByDay[day] = [];
        }
        duelsByDay[day].push(duel);
    });

    // Sort days
    const sortedDays = Object.keys(duelsByDay).map(Number).sort((a, b) => a - b);

    // Render nav links
    if (nav) {
        sortedDays.forEach(day => {
            const link = document.createElement('a');
            link.href = `#day-${day}`;
            link.className = 'btn btn-secondary btn-small';
            link.textContent = `Day ${day}`;
            nav.appendChild(link);
        });
    }

    // Render sections
    sortedDays.forEach(day => {
        const section = document.createElement('div');
        section.id = `day-${day}`;
        section.style.paddingTop = '100px'; // Offset for sticky navbar
        section.style.marginTop = '-80px';
        section.style.marginBottom = '3rem';

        const dayTitle = document.createElement('h2');
        dayTitle.textContent = `Day ${day} Confrontations`;
        dayTitle.style.marginBottom = '2rem';
        dayTitle.style.color = 'var(--secondary-color)';
        dayTitle.style.borderBottom = '2px solid var(--border-color)';
        dayTitle.style.paddingBottom = '0.5rem';
        section.appendChild(dayTitle);

        duelsByDay[day].forEach(duel => {
            const card = document.createElement('div');
            card.className = 'duel-card';
            
            const renderArmy = (army, title, isRama) => {
                if (!army || army.length === 0) return `<div class="army-section"><h4 class="army-title">${title}</h4><p style="text-align:center; color:#999;">Unknown</p></div>`;
                
                const warriorsHtml = army.map(warrior => {
                    if (isRama) ramaArmySet.add(warrior.id);
                    else ravanaArmySet.add(warrior.id);

                    const imgHtml = warrior.image 
                        ? `<img src="${warrior.image}" alt="${warrior.name}" class="warrior-img" onerror="this.onerror=null; this.parentNode.innerHTML='<div class=\\'warrior-img\\'>👤</div>';">`
                        : `<div class="warrior-img">👤</div>`;
                    
                    if (warrior.is_dead) {
                        deadSet.add(warrior.id);
                    }
                    
                    const deadBadge = warrior.is_dead ? `<div class="dead-badge">💀 Dead</div>` : '';

                    return `
                        <div class="warrior-avatar">
                            ${imgHtml}
                            <div class="warrior-name">${warrior.name}</div>
                            ${deadBadge}
                        </div>
                    `;
                }).join('');
                
                return `
                    <div class="army-section">
                        <h4 class="army-title">${title}</h4>
                        <div class="warriors-grid">
                            ${warriorsHtml}
                        </div>
                    </div>
                `;
            };

            const duelImgHtml = duel.image 
                ? `<div style="margin-top: 1.5rem; text-align: center;"><img src="${duel.image}" style="max-width: 100%; max-height: 300px; border-radius: 8px;" alt="Duel Image"></div>` 
                : '';

            card.innerHTML = `
                <div class="duel-header">
                    ${renderArmy(duel.rama_army, 'Rama Army', true)}
                    <div class="vs-badge"><span>VS</span></div>
                    ${renderArmy(duel.ravana_army, 'Ravana Army', false)}
                </div>
                <div class="duel-info">
                    <p class="duel-desc">${duel.description || 'No detailed description available for this confrontation.'}</p>
                    ${duelImgHtml}
                </div>
            `;
            
            section.appendChild(card);
        });

        const getNames = (set, isDead) => {
            return allCharacters.filter(c => set.has(c.id) && (isDead ? deadSet.has(c.id) : !deadSet.has(c.id))).map(c => c.name).join(', ') || 'None';
        };

        const ramaAlive = getNames(ramaArmySet, false);
        const ramaDead = getNames(ramaArmySet, true);
        const ravanaAlive = getNames(ravanaArmySet, false);
        const ravanaDead = getNames(ravanaArmySet, true);

        const statusSummary = document.createElement('div');
        statusSummary.className = 'status-summary';
        statusSummary.innerHTML = `
            <h4>Warriors Status (End of Day ${day})</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
                <!-- Rama Army -->
                <div style="background: var(--army-section-bg); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border-color);">
                    <h5 style="color: var(--primary-color); font-size: 1.1rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">Rama Army</h5>
                    <div style="margin-bottom: 1.5rem;">
                        <h6 style="color: #2ecc71; margin-bottom: 0.5rem; font-size: 1rem;">🛡️ Alive</h6>
                        <p style="font-size:0.95rem; color:var(--text-light); line-height:1.6;">${ramaAlive}</p>
                    </div>
                    <div>
                        <h6 style="color: #e74c3c; margin-bottom: 0.5rem; font-size: 1rem;">💀 Fallen</h6>
                        <p style="font-size:0.95rem; color:var(--text-light); line-height:1.6;">${ramaDead}</p>
                    </div>
                </div>

                <!-- Ravana Army -->
                <div style="background: var(--army-section-bg); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border-color);">
                    <h5 style="color: var(--primary-color); font-size: 1.1rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">Ravana Army</h5>
                    <div style="margin-bottom: 1.5rem;">
                        <h6 style="color: #2ecc71; margin-bottom: 0.5rem; font-size: 1rem;">🛡️ Alive</h6>
                        <p style="font-size:0.95rem; color:var(--text-light); line-height:1.6;">${ravanaAlive}</p>
                    </div>
                    <div>
                        <h6 style="color: #e74c3c; margin-bottom: 0.5rem; font-size: 1rem;">💀 Fallen</h6>
                        <p style="font-size:0.95rem; color:var(--text-light); line-height:1.6;">${ravanaDead}</p>
                    </div>
                </div>
            </div>
        `;
        section.appendChild(statusSummary);

        container.appendChild(section);
    });
}
