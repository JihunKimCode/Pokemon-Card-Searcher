document.addEventListener('DOMContentLoaded', () => {
    parseURL();

    // Year in Footer
    const currentYear = new Date().getFullYear();
    document.querySelectorAll("#year, #year2").forEach(el => el.textContent = currentYear);

    // Dark Mode Initialization
    if (localStorage.getItem("darkMode") === "true") {
        document.body.classList.add("dark-mode");
    }

    // Event Listeners
    const fetchButton = document.getElementById('fetchButton');
    const searchQuery = document.getElementById('searchQuery');
    const sortOrder = document.getElementById('sortOrder');
    const rarityFilter = document.getElementById('rarityFilter');
    const supertypeFilter = document.getElementById('supertypeFilter');
    const clearButton = document.getElementById('clearButton');

    fetchButton.addEventListener('click', fetchCards);
    searchQuery.addEventListener('keypress', event => event.key === 'Enter' && fetchCards());
    sortOrder.addEventListener('change', updateDisplay);
    rarityFilter.addEventListener('change', updateDisplay);
    supertypeFilter.addEventListener('change', updateDisplay);
    clearButton.addEventListener('click', clearSearchQuery);

    // Search options buttons
    const pokemonNameBtn = document.getElementById('pokemonNameBtn');
    const artistNameBtn = document.getElementById('artistNameBtn');
    const setListBtn = document.getElementById('setListBtn');

    pokemonNameBtn.addEventListener('click', () => {
        setActiveButton(pokemonNameBtn);
        setSearchPlaceholder("Enter Card Name");
    });
    artistNameBtn.addEventListener('click', () => {
        setActiveButton(artistNameBtn);
        setSearchPlaceholder("Enter Artist Name");
    });
    setListBtn.addEventListener('click', () => {
        setActiveButton(setListBtn);
        setSearchPlaceholder("Enter Expansion Name");
    });

    // Scroll to Top button
    const scrollTopBtn = document.getElementById("scrollTopBtn");
    window.addEventListener('scroll', () => {
        scrollTopBtn.style.display = (document.documentElement.scrollTop > 20) ? "block" : "none";
    });
    scrollTopBtn.addEventListener('click', () => {
        document.documentElement.scrollIntoView({ behavior: 'smooth' });
    });

    // Initialize clear button visibility
    toggleClearButton();

    // Toggle Dark Mode
    document.body.addEventListener('click', event => {
        if (event.target.matches('.dark-mode-toggle')) {
            darkmode();
        }
    });

    // Stats Button Event Listener
    document.getElementById('statsButton').addEventListener('click', showStats);

    // Modal Close Event Listener
    document.querySelector('#statsModal .close').addEventListener('click', () => {
        document.getElementById('statsModal').style.display = 'none';
        document.body.style.overflow = "auto";
    });

    window.addEventListener('click', event => {
        if (event.target == document.getElementById('statsModal')) {
            document.getElementById('statsModal').style.display = 'none';
            document.body.style.overflow = "auto";
        }
    });
});

let charts = {}; // Keep track of chart instances

function showStats() {
    const stats = calculateStats(cachedData);
    const statsContent = document.getElementById('statsContent');
    document.body.style.overflow = "hidden";

    statsContent.innerHTML = `
        <p><b>Total number of cards:</b> ${stats.totalCards}</p>
        <p><b>Earliest release date:</b> ${stats.earliestDate}</p>
        <p><b>Latest release date:</b> ${stats.latestDate}</p>
        <p><b>Most expensive card price:</b> $${stats.mostExpensive}</p>
        <p><b>Cheapest card price:</b> $${stats.cheapest}</p>
    `;

    document.getElementById('statsModal').style.display = 'block';

    updateChart('priceTrendChart', 'Price Changes Over Time', stats.averagePriceByDate, 'line');
    updateChart('rarityChart', 'Number of cards by rarity', stats.rarityCounts);
    updateChart('subtypeChart', 'Number of cards by subtype', stats.subtypeCounts);
    updateChart('supertypeChart', 'Number of cards by supertype', stats.supertypeCounts);
    updateChart('illustratorChart', 'Top 5 illustrators', Object.fromEntries(stats.topIllustrators.map(({ name, count }) => [name, count])));
}

