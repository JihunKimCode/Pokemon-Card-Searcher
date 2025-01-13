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
        names = pokemonNames;
    });
    artistNameBtn.addEventListener('click', () => {
        setActiveButton(artistNameBtn);
        setSearchPlaceholder("Enter Artist Name");
        names = artistNames;
    });
    setListBtn.addEventListener('click', () => {
        setActiveButton(setListBtn);
        setSearchPlaceholder("Enter Expansion Name");
        names = setNames;
    });

    // Change search mode using keyboard
    document.addEventListener('keydown', function(event) {
        if (event.altKey && event.key === '1') {
            setActiveButton(pokemonNameBtn);
            setSearchPlaceholder("Enter Card Name");
            names = pokemonNames;
        } else if (event.altKey && event.key === '2') {
            setActiveButton(artistNameBtn);
            setSearchPlaceholder("Enter Artist Name");
            names = artistNames;
        } else if (event.altKey && event.key === '3') {
            setActiveButton(setListBtn);
            setSearchPlaceholder("Enter Expansion Name");
            names = setNames;
        }
    });

    // Move to search bar when input "/"
    document.addEventListener('keydown', function (event) {
        if (event.key === '/') {
        event.preventDefault();
        document.getElementById('searchQuery').focus();
        }
    });

    // Search Dropdown Highlight
    let currentFocus = -1;

    // Pokemon Dropdown Suggestion
    const pokemonDropdown = document.getElementById('pokemonDropdown');
    
    let pokemonNames = [];  // Not supported yet.
    let artistNames = [];   // Not supported yet.
    let setNames = [];
    
    // Take set name list
    fetch("https://api.pokemontcg.io/v2/sets")
    .then(response => response.json())
    .then(data => {
        setNames = data.data.map(set => set.name);
    })
    .catch(console.error);
    
    let names = [];
    searchQuery.addEventListener('input', () => {
        if (searchQuery.value.length >= 1) {
            suggestPokemon(names);
            clearButton.style.display = 'block';
        } else {
            // Hide dropdown if input is empty
            pokemonDropdown.style.display = 'none';
            clearButton.style.display = 'none';
        }
    });

    searchQuery.addEventListener('keydown', handleKeydown);
    searchQuery.addEventListener('click', () => {
        if (searchQuery.value.length >= 1) {
            suggestPokemon(names);
            clearButton.style.display = 'block';
        } else {
            // Hide dropdown if input is empty
            pokemonDropdown.style.display = 'none';
            clearButton.style.display = 'none';
        }
        scrollIntoView();
    });

    if(pokemonDropdown){
        // Hide the dropdown when clicking outside of it
        window.addEventListener('click', (event) => {
            if (!event.target.matches(`#${searchQuery.id}`)) {
                pokemonDropdown.style.display = 'none';
            }
        });
    }

    // Function to calculate Levenshtein distance between two strings
    function levenshteinDistance(str1, str2) {
        const lenStr1 = str1.length + 1;
        const lenStr2 = str2.length + 1;

        // Create a matrix to store the distances
        const matrix = new Array(lenStr1);
        for (let i = 0; i < lenStr1; i++) {
            matrix[i] = new Array(lenStr2);
            matrix[i][0] = i;
        }

        for (let j = 0; j < lenStr2; j++) {
            matrix[0][j] = j;
        }

        // Fill in the matrix with the minimum distances
        for (let i = 1; i < lenStr1; i++) {
            for (let j = 1; j < lenStr2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,       // deletion
                    matrix[i][j - 1] + 1,       // insertion
                    matrix[i - 1][j - 1] + cost // substitution
                );
            }
        }

        // The bottom-right cell of the matrix contains the Levenshtein distance
        return matrix[lenStr1 - 1][lenStr2 - 1];
    }

    // Function to suggest Pokémon with flexible matching and sort by relevance
    function suggestPokemon(pokemonNames) {
        const searchTerm = searchQuery.value.toLowerCase().trim();

        // Escape special characters in the search term
        const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Create a regular expression for flexible matching
        const regex = new RegExp(escapedSearchTerm.split('').join('.*'));

        // Filter Pokémon names based on the user's input and flexible matching
        const suggestions = pokemonNames.filter(name =>
            name.toLowerCase().match(regex)
        );

        // Sort suggestions by Levenshtein distance and then alphabetically
        const sortedSuggestions = suggestions.sort((a, b) => {
            const distanceA = levenshteinDistance(a, searchTerm);
            const distanceB = levenshteinDistance(b, searchTerm);

            if (distanceA !== distanceB) {
                return distanceA - distanceB;
            } else {
                return a.localeCompare(b);
            }
        });
        
        updateDropdown(sortedSuggestions);
    }

    // Update the dropdown with suggestions
    function updateDropdown(suggestions) {
        pokemonDropdown.innerHTML = '';

        // Populate the dropdown with new suggestions
        suggestions.forEach((name, index) => {
            const suggestionItem = document.createElement('div');
            suggestionItem.textContent = name;
            suggestionItem.addEventListener('click', () => {
                // Set the selected suggestion in the search input and perform search
                searchQuery.value = name;
                pokemonDropdown.style.display = 'none';
                fetchCards();
            });

            // Highlight the suggestion on hover
            suggestionItem.addEventListener('mouseover', () => {
                currentFocus = index;
                addActive();
            });

            // Remove highlight when mouse moves away
            suggestionItem.addEventListener('mouseout', () => {
                currentFocus = -1;
                addActive();
            });

            pokemonDropdown.appendChild(suggestionItem);
        });

        // Display the dropdown if there are suggestions, otherwise hide it
        pokemonDropdown.style.display = suggestions.length > 0 ? 'block' : 'none';
        currentFocus = -1; // Reset the focus when updating the suggestions

        scrollIntoView();
    }

    // Manage Key Input (Down, Up, Enter)
    function handleKeydown(event) {
        const suggestions = document.querySelectorAll('#pokemonDropdown div');

        if (event.key === 'ArrowDown' && suggestions.length > 0 && searchQuery.value.length >= 1) {
            currentFocus = (currentFocus + 1) % suggestions.length;
            searchQuery.value = suggestions[currentFocus].textContent;
            addActive();
        } else if (event.key === 'ArrowUp' && suggestions.length > 0 && searchQuery.value.length >= 1) {
            if (currentFocus === -1) {
                currentFocus = suggestions.length - 1;
            } else {
                currentFocus = (currentFocus - 1 + suggestions.length) % suggestions.length;
            }
            searchQuery.value = suggestions[currentFocus].textContent;
            addActive();
        } else if (event.key === 'Enter') {
            if (currentFocus > -1) {
                pokemonDropdown.innerHTML = '';
                pokemonDropdown.style.display = 'none';
            }
        }
        scrollIntoView();
    }

    // Change menu color when highlighted
    function addActive() {
        const suggestions = document.querySelectorAll('#pokemonDropdown div');
        
        suggestions.forEach((item, index) => {
            if (index === currentFocus) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        scrollIntoView();
    }

    // Adjust the scroll position to make the focused suggestion visible
    function scrollIntoView() {
        const activeItem = document.querySelector('#pokemonDropdown div.active');
        if (activeItem) {
            activeItem.scrollIntoView({
                block: 'nearest',
            });
        }
    }

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

    // Draw Button Event Listener
    document.getElementById("drawButton").addEventListener("click", () => {
        // Clear the card container when closing the popup
        document.getElementById("cardContainer").innerHTML = ''; 

        const randomCards = getRandomCards();
        displayRandomCards(randomCards);

        document.getElementById("luckyDraw").style.display = "block";
    });

    // Draw Close Event Listener
    document.querySelector('#luckyDraw .close').addEventListener('click', () => {
        // Clear the card container when closing the popup
        document.getElementById("cardContainer").innerHTML = ''; 
        clearTimeouts();

        document.getElementById("luckyDraw").style.display = "none";
        document.body.style.overflow = "auto";
    });

    // Close if clicked outside the popup
    window.addEventListener('click', event => {
        const luckyDraw = document.getElementById('luckyDraw');
        if (event.target == luckyDraw) {
            // Clear the card container when closing the popup
            document.getElementById("cardContainer").innerHTML = ''; 
            clearTimeouts();

            luckyDraw.style.display = 'none';
            document.body.style.overflow = "auto";
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

// Randomly choose cards
function getRandomCards() {
    // Check if filteredCachedData is empty
    if (filteredCachedData.length === 0) {
        alert('Search Cards First!');
        throw new Error('No cards available in Data.');
    }

    // Randomly select cards
    let selectedCards = [];
    let remainingCards = [...filteredCachedData];
    
    // Draw only one card if there are fewer than 10 cards
    let numCardsToDraw = remainingCards.length < 10 ? 1 : 10;
    
    for (let i = 0; i < numCardsToDraw; i++) {
        let randomIndex = Math.floor(Math.random() * remainingCards.length);
        selectedCards.push(remainingCards[randomIndex]);
        remainingCards.splice(randomIndex, 1); // Remove the selected card
    }

    // Sort the selected cards by rarity
    selectedCards.sort((a, b) => (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0));

    return selectedCards;
}

// Function to display random cards with fade-in effect and delay
function displayRandomCards(cards) {
    const container = document.getElementById("cardContainer");
    container.style.display = 'grid';
    document.body.style.overflow = "hidden";

    cards.forEach((card, index) => {
        const timeoutId = setTimeout(() => {
            const cardElement = document.createElement('div');
            cardElement.classList.add('card');
            cardElement.innerHTML = `
                <img src="${card.images.small}" alt="${card.name}" title="${card.name}" 
                onclick="showPopup('${card.images.large.replace(/'/g, "\\'")}', '${card.images.small.replace(/'/g, "\\'")}', '${card.set.name.replace(/'/g, "\\'")}', '${card.number.replace(/'/g, "\\'")}')" 
                style="cursor: zoom-in">
            `;
            container.appendChild(cardElement);

            // Trigger the fade-in effect by adding the 'visible' class to the card
            setTimeout(() => {
                cardElement.classList.add('visible');
            }, 20); // Small delay to ensure card is added to the DOM before the fade-in starts
        }, index * 300); // Delay between each card

        // Store the timeout ID
        timeouts.push(timeoutId);
    });
}

// Store timeout IDs to clear them when closing the popup
let timeouts = [];

// Clear all ongoing timeouts
function clearTimeouts() {
    timeouts.forEach(timeoutId => clearTimeout(timeoutId));
    timeouts = [];  // Reset the timeouts array
}

let charts = {}; // Keep track of chart instances

function showStats() {
    const stats = calculateStats(cachedData);
    const statsContent = document.getElementById('statsContent');
    document.body.style.overflow = "hidden";

    statsContent.innerHTML = `
        <p><b>Total number of cards:</b> ${stats.totalCards}</p>
        <p><b>Earliest release date:</b> ${stats.earliestDate}</p>
        <p><b>Latest release date:</b> ${stats.latestDate}</p>
        <p><b>Cheapest card price:</b> $${stats.cheapest}</p>
        <p><b>Most expensive card price:</b> $${stats.mostExpensive}</p>
    `;

    document.getElementById('statsModal').style.display = 'block';

    updateChart('priceTrendChart', 'Price Changes Over Time', stats.averagePriceByDate, 'line');
    updateChart('rarityChart', 'Number of cards by rarity', stats.rarityCounts);
    updateChart('subtypeChart', 'Number of cards by subtype', stats.subtypeCounts);
    updateChart('supertypeChart', 'Number of cards by supertype', stats.supertypeCounts);
    updateChart('illustratorChart', 'Top 10 illustrators', Object.fromEntries(stats.topIllustrators.map(({ name, count }) => [name, count])));
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
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
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
    pokemonDropdown.style.display = 'none';
    currentFocus = -1;
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

document.getElementById('visibleButton').addEventListener('click', toggleVisibility);

document.addEventListener('keydown', function(event) {
    if (event.altKey && event.key === '`') {
        toggleVisibility();
    }
});

function toggleVisibility() {
    const cardInfos = document.querySelectorAll('.cardInfo');
    const icon = document.getElementById('visibleButton').querySelector('i');
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
        const price = card.tcgplayer?.prices?.[attr]?.market || card.tcgplayer?.prices?.[attr]?.mid;
        if (price !== undefined) return price;
    }
    return undefined;
}

let cachedData = [];
let filteredCachedData = [];
let currentQuery = '';
let currentSearchMode = '';

function compareIds(a, b, sortOrder) {
    const extractIdParts = (id) => {
        const match = id.match(/-(\d+)(\D*)$/);
        if (match) {
            return { number: parseInt(match[1]), suffix: match[2] || '' };
        } else {
            return { number: Number.MAX_SAFE_INTEGER, suffix: id }; // Non-matching IDs at the end
        }
    };

    const idA = extractIdParts(a.id);
    const idB = extractIdParts(b.id);

    const numCompare = (idA.number - idB.number) * sortOrder;
    if (numCompare !== 0) return numCompare;

    return idA.suffix.localeCompare(idB.suffix) * sortOrder;
}

// Show loading, cards, or error message
const outputContainer = document.getElementById('outputContainer');
const loader = document.getElementById('loader');
const outputDiv = document.getElementById('output');

async function fetchCards() {
    const queryInput = document.getElementById('searchQuery').value.trim();
    if (!queryInput) {
        alert('Please enter a search query.');
        return;
    }

    let query = queryInput.replace(/ /g, '.');
    if (query.includes(':')) query = query.split(':')[0];       // Celebrations: Classic Collection
    else if (query.includes('—')) query = query.split('—')[1];  // HS—Undaunted, HS—Unleashed, and HS—Triumphant

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
            outputDiv.innerHTML = '';
            outputDiv.style.display = 'none';
            outputContainer.style.display = 'flex'; 
            loader.style.display = 'inline-flex';

            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok ' + response.statusText);

            const data = await response.json();
            cachedData = data.data;

            // Sorting logic for setListBtn
            if (document.getElementById('setListBtn').classList.contains('active')) {
                cachedData.sort((a, b) => compareIds(a, b, 1));
            }
            populateOptions(cachedData);
            updateDisplay();
        } catch (error) {
            loader.style.display = 'none';
            output.style.display = 'block';
            output.classList.add('error');
            output.innerHTML = `<p>Error: ${error.message}</p>`;    
            console.error('There has been a problem with your fetch operation:', error);
        }
    } else {
        updateDisplay();
    }
}

function updateDisplay() {
    outputContainer.style.display = 'table'; 
    loader.style.display = 'none';

    const sortOrder = document.getElementById('sortOrder').value;
    const rarityFilter = document.getElementById('rarityFilter').value;
    const supertypeFilter = document.getElementById('supertypeFilter').value;

    let filteredData = cachedData;
    if (rarityFilter) filteredData = filteredData.filter(card => card.rarity === rarityFilter);
    if (supertypeFilter) filteredData = filteredData.filter(card => card.supertype === supertypeFilter);
    filteredCachedData = filteredData;

    const sortedData = sortCards(filteredData, sortOrder);
    const outputDiv = document.getElementById('output');
    outputDiv.style.display = 'grid';
    const isVisible = document.querySelector('#visibleButton i').classList.contains('fa-eye');

    if (sortedData.length) {
        outputDiv.classList.remove('error');
        outputDiv.innerHTML = sortedData.map(card => `
            <div class="card">
                ${getNumCards(`${card.set.name},${card.number},${card.images.large},${card.images.small}\n`) > 0 ? `<div class="cart-badge"><i class="fa-solid fa-cart-shopping"></i></div>` : ""}
                <img src="${card.images.small}" alt="${card.name}" title="${card.name}" onclick="showPopup('${card.images.large.replace(/'/g, "\\'")}', '${card.images.small.replace(/'/g, "\\'")}', '${card.set.name.replace(/'/g, "\\'")}', '${card.number.replace(/'/g, "\\'")}')" style="cursor: zoom-in">
                <div class="cardInfo" style="display: ${isVisible ? 'block' : 'none'};">
                    <a href="${window.location.origin}${window.location.pathname}?searchMode=setList&searchQuery=${encodeURIComponent(card.set.name)}&sortOrder=newest&supertypeFilter=&rarityFilter=" target="_blank">
                        <img src="${card.set.images.logo}" alt="${card.set.name}" title="${card.set.name}" style="width: 100px; cursor: pointer">
                    </a>
                    <p>
                        <a href="${window.location.origin}${window.location.pathname}?searchMode=pokemonName&searchQuery=${encodeURIComponent(card.name)}&sortOrder=newest&supertypeFilter=&rarityFilter=" target="_blank">
                            <b>${card.name}</b>
                        </a>
                    </p>
                    <p><i>Illus. ${
                        card.artist && card.artist !== 'N/A' 
                            ? `<a href="${window.location.origin}${window.location.pathname}?searchMode=artistName&searchQuery=${encodeURIComponent(card.artist)}&sortOrder=newest&supertypeFilter=&rarityFilter=" target="_blank">
                            ${card.artist}
                            </a>` 
                            : 'N/A'
                    }</i></p>
                    <p>${card.set.releaseDate || 'N/A'}</p>
                    <p>${card.rarity || 'N/A'}</p>
                    <p>${card.tcgplayer?.url ? `<a href="${card.tcgplayer.url}" target="_blank">Avg $${getPrice(card) || 'N/A'}</a>` : `Avg $${getPrice(card) || 'N/A'}`}</p>
                </div>
            </div>`).join('');
    } else {
        outputDiv.style.display = 'block';
        outputDiv.classList.add('error');
        outputDiv.innerHTML = '<p>No cards found.</p>';
    }
}

function sortCards(data, sortOrder) {
    return data.sort((a, b) => {
        switch (sortOrder) {
            case 'oldest': 
                return new Date(a.set.releaseDate) - new Date(b.set.releaseDate)
            case 'newest':
                return new Date(b.set.releaseDate) - new Date(a.set.releaseDate);
            case 'id':
                return compareIds(a, b, 1);
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

// Update controlCSV location as resize screen
if (getComputedStyle(document.getElementById('popupImage')).display === "block") {
    window.addEventListener('resize', addCardsToCSV);
}

// Update controlCSV position based on popupImage's position
function addCardsToCSV() {
    const popupImage = document.getElementById('popupImage');
    const popupRect = popupImage.getBoundingClientRect();
    const controlCSV = document.querySelector('.controlCSV');
    
    if (window.innerWidth < 457) {
        // mobile layout
        controlCSV.style.top = `${popupRect.top - 60}px`;
        controlCSV.style.left = `${popupRect.right - 170}px`;
        controlCSV.style.flexDirection = 'row';
    } else if(window.innerWidth >= 457 && window.innerWidth < 687){
        // narrow side
        controlCSV.style.top = `${popupRect.top}px`;
        controlCSV.style.left = `85%`;
        controlCSV.style.flexDirection = 'column';
    } else {
        controlCSV.style.top = `${popupRect.top}px`;
        controlCSV.style.left = `${popupRect.right + 15}px`;
        controlCSV.style.flexDirection = 'column';
    }
}

// Find Number of Cards in CSV
function getNumCards(newEntry) {
    const matches = csvContent.split("\n").filter(line => line === `${newEntry.replace("\n","")}`);
    return matches.length;
}

function showPopup(image, smallImage, sets, number) {
    const popup = document.getElementById('popup');
    const popupImage = document.getElementById('popupImage');
    const addCSV = document.getElementById('addCSV');
    const removeCSV = document.getElementById('removeCSV');
    const count = document.getElementById('countButton');
    
    // Total number of cards in the set
    count.style.display = 'flex';
    const newEntry = `${sets},${number},${image},${smallImage}\n`;
    const countSpan = count.querySelector('span');
    countSpan.innerHTML = getNumCards(newEntry);
    
    popup.style.display = "block";
    popupImage.src = image;
    document.body.style.overflow = "hidden";
    addCSV.style.display = 'flex';
    removeCSV.style.display = 'flex';

    // Wait until image is loaded to adjust the controlCSV position
    popupImage.onload = () => {
        addCardsToCSV();    
    };
    
    // Adding new data to CSV
    addCSV.onclick = () => {
        addCSV.style.pointerEvents = 'none'; // Disable clicks temporarily
        addCSV.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
        addCSV.style.backgroundColor = '#aaa';
    
        // Re-enable the button after a small delay
        setTimeout(() => {
            // Set the success state
            addCSV.innerHTML = `<i class="fa-solid fa-check"></i>`;
            addCSV.style.backgroundColor = '#228B22';

            // Proceed with adding to csvContent
            csvContent += newEntry;
            countSpan.innerHTML = getNumCards(newEntry);
    
            // After a short time, revert to the original icon
            setTimeout(() => {
                addCSV.innerHTML = `<i class="fa-solid fa-file-circle-plus"></i>`;
                addCSV.style.backgroundColor = '';
                addCSV.style.pointerEvents = 'auto'; // Re-enable clicks
            }, 250);
        }, 150);
    };

    // Remove data from CSV
    removeCSV.onclick = () => {
        // Disable the button temporarily
        removeCSV.style.pointerEvents = 'none'; // Disable clicks temporarily
        removeCSV.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
        removeCSV.style.backgroundColor = '#aaa';
    
        // Re-enable the button after a small delay
        setTimeout(() => {
            // Set the success state
            removeCSV.innerHTML = `<i class="fa-solid fa-check"></i>`;
            removeCSV.style.backgroundColor = '#e74c3c';
    
            // Find the last occurrence of newEntry in csvContent
            const lastIndex = csvContent.lastIndexOf(newEntry);
            if (lastIndex !== -1) csvContent = csvContent.slice(0, lastIndex) + csvContent.slice(lastIndex + newEntry.length);

            // Update the count based on the modified content
            countSpan.innerHTML = getNumCards(newEntry);
    
            // After a short time, revert to the original icon
            setTimeout(() => {
                removeCSV.innerHTML = `<i class="fa-solid fa-file-circle-minus"></i>`;
                removeCSV.style.backgroundColor = '';
                removeCSV.style.pointerEvents = 'auto'; // Re-enable clicks
            }, 250);
        }, 150);
    };
      
    document.querySelector('#popup .close').addEventListener('click', () => {
        popup.style.display = "none";
        document.body.style.overflow = "auto";
        addCSV.style.display = 'none';
        removeCSV.style.display = 'none';
        count.style.display = 'none';
        updateDisplay();
        if (getComputedStyle(document.getElementById('csvData')).display === "block") displayCSV();
    });

    window.onclick = event => {
        if (event.target == popup) {
            popup.style.display = "none";
            document.body.style.overflow = "auto";
            addCSV.style.display = 'none';
            removeCSV.style.display = 'none';
            count.style.display = 'none';
            updateDisplay();
            if (getComputedStyle(document.getElementById('csvData')).display === "block") displayCSV();
        }
    };
}

// Manage CSV
let csvContent = `Sets,Number,Image, smallImage\n`;

// csvData Button Event Listener
document.getElementById("csvButton").addEventListener("click", () => {
    if (cachedData.length === 0) {
        alert('Try this again later.');
    } else {
        // Clear the card container when closing the csvData
        document.getElementById("csvContainer").innerHTML = ''; 
        displayCSV(csvContent);
        document.getElementById("csvData").style.display = "block";
        document.getElementById('exportCSV').style.display = 'flex';
        document.getElementById('undoButton').style.display = 'flex';
    }
});

// csvData Close Event Listener
document.querySelector('#csvData .close').addEventListener('click', () => {
    document.getElementById("csvContainer").innerHTML = ''; 
    document.getElementById("csvData").style.display = "none";
    document.getElementById('exportCSV').style.display = 'none';
    document.getElementById('undoButton').style.display = 'none';
    document.body.style.overflow = "auto";
    updateDisplay();
});

// Close if clicked outside the popup
window.addEventListener('click', event => {
    const csvData = document.getElementById('csvData');
    if (event.target == csvData) {
        document.getElementById("csvContainer").innerHTML = ''; 
        csvData.style.display = 'none';
        document.getElementById('exportCSV').style.display = 'none';
        document.getElementById('undoButton').style.display = 'none';
        document.body.style.overflow = "auto";
        updateDisplay();
    }
});

let removedRowsStack = [];  // Stack to store removed rows
let cardCounts = {};        // Store card counts

function displayCSV() {
    const container = document.getElementById("csvContainer");
    container.style.display = 'grid';
    container.innerHTML = ''; // Clear the container first
    document.body.style.overflow = "hidden";

    // Split the CSV content into rows and filter out blank rows
    let rows = csvContent.trim().split("\n").filter(row => row.trim() !== "");
    const headers = rows.shift(); // Extract and store headers

    // Group rows by unique card attributes
    const cardCounts = {};
    rows.forEach((row, rowIndex) => {
        const columns = row.split(",").map(col => col.trim());
        const [sets, number, image, smallImage] = columns;

        // Validate required fields
        if (!sets || !number || !image || !smallImage) {
            console.warn(`Skipping row due to missing fields: ${row}`);
            return; // Skip invalid rows
        }

        const uniqueKey = `${sets}_${number}_${smallImage}`;

        if (!cardCounts[uniqueKey]) {
            cardCounts[uniqueKey] = { count: 0, rows: [], firstIndex: rowIndex };
        }

        cardCounts[uniqueKey].count += 1;
        cardCounts[uniqueKey].rows.push({ row, index: rowIndex, columns });
    });

    // Render cards based on groups
    Object.keys(cardCounts).forEach(uniqueKey => {
        const { count, rows } = cardCounts[uniqueKey];
        const { columns } = rows[0];
        const [sets, number, image, smallImage] = columns;

        // Create a card element for the grouped row
        const cardElement = document.createElement('div');
        cardElement.classList.add('card');
        cardElement.innerHTML = `
            ${count > 1 ? `<div class="count-badge">${count}</div>` : ""}
            <img src="${smallImage}" alt="${sets}" title="${sets}" 
                onclick="showPopup('${image.replace(/'/g, "\\'")}', '${smallImage.replace(/'/g, "\\'")}', '${sets.replace(/'/g, "\\'")}', '${number.replace(/'/g, "\\'")}')" 
                style="cursor: zoom-in">
            <div>
                <button class="csv remove-card-btn"><i class="fa-solid fa-minus"></i></button>
            </div>
        `;

        // Append the card to the container
        container.appendChild(cardElement);

        // Attach a click listener to the "Remove" button
        const removeButton = cardElement.querySelector('.remove-card-btn');
        removeButton.addEventListener('click', () => {
            // Remove a single instance of the grouped card
            const removedRow = rows.pop();
            removedRowsStack.push(removedRow);
            
            if (rows.length === 0) {
                delete cardCounts[uniqueKey];
                cardElement.remove();
            } else {
                cardElement.querySelector('.count-badge').textContent = rows.length;
            }

            // Update csvContent by removing the specific row
            const updatedRows = csvContent.split("\n").filter(row => row.trim() !== "");    // Ensure trailing newlines are handled
            updatedRows.splice(removedRow.index + 1, 1);                                    // +1 to skip the headers
            csvContent = updatedRows.join("\n") + "\n";                                     // Ensure the final newline is added

            // Re-render CSV after modification
            displayCSV();
        });
    });
}

// Attach an event listener to the undo button
document.getElementById("undoButton").addEventListener("click", () => {
    if (removedRowsStack.length > 0) {
        // Pop the most recently removed row from the stack
        const { row, index, columns } = removedRowsStack.pop();
        const [sets, number, image, smallImage] = columns;
        const uniqueKey = `${sets}_${number}_${smallImage}`;

        // Restore the removed row
        if (!cardCounts[uniqueKey]) {
            cardCounts[uniqueKey] = { count: 0, rows: [], firstIndex: index };
        }
        cardCounts[uniqueKey].count += 1;
        cardCounts[uniqueKey].rows.push({ row, index, columns });

        // Insert the removed row back into the CSV content at the correct position
        const updatedRows = csvContent.split("\n"); // Do not trim to retain trailing newlines
        updatedRows.splice(index + 1, 0, row);      // +1 to account for the headers
        csvContent = updatedRows.join("\n") + "\n"; // Ensure the final newline is added

        // Re-render CSV with the restored row
        displayCSV();
    } else {
        alert("No actions to undo!");
    }
});

// Move the exportCSV click event listener outside the forEach loop
document.getElementById('exportCSV').addEventListener('click', () => {
    // Convert CSV content into an array of rows
    let rows = csvContent.trim().split("\n");   

    // Extract only the first two columns and prepare new CSV content
    let filteredCsvContent = rows
    .map(row => row.split(",").slice(0, 2).join(",")) // Keep only the first two columns
    .join("\n"); // Rejoin rows into CSV format

    const blob = new Blob([filteredCsvContent], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "pokemoncards.csv";
    link.click();        
});

// Rarity Order for sorting
const rarityOrder = {
    "Common": 10,
    "Uncommon": 20,
    "Rare": 30,                         // Regular
    "Classic Collection": 31,
    "Rare Holo": 40,                    // Holofoil
    "Double Rare": 50,                  // EX
    "Ultra Rare": 60,                   // Unique card classification
    "Rare Ultra": 60,                   // Unique card classification
    "Rare Holo Star": 61,
    "Rare Prime": 61,
    "Rare Holo LV.X": 61,
    "Rare Holo EX": 61,
    "Rare Holo GX": 61,
    "LEGEND": 61,
    "Rare BREAK": 61,
    "Amazing Rare": 61,
    "Rare Prism Star": 61,
    "Rare ACE": 61,
    "ACE SPEC Rare": 61,
    "Radiant Rare": 62,
    "Rare Holo V": 63,
    "Rare Holo VSTAR": 64,
    "Rare Holo VMAX": 65,
    "Trainer Gallery Rare Holo": 66,
    "Rare Secret": 70,                  // Out of numbers
    "Rare Shining": 71,                 // Shiny Pokemon
    "Shiny Rare": 72,                   // Shiny Pokemon
    "Rare Shiny": 72,                   // Shiny Pokemon
    "Rare Shiny GX": 73,                // Shiny Pokemon
    "Shiny Ultra Rare": 73,             // Shiny Pokemon
    "Rare Rainbow": 74,
    "Illustration Rare": 75,            // Full-Art
    "Special Illustration Rare": 76,    // Full-Art
    "Hyper Rare": 80,                   // Gold Cards
    "Promo": 90                         // Event Cards
};