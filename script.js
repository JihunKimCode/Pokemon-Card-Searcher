document.addEventListener('DOMContentLoaded', () => {
    // Year in Footer
    const currentYear = new Date().getFullYear();
    document.getElementById("year").innerHTML = currentYear;
    document.getElementById("year2").innerHTML = currentYear;

    // Dark Mode Initialization
    if (localStorage.getItem("darkMode") === "true") {
        document.body.classList.add("dark-mode");
    }

    // Event Listeners
    document.getElementById('fetchButton').addEventListener('click', fetchCards);
    document.getElementById('searchQuery').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            fetchCards();
        }
    });
    document.getElementById('sortOrder').addEventListener('change', updateDisplay);
    document.getElementById('rarityFilter').addEventListener('change', updateDisplay);
    document.getElementById('clearButton').addEventListener('click', clearSearchQuery);

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
    window.onscroll = scrollFunction;
    scrollTopBtn.addEventListener('click', () => {
        document.documentElement.scrollIntoView({ behavior: 'smooth' });
    });

    // Initialize clear button visibility
    toggleClearButton();
});

// Toggle Dark Mode
function darkmode() {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
}

// Clear search query
function clearSearchQuery() {
    const searchQuery = document.getElementById("searchQuery");
    searchQuery.value = "";
    toggleClearButton();
}

// Toggle clear button visibility
function toggleClearButton() {
    const searchQueryValue = document.getElementById("searchQuery").value.trim();
    const clearButton = document.getElementById("clearButton");
    clearButton.style.display = searchQueryValue ? "block" : "none";
}

// Set the active button and placeholder
function setActiveButton(activeButton) {
    document.querySelectorAll('.search-options button').forEach(button => button.classList.remove('active'));
    activeButton.classList.add('active');
}

function setSearchPlaceholder(placeholderText) {
    document.getElementById('searchQuery').placeholder = placeholderText;
}

// Populate rarity options in the dropdown
function populateRarityOptions(cards) {
    const rarities = new Set(cards.map(card => card.rarity).filter(rarity => rarity));
    const rarityFilter = document.getElementById('rarityFilter');
    const existingOptions = Array.from(rarityFilter.options);
    const existingRarities = new Set(existingOptions.map(option => option.value).filter(value => value));

    const currentSelectedValue = rarityFilter.value;

    // Remove options that are no longer needed
    existingOptions.forEach(option => {
        if (option.value && !rarities.has(option.value)) {
            rarityFilter.removeChild(option);
        }
    });

    // Add new rarity options if not already present
    rarities.forEach(rarity => {
        if (!existingRarities.has(rarity)) {
            const option = document.createElement('option');
            option.value = rarity;
            option.textContent = rarity;
            rarityFilter.appendChild(option);
        }
    });

    // If current value is not in the new list of rarities, set it to default
    if (currentSelectedValue && !rarities.has(currentSelectedValue)) {
        rarityFilter.value = "";
        updateDisplay();
    } else {
        rarityFilter.value = currentSelectedValue;
    }
}

// Get price of the card
function getPrice(card) {
    const priceAttributes = ['unlimited', '1stEdition', 'unlimitedHolofoil', '1stEditionHolofoil', 'normal', 'holofoil', 'reverseHolofoil'];
    for (const attr of priceAttributes) {
        const price = card.tcgplayer?.prices?.[attr]?.mid;
        if (price !== undefined) {
            return price;
        }
    }
    return undefined;
}

// Fetch cards based on the query and filters
let cachedData = [];
let currentQuery = '';
let currentSearchMode = '';

function fetchCards() {
    let query = document.getElementById('searchQuery').value.trim();
    const searchMode = document.getElementById('searchQuery').placeholder;
    if (!query) {
        alert('Please enter a search query.');
        return;
    }

    // Convert spaces to dots if necessary
    query = query.replace(/ /g, '.');

    if (query !== currentQuery || !cachedData || cachedData.length === 0 || searchMode !== currentSearchMode) {
        // If the query has changed, fetch new data
        currentQuery = query;
        cachedData = [];
        currentSearchMode = document.getElementById('searchQuery').placeholder;

        // Determine the search type based on the active button
        let url;
        if (document.getElementById('pokemonNameBtn').classList.contains('active')) {
            url = `https://api.pokemontcg.io/v2/cards?q=name:${query}`;
        } else if (document.getElementById('artistNameBtn').classList.contains('active')) {
            url = `https://api.pokemontcg.io/v2/cards?q=artist:${query}`;
        } else if (document.getElementById('setListBtn').classList.contains('active')) {
            url = `https://api.pokemontcg.io/v2/cards?q=set.name:${query}`;
        }

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                cachedData = data.data;
                populateRarityOptions(cachedData);
                updateDisplay();
            })
            .catch(error => {
                const outputDiv = document.getElementById('output');
                outputDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
                console.error('There has been a problem with your fetch operation:', error);
            });
    } else {
        // If the query hasn't changed, just update the display
        updateDisplay();
    }
}

// Update the display based on the filters and sorting
function updateDisplay() {
    const sortOrder = document.getElementById('sortOrder').value;
    const rarityFilter = document.getElementById('rarityFilter').value;

    let filteredData = cachedData;
    if (rarityFilter) {
        filteredData = filteredData.filter(card => card.rarity === rarityFilter);
    }

    const sortedData = sortCards(filteredData, sortOrder);

    const outputDiv = document.getElementById('output');
    outputDiv.innerHTML = '';

    if (sortedData.length === 0) {
        outputDiv.innerHTML = '<p class="error">No cards found for this query.</p>';
        return;
    }

    sortedData.forEach(card => {
        outputDiv.innerHTML += `
            <div class="card">
                <img src="${card.images.small}" alt="${card.name}" title="${card.name}" onclick="showPopup('${card.images.large}', '${card.name.replace(/'/g, '’')}')" style="cursor: zoom-in">
                <img src="${card.set.images.logo}" alt="${card.set.name}" title="${card.set.name}" style="width: 100px; cursor: default">
                <p><b>${card.name}</b></p>
                <p>${card.set.releaseDate || 'N/A'}</p>
                <p>${card.rarity || 'N/A'}</p>
                <p>
                    ${card.tcgplayer && card.tcgplayer.url 
                    ? `<a href="${card.tcgplayer.url}" target="_blank">Avg $${getPrice(card) || 'N/A'}</a>` 
                    : `Avg $${getPrice(card) || 'N/A'}`}
                </p>
            </div>
        `;
    });
}

// Sort cards based on selected criteria
function sortCards(data, sortOrder) {
    return data.sort((a, b) => {
        if (sortOrder === 'oldest' || sortOrder === 'newest') {
            const dateA = new Date(a.set.releaseDate);
            const dateB = new Date(b.set.releaseDate);
            return sortOrder === 'oldest' ? dateA - dateB : dateB - dateA;
        } else if (sortOrder === 'highRarity') {
            return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
        } else if (sortOrder === 'lowRarity') {
            return (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0);
        } else if (sortOrder === 'highPrice') {
            const priceA = parseFloat(getPrice(a) || 0);
            const priceB = parseFloat(getPrice(b) || 0);
            return priceB - priceA;
        } else if (sortOrder === 'lowPrice') {
            const priceA = parseFloat(getPrice(a) || 0);
            const priceB = parseFloat(getPrice(b) || 0);
            return priceA - priceB;
        } else if (sortOrder === 'AtoZ') {
            return a.name.localeCompare(b.name);
        } else if (sortOrder === 'ZtoA') {
            return b.name.localeCompare(a.name);
        }
    });
}

// Show popup image when image was clicked
function showPopup(image, name) {
    const popup = document.getElementById('popup');
    const popupImage = document.getElementById('popupImage');

    popup.style.display = "block";
    popupImage.src = image;
    document.body.style.overflow = "hidden";

    const close = document.getElementsByClassName('close')[0];
    close.onclick = function() {
        popup.style.display = "none";
        document.body.style.overflow = "auto";
    };

    window.onclick = function(event) {
        if (event.target == popup) {
            popup.style.display = "none";
            document.body.style.overflow = "auto";
        }
    };
}

// Scroll to top button logic
function scrollFunction() {
    const scrollTopBtn = document.getElementById("scrollTopBtn");
    if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
        scrollTopBtn.style.display = "block";
    } else {
        scrollTopBtn.style.display = "none";
    }
}

// Rarity Order for sorting
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
    "Rare Holo VSTAR": 6,
    "Rare Holo VMAX": 6,
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
};