function calculateStats(cards) {
    const rarityCounts = {};
    const subtypeCounts = {};
    const supertypeCounts = {};
    const priceByDate = {};
    let earliestDate = null;
    let latestDate = null;
    let mostExpensive = -Infinity;
    let cheapest = Infinity;
    const illustratorCounts = {};
    const totalCards = cards.length;

    cards.forEach(card => {
        // Count rarities
        if (card.rarity) {
            rarityCounts[card.rarity] = (rarityCounts[card.rarity] || 0) + 1;
        }

        // Count supertypes
        if (card.supertype) {
            supertypeCounts[card.supertype] = (supertypeCounts[card.supertype] || 0) + 1;
        }

        // Count subtypes
        if (card.subtypes) {
            card.subtypes.forEach(subtype => {
                subtypeCounts[subtype] = (subtypeCounts[subtype] || 0) + 1;
            });
        }

        // Find earliest and latest release dates
        const releaseDate = new Date(card.set.releaseDate);
        if (!earliestDate || releaseDate < earliestDate) earliestDate = releaseDate;
        if (!latestDate || releaseDate > latestDate) latestDate = releaseDate;

        // Track highest price by date
        const price = getPrice(card);
        if (price !== undefined) {
            const dateKey = releaseDate.toISOString().split('T')[0]; // Date in YYYY-MM-DD format
            if (!priceByDate[dateKey] || price > priceByDate[dateKey]) {
                priceByDate[dateKey] = price;
            }
            
            if (price > mostExpensive) mostExpensive = price;
            if (price < cheapest) cheapest = price;
        }

        // Count illustrators
        if (card.artist) {
            illustratorCounts[card.artist] = (illustratorCounts[card.artist] || 0) + 1;
        }
    });

    // Calculate average price per date
    const averagePriceByDate = Object.entries(priceByDate)
        .map(([date, price]) => [
            date,
            price.toFixed(2)
        ])
        .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB)) // Sort dates from oldest to newest
        .reduce((acc, [date, avgPrice]) => {
            acc[date] = avgPrice;
            return acc;
        }, {});

    const topIllustrators = Object.entries(illustratorCounts)
        .filter(([, count]) => count > 2)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

    return {
        totalCards,
        rarityCounts: sortObjectByValues(rarityCounts),
        subtypeCounts: sortObjectByValues(subtypeCounts),
        supertypeCounts: sortObjectByValues(supertypeCounts),
        earliestDate: earliestDate ? earliestDate.toISOString().split('T')[0] : 'N/A',
        latestDate: latestDate ? latestDate.toISOString().split('T')[0] : 'N/A',
        mostExpensive: mostExpensive === -Infinity ? 'N/A' : mostExpensive.toFixed(2),
        cheapest: cheapest === Infinity ? 'N/A' : cheapest.toFixed(2),
        topIllustrators,
        averagePriceByDate
    };
}

function sortObjectByValues(obj) {
    return Object.fromEntries(Object.entries(obj).sort(([, a], [, b]) => b - a));
}

