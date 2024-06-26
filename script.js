document.addEventListener('DOMContentLoaded', () => {
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
});

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
        const price = card.tcgplayer?.prices?.[attr]?.mid;
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
    outputDiv.innerHTML = sortedData.length ? sortedData.map(card => `
        <div class="card">
            <img src="${card.images.small}" alt="${card.name}" title="${card.name}" onclick="showPopup('${card.images.large}', '${card.name.replace(/'/g, '’')}')" style="cursor: zoom-in">
            <img src="${card.set.images.logo}" alt="${card.set.name}" title="${card.set.name}" style="width: 100px; cursor: default">
            <p><b>${card.name}</b></p>
            <p>${card.set.releaseDate || 'N/A'}</p>
            <p>${card.rarity || 'N/A'}</p>
            <p>${card.tcgplayer?.url ? `<a href="${card.tcgplayer.url}" target="_blank">Avg $${getPrice(card) || 'N/A'}</a>` : `Avg $${getPrice(card) || 'N/A'}`}</p>
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