function updateChart(canvasId, title, data, type = 'bar') {
    if (charts[canvasId]) {
        charts[canvasId].destroy(); // Destroy existing chart instance
    }

    const ctx = document.getElementById(canvasId).getContext('2d');
    charts[canvasId] = new Chart(ctx, {
        type: type,
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: title,
                data: Object.values(data),
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Allow custom sizing
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function closeStats() {
    document.getElementById('statsModal').style.display = 'none';
}

// Initialize link button click event
document.getElementById('linkButton').addEventListener('click', () => {
    const searchMode = document.querySelector('.search-options button.active').id.replace('Btn', '');
    const searchQuery = document.getElementById('searchQuery').value.trim();
    const sortOrder = document.getElementById('sortOrder').value;
    const supertypeFilter = document.getElementById('supertypeFilter').value;
    const rarityFilter = document.getElementById('rarityFilter').value;
    
    // Generate URL based on current parameters
    const url = generateURL(searchMode, searchQuery, sortOrder, supertypeFilter, rarityFilter);
    
    // Copy URL to clipboard
    copyToClipboard(url);
});

// Function to generate URL with current search parameters
function generateURL(searchMode, searchQuery, sortOrder, supertypeFilter, rarityFilter) {
    return `${window.location.origin}${window.location.pathname}?${new URLSearchParams({
        searchMode,
        searchQuery,
        sortOrder,
        supertypeFilter,
        rarityFilter
    }).toString()}`;
}

// Function to copy text to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => {
            alert('Link copied to clipboard!');
        })
        .catch(err => {
            console.error('Failed to copy: ', err);
        });
}

function darkmode() {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
}

function clearSearchQuery() {
    document.getElementById("searchQuery").value = "";
    toggleClearButton();
}

function toggleClearButton() {
    const searchQueryValue = document.getElementById("searchQuery").value.trim();
    const clearButton = document.getElementById("clearButton");
    clearButton.style.display = searchQueryValue ? "block" : "none";
}

function setActiveButton(activeButton) {
    document.querySelectorAll('.search-options button').forEach(button => button.classList.remove('active'));
    activeButton.classList.add('active');
}

function setSearchPlaceholder(placeholderText) {
    document.getElementById('searchQuery').placeholder = placeholderText;
}

document.getElementById('visibleButton').addEventListener('click', function() {
    const cardInfos = document.querySelectorAll('.cardInfo');
    const icon = this.querySelector('i');
    const isVisible = icon.classList.contains('fa-eye');

    cardInfos.forEach(cardInfo => {
        cardInfo.style.display = isVisible ? 'none' : 'block';
    });

    if (isVisible) {
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
});

function populateOptions(cards) {
    //Rarity Filter
    const rarities = Array.from(new Set(cards.map(card => card.rarity).filter(Boolean)));
    const rarityFilter = document.getElementById('rarityFilter');
    const currentSelectedRarity = rarityFilter.value;

    rarityFilter.innerHTML = '<option value="">🔍Rarity</option>';

    const sortedRarities = rarities.sort((a, b) => (rarityOrder[a] || 0) - (rarityOrder[b] || 0));
    sortedRarities.forEach(rarity => {
        const option = document.createElement('option');
        option.value = rarity;
        option.textContent = rarity;
        rarityFilter.appendChild(option);
    });

    rarityFilter.value = rarities.includes(currentSelectedRarity) ? currentSelectedRarity : '';

    //Supertype Filter
    const supertypes = Array.from(new Set(cards.map(card => card.supertype).filter(Boolean)));
    const supertypeFilter = document.getElementById('supertypeFilter');
    const currentSelectedSupertype = supertypeFilter.value;

    supertypeFilter.innerHTML = '<option value="">🔍Type</option>';

    supertypes.forEach(supertype => {
        const option = document.createElement('option');
        option.value = supertype;
        option.textContent = supertype;
        supertypeFilter.appendChild(option);
    });

    supertypeFilter.value = supertypes.includes(currentSelectedSupertype) ? currentSelectedSupertype : '';

    updateDisplay();
}

function getPrice(card) {
    const priceAttributes = ['unlimited', '1stEdition', 'unlimitedHolofoil', '1stEditionHolofoil', 'normal', 'holofoil', 'reverseHolofoil'];
    for (const attr of priceAttributes) {
        const price = card.tcgplayer?.prices?.[attr]?.market || card.tcgplayer?.prices?.[attr]?.mid;
        if (price !== undefined) return price;
    }
    return undefined;
}

let cachedData = [];
let currentQuery = '';
let currentSearchMode = '';

async function fetchCards() {
    const queryInput = document.getElementById('searchQuery').value.trim();
    if (!queryInput) {
        alert('Please enter a search query.');
        return;
    }

    const query = queryInput.replace(/ /g, '.');
    const searchMode = document.getElementById('searchQuery').placeholder;

    if (query !== currentQuery || searchMode !== currentSearchMode) {
        currentQuery = query;
        currentSearchMode = searchMode;
        cachedData = [];

        let url;
        if (document.getElementById('pokemonNameBtn').classList.contains('active')) {
            url = `https://api.pokemontcg.io/v2/cards?q=name:${query}`;
        } else if (document.getElementById('artistNameBtn').classList.contains('active')) {
            url = `https://api.pokemontcg.io/v2/cards?q=artist:${query}`;
        } else if (document.getElementById('setListBtn').classList.contains('active')) {
            url = query === "151" ? `https://api.pokemontcg.io/v2/cards?q=set.id:sv3pt5` : `https://api.pokemontcg.io/v2/cards?q=set.name:${query}`;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok ' + response.statusText);

            const data = await response.json();
            cachedData = data.data;

            // Sorting logic for setListBtn
            if (document.getElementById('setListBtn').classList.contains('active')) {
                cachedData.sort((a, b) => {
                    const extractIdParts = (id) => {
                        const match = id.match(/-(\d+)(\D*)$/);
                        if (match) {
                            return { number: parseInt(match[1]), suffix: match[2] || '' };
                        } else {
                            return { number: Number.MAX_SAFE_INTEGER, suffix: id }; // Place non-matching IDs at the end
                        }
                    };

                    const idA = extractIdParts(a.id);
                    const idB = extractIdParts(b.id);

                    const numCompare = idA.number - idB.number;
                    if (numCompare !== 0) return numCompare;
                    return idA.suffix.localeCompare(idB.suffix);
                });
            }
            populateOptions(cachedData);
            updateDisplay();
        } catch (error) {
            document.getElementById('output').innerHTML = `<p class="error">Error: ${error.message}</p>`;
            console.error('There has been a problem with your fetch operation:', error);
        }
    } else {
        updateDisplay();
    }
}

function updateDisplay() {
    const sortOrder = document.getElementById('sortOrder').value;
    const rarityFilter = document.getElementById('rarityFilter').value;
    const supertypeFilter = document.getElementById('supertypeFilter').value;

    let filteredData = cachedData;
    if (rarityFilter) filteredData = filteredData.filter(card => card.rarity === rarityFilter);
    if (supertypeFilter) filteredData = filteredData.filter(card => card.supertype === supertypeFilter);

    const sortedData = sortCards(filteredData, sortOrder);
    const outputDiv = document.getElementById('output');
    const isVisible = document.querySelector('#visibleButton i').classList.contains('fa-eye');

    outputDiv.innerHTML = sortedData.length ? sortedData.map(card => `
        <div class="card">
            <img src="${card.images.small}" alt="${card.name}" title="${card.name}" onclick="showPopup('${card.images.large}', '${card.name.replace(/'/g, '’')}')" style="cursor: zoom-in">
            <div class="cardInfo" style="display: ${isVisible ? 'block' : 'none'};">
                <img src="${card.set.images.logo}" alt="${card.set.name}" title="${card.set.name}" style="width: 100px; cursor: default">
                <p><b>${card.name}</b></p>
                <p><i>Illus. ${card.artist || 'N/A'}</i></p>
                <p>${card.set.releaseDate || 'N/A'}</p>
                <p>${card.rarity || 'N/A'}</p>
                <p>${card.tcgplayer?.url ? `<a href="${card.tcgplayer.url}" target="_blank">Avg $${getPrice(card) || 'N/A'}</a>` : `Avg $${getPrice(card) || 'N/A'}`}</p>
            </div>
        </div>`).join('') : '<p class="error">No cards found for this query.</p>';
}

function sortCards(data, sortOrder) {
    return data.sort((a, b) => {
        switch (sortOrder) {
            case 'oldest': case 'newest':
                return sortOrder === 'oldest' ? new Date(a.set.releaseDate) - new Date(b.set.releaseDate) : new Date(b.set.releaseDate) - new Date(a.set.releaseDate);
            case 'highRarity':
                return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
            case 'lowRarity':
                return (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0);
            case 'highPrice':
                return (parseFloat(getPrice(b) || 0) - parseFloat(getPrice(a) || 0));
            case 'lowPrice':
                return (parseFloat(getPrice(a) || 0) - parseFloat(getPrice(b) || 0));
            case 'AtoZ':
                return a.name.localeCompare(b.name);
            case 'ZtoA':
                return b.name.localeCompare(a.name);
            default:
                return 0;
        }
    });
}

function showPopup(image, name) {
    const popup = document.getElementById('popup');
    const popupImage = document.getElementById('popupImage');

    popup.style.display = "block";
    popupImage.src = image;
    document.body.style.overflow = "hidden";

    const close = document.getElementsByClassName('close')[0];
    close.onclick = () => {
        popup.style.display = "none";
        document.body.style.overflow = "auto";
    };

    window.onclick = event => {
        if (event.target == popup) {
            popup.style.display = "none";
            document.body.style.overflow = "auto";
        }
    };
}

const rarityOrder = {
    "Common": 1,
    "Uncommon": 2,
    "Rare": 3,
    "Radiant Rare": 3,
    "Amazing Rare": 4,
    "Double Rare": 4,
    "Rare Holo": 5,
    "Rare ACE": 5,
    "Ultra Rare": 6,
    "Rare Ultra": 6,
    "Rare Shiny": 6,
    "Shiny Rare": 6,
    "Illustration Rare": 6,
    "Rare Holo Star": 6,
    "Rare Prism Star": 6,
    "Rare Holo LV.X": 6,
    "LEGEND": 6,
    "Rare BREAK": 6,
    "Rare Prime": 6,
    "Rare Holo EX": 6,
    "Rare Holo GX": 6,
    "Rare Holo V": 6,
    "Rare Holo VSTAR": 7,
    "Rare Holo VMAX": 7,
    "Rare Secret": 7,
    "Trainer Gallery Rare Holo": 7,
    "Rare Rainbow": 7,
    "Rare Shining": 7,
    "Rare Shiny GX": 7,
    "ACE SPEC Rare": 7,
    "Shiny Ultra Rare": 7,
    "Special Illustration Rare": 8,
    "Hyper Rare": 9,
    "Promo": 9,
    "Classic Collection": 9
};

// Function to parse URL and update UI
async function parseURL() {
    const params = new URLSearchParams(window.location.search);
    
    const searchMode = params.get('searchMode') || 'pokemonName';
    const searchQuery = params.get('searchQuery') || '';
    const sortOrder = params.get('sortOrder') || 'newest';
    const supertypeFilter = params.get('supertypeFilter') || '';
    const rarityFilter = params.get('rarityFilter') || '';

    // Update UI elements
    document.getElementById('searchQuery').value = searchQuery;
    document.getElementById('sortOrder').value = sortOrder;
    
    // Set active button based on searchMode
    document.querySelectorAll('.search-options button').forEach(button => {
        if (button.id === `${searchMode}Btn`) {
            setActiveButton(button);
        }
    });
    
    // Fetch cards based on the parsed parameters
    if (searchQuery) {
        await fetchCards();
    }

    // Update filters
    document.getElementById('supertypeFilter').value = supertypeFilter;
    document.getElementById('rarityFilter').value = rarityFilter;
    if(supertypeFilter || rarityFilter) updateDisplay();
}
