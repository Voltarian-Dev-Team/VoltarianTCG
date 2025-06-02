// --- Main Application Script ---
// This part would typically be in your main application file (e.g., 'main.js').
// It relies on the 'Confetti' object being available from the 'confetti-lib.js' (or similar).

// A Set to keep track of cards that have already triggered confetti.
// This ensures confetti only appears on the first flip of each unique card.
// IMPORTANT: For this to work correctly, each card MUST have a unique 'id' attribute.
const flippedCardIds = new Set();

// A Set to keep track of pack IDs that have already been opened (if we want to limit openings).
// For the new starter pack logic, we'll allow re-opening.

// Object to store loaded Image objects for each rank.
// These images will be used to draw custom confetti particles.
const rankConfettiImages = {
    "Pugman": null,
    "Prime": null,
    "Regular": null
};

// --- Constants for Animation Timings ---
const PACK_CARD_APPEAR_STAGGER_MS = 150; // Delay between each card starting its "appear" animation
const PACK_CARD_APPEAR_DURATION_MS = 500; // Duration of the "appear" animation (must match CSS)
const PACK_REVEAL_FLIP_DELAY_MS = 750;   // Delay between each card flipping after appearing

// Helper function to trigger confetti for a card if it hasn't been triggered before
function triggerConfettiForCard(cardElement) {
    if (!flippedCardIds.has(cardElement.id)) {
        let currentRank = cardElement.getAttribute('cardRank');
        if (currentRank) {
            currentRank = currentRank.charAt(0).toUpperCase() + currentRank.slice(1);
        }
        const confettiImage = rankConfettiImages[currentRank];

        if (!confettiImage) {
            console.warn(`Confetti image for rank "${currentRank}" is not available for card ${cardElement.id}. Confetti will not be displayed.`);
            return;
        }

        const cardRect = cardElement.getBoundingClientRect();
        const originX = (cardRect.left + cardRect.width / 2) / window.innerWidth;
        const originY = (cardRect.top + cardRect.height / 2) / window.innerHeight;

        Confetti.createConfetti(originX, originY, 150, confettiImage, 64, 64);
        flippedCardIds.add(cardElement.id);
    }
}

// Event listener to ensure the DOM is fully loaded before attempting to fetch images
// and set up card interactions.
document.addEventListener("DOMContentLoaded", async () => {
    // Define the paths to your rank images.
    const imagePaths = {
        "Pugman": "assets/img/cards/confetti/pugman.png",
        "Prime": "assets/img/cards/confetti/prime.png",
        "Regular": "assets/img/cards/confetti/regular.png"
    };

    // Create an array of promises, one for each image loading.
    const loadImagePromises = Object.keys(imagePaths).map(rank => {
        return new Promise((resolve, reject) => {
            const img = new Image(); // Create a new Image object
            img.src = imagePaths[rank]; // Set the source of the image

            img.onload = () => {
                rankConfettiImages[rank] = img; // Store the loaded Image object
                console.log(`Successfully loaded image for ${rank}.`);
                resolve(); // Resolve the promise
            };

            img.onerror = (error) => {
                console.error(`Failed to load image for rank "${rank}": ${img.src}`, error);
                rankConfettiImages[rank] = null; // Set to null on failure
                reject(new Error(`Failed to load image for ${rank}`)); // Reject the promise
            };
        });
    });

    // Wait for all image loading promises to complete.
    try {
        await Promise.all(loadImagePromises);
        console.log("All rank images loaded:", rankConfettiImages);
    } catch (error) {
        console.error("One or more images failed to load.", error);
    }

    // Helper function to attach all necessary event listeners to a card
    function attachCardEventListeners(cardElement) {
        // Card Flip event listener
        // cardElement.addEventListener("click", function () {
            // const wasFlipped = this.classList.contains("flipped"); // Check state *before* toggle
            // this.classList.toggle("flipped"); // This line handles the flip
            // if (!wasFlipped && this.classList.contains("flipped")) {
                // triggerConfettiForCard(this); // Confetti is triggered on flip
            // }
        // });
        // NOTE: Clicking to flip is now disabled. Cards will be revealed programmatically (e.g., during pack opening).

        // 3D Tilt on Hover: Calculates rotation based on mouse position
        cardElement.addEventListener("mousemove", (e) => {
            const rect = cardElement.getBoundingClientRect();
            const x = e.clientX - rect.left; // x position within the card
            const y = e.clientY - rect.top;  // y position within the card
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const maxTilt = 13; // Maximum tilt in degrees
            const rotY = ((x - centerX) / centerX) * maxTilt;
            const rotX = -((y - centerY) / centerY) * maxTilt;
            const cardInner = cardElement.querySelector(".card-inner");
            if (cardInner) {
                if (cardElement.classList.contains("flipped")) {
                    cardInner.style.transform = `rotateY(${rotY}deg) rotateX(${rotX}deg)`;
                } else {
                    cardInner.style.transform = `rotateY(${180 + rotY}deg) rotateX(${rotX}deg)`;
                }
            }
        });

        cardElement.addEventListener("mouseleave", () => {
            const cardInner = cardElement.querySelector(".card-inner");
            if (cardInner) {
                cardInner.style.transform = "";
            }
        });

        cardElement.addEventListener("mouseenter", () => {
            const cardInner = cardElement.querySelector(".card-inner");
            if (cardInner) {
                cardInner.style.transition = "transform 0.12s cubic-bezier(.4,2.3,.3,1)";
            }
        });

        cardElement.addEventListener("transitionend", (event) => {
            // Only act if the transition was on card-inner and for the transform property (typically the flip)
            if (event.target.classList.contains('card-inner') && event.propertyName === 'transform') {
                const cardInner = event.target; // cardElement.querySelector(".card-inner");
                // After the flip, set a longer, smoother transition for subsequent tilts
                cardInner.style.transition = "transform 0.6s cubic-bezier(.4,2.3,.3,1)";
            }
        });
    }

    // --- Card Interaction Setup (for existing cards on load) ---
    const initialCharacterCards = document.querySelectorAll(".character-card");
    initialCharacterCards.forEach(card => {
        attachCardEventListeners(card);
    });

    // Helper to generate unique IDs for duplicate cards
    let uniqueCardInstanceCounter = 0;

    // Function to create a new card DOM element (clone from template)
    function createCardElement(cardId, cardRank, cardImgSrc, cardAlt) {
        uniqueCardInstanceCounter++;
        const uniqueId = `${cardId}-instance-${uniqueCardInstanceCounter}`;

        // Create card structure
        const cardDiv = document.createElement('div');
        cardDiv.setAttribute('cardRank', cardRank);
        cardDiv.className = 'character-card'; // '.is-visible' will be added when card is placed in stack
        cardDiv.id = uniqueId;
        cardDiv.dataset.originalCardId = cardId; // Store original card ID for logic if needed

        cardDiv.innerHTML = `
            <div class="card-inner">
                <div class="card-front">
                    <img src="${cardImgSrc}" alt="${cardAlt}" class="card-face-img">
                </div>
                <div class="card-back">
                    <img src="./assets/img/cards/card-back.png" alt="Card Back" class="card-face-img">
                </div>
            </div>
        `;
        return cardDiv;
    }

    // --- Move this function to top-level scope ---
    async function addCardToStack(cardId, cardElementInstance) {
        const info = CARD_DATA[cardId];
        if (!info) {
            console.error(`Card info not found for ${cardId} in addCardToStack`);
            return;
        }

        const cardDisplayArea = document.getElementById('card-display-area');
        let stack = cardDisplayArea.querySelector(`.card-stack[data-card-id="${cardId}"]`);
        if (!stack) {
            stack = document.createElement('div');
            stack.className = 'card-stack';
            stack.setAttribute('data-card-id', cardId);
            stack.style.position = 'relative';
            stack.style.display = 'inline-block';
            stack.style.margin = '0 10px';
            stack.style.verticalAlign = 'top';
            cardDisplayArea.appendChild(stack);
        }

        const cardElem = cardElementInstance;
        cardElem.style.position = 'absolute';
        cardElem.style.transform = '';
        cardElem.style.opacity = '';
        cardElem.style.transition = '';
        cardElem.classList.remove('pugman-animation-card', 'animate');

        const stackCount = stack.childElementCount;
        const stackOffsetString = getComputedStyle(document.documentElement).getPropertyValue('--card-stack-offset').trim() || '32px';
        const stackOffset = parseInt(stackOffsetString, 10);
        cardElem.style.top = `${stackCount * stackOffset}px`;
        cardElem.style.left = '0';
        cardElem.style.zIndex = stackCount + 1;

        stack.appendChild(cardElem);
        attachCardEventListeners(cardElem);

        Array.from(stack.children).forEach((child, idx, arr) => {
            if (idx !== arr.length - 1) {
                child.style.pointerEvents = 'none';
                child.style.filter = 'brightness(0.8) grayscale(0.3)';
                child.style.cursor = 'default';
            } else {
                child.style.pointerEvents = '';
                child.style.filter = '';
                child.style.cursor = 'pointer';
            }
        });

        cardElem.classList.add('is-visible');

        if (cardElementInstance.dataset.specialAnimated === 'true') {
            cardElem.classList.add('flipped');
            triggerConfettiForCard(cardElem);
        } else {
            cardElem.classList.remove('flipped');
            await new Promise(resolve => setTimeout(resolve, PACK_CARD_APPEAR_STAGGER_MS));
            setTimeout(() => {
                cardElem.classList.add('flipped');
                triggerConfettiForCard(cardElem);
            }, PACK_CARD_APPEAR_DURATION_MS);
        }
        delete cardElementInstance.dataset.specialAnimated;
    }

    // Map card IDs to their data for dynamic creation
    const CARD_DATA = {
        'volt-prime': {
            cardRank: 'prime',
            img: './assets/img/cards/characters/volt-prime.png',
            alt: 'Volt Prime'
        },
        'excali-prime': {
            cardRank: 'prime',
            img: './assets/img/cards/characters/excali-prime.png',
            alt: 'Excalibur Prime'
        },
        'volt': {
            cardRank: 'regular',
            img: './assets/img/cards/characters/volt.png',
            alt: 'Volt'
        },
        'excali': {
            cardRank: 'regular',
            img: './assets/img/cards/characters/excali.png',
            alt: 'Excalibur'
        },
        'pugman': {
            cardRank: 'pugman',
            img: './assets/img/cards/characters/pugman.png',
            alt: 'Arthur "Pugman" Morgan'
        },
        'pugman-revolver': {
            cardRank: 'pugman',
            img: './assets/img/cards/characters/attack/pugman-revolver.png',
            alt: "Pugman's Double-Action Revolver"
        }
        // Add more cards as needed
    };

    // Function to determine which card to draw from the Starter Pack based on probabilities
    function drawCardFromStarterPack() {
        const choices = [
            { id: 'volt-prime', weight: 1 / 175 },
            { id: 'excali-prime', weight: 1 / 150 },
            { id: 'volt', weight: 1 / 25 },
            { id: 'excali', weight: 1 / 5 },
            { id: 'pugman', weight: 1 / 250 },
        ];

        const totalEffectiveWeight = choices.reduce((sum, choice) => sum + choice.weight, 0);
        let randomNumber = Math.random() * totalEffectiveWeight;

        for (const choice of choices) {
            if (randomNumber < choice.weight) {
                return choice.id;
            }
            randomNumber -= choice.weight;
        }
        return choices[choices.length - 1].id;
    }

    // --- Card Pack Opening Setup ---
    const packOpenerElements = document.querySelectorAll('.card-pack-opener');

    packOpenerElements.forEach(packOpener => {
        packOpener.addEventListener('click', async function () {
            const packId = this.dataset.packId;
            if (!packId) {
                console.error("Pack opener is missing data-pack-id attribute.", this);
                return;
            }

            if (packId === 'starterPack') {
                if (tokens < 10) {
                    showTokenFeedback('Not enough tokens!');
                    shakeScreen();
                    return;
                }
                let prev = tokens;
                tokens -= 10;
                updateTokenDisplay(-10);

                // Animate pack
                this.style.transition = 'transform 0.1s ease-out';
                this.style.transform = 'scale(0.93)';

                const cardDisplayArea = document.getElementById('card-display-area');

                // Draw only one card per click, keep previous cards
                let drawnCardId;
                // Check if a debug override for drawing is active
                if (typeof window.forceDebugDraw === 'function') {
                    console.log("MainScript: Using window.forceDebugDraw to determine card ID.");
                    drawnCardId = window.forceDebugDraw();
                    delete window.forceDebugDraw; // Clean up the debug hook immediately after use
                } else {
                    drawnCardId = drawCardFromStarterPack();
                }


                if (!CARD_DATA[drawnCardId]) {
                    console.error(`Data for drawn card ID "${drawnCardId}" not found.`);
                    return;
                }

                // Helper function to add a card to its stack
                async function addCardToStack(cardId, cardElementInstance) {
                    const info = CARD_DATA[cardId]; // Still need info for stack logic
                    if (!info) {
                        console.error(`Card info not found for ${cardId} in addCardToStack`);
                        return;
                    }

                    const cardDisplayArea = document.getElementById('card-display-area');
                    let stack = cardDisplayArea.querySelector(`.card-stack[data-card-id="${cardId}"]`);
                    if (!stack) {
                        stack = document.createElement('div');
                        stack.className = 'card-stack';
                        stack.setAttribute('data-card-id', cardId);
                        stack.style.position = 'relative';
                        stack.style.display = 'inline-block';
                        stack.style.margin = '0 10px';
                        stack.style.verticalAlign = 'top';
                        cardDisplayArea.appendChild(stack);
                    }

                    const cardElem = cardElementInstance;
                    // Reset styles that might have been applied during special animation
                    cardElem.style.position = 'absolute';
                    cardElem.style.transform = '';
                    cardElem.style.opacity = '';
                    cardElem.style.transition = '';
                    cardElem.classList.remove('pugman-animation-card', 'animate');
    
                    const stackCount = stack.childElementCount;
                    // Determine stack offset from CSS custom property for responsiveness
                    // In your CSS, define:
                    // :root { --card-stack-offset: 32px; }
                    // @media (max-width: 767px) { :root { --card-stack-offset: 20px; } }
                    const stackOffsetString = getComputedStyle(document.documentElement).getPropertyValue('--card-stack-offset').trim() || '32px';
                    const stackOffset = parseInt(stackOffsetString, 10);
                    cardElem.style.top = `${stackCount * stackOffset}px`;
                    cardElem.style.left = '0';
                    cardElem.style.zIndex = stackCount + 1;

                    stack.appendChild(cardElem);
                    attachCardEventListeners(cardElem); // Attach event listeners to the new card

                    // Disable interaction for all but the top card in the stack
                    Array.from(stack.children).forEach((child, idx, arr) => {
                        if (idx !== arr.length - 1) {
                            child.style.pointerEvents = 'none';
                            child.style.filter = 'brightness(0.8) grayscale(0.3)';
                            child.style.cursor = 'default';
                        } else {
                            child.style.pointerEvents = '';
                            child.style.filter = '';
                            child.style.cursor = 'pointer';
                        }
                    });

                    // Make it visible in the stack
                    cardElem.classList.add('is-visible');

                    // Card reveal logic
                    if (cardElementInstance.dataset.specialAnimated === 'true') {
                        // Card just had a special animation (e.g., Pugman), lands face up.
                        cardElem.classList.add('flipped'); // Ensure it's visually flipped
                        triggerConfettiForCard(cardElem);
                    } else {
                        // Standard reveal for other cards
                        cardElem.classList.remove('flipped'); // Start with back showing
                        // Stagger before flip sequence (matches original timing)
                        await new Promise(resolve => setTimeout(resolve, PACK_CARD_APPEAR_STAGGER_MS)); // Delay before flip
                        // Flip after "appear" duration (PACK_CARD_APPEAR_DURATION_MS)
                        setTimeout(() => {
                            cardElem.classList.add('flipped');
                            triggerConfettiForCard(cardElem);
                        }, PACK_CARD_APPEAR_DURATION_MS);
                    }
                    delete cardElementInstance.dataset.specialAnimated; // Clean up temp attribute
                }

                let packResetDelay = PACK_CARD_APPEAR_DURATION_MS + PACK_REVEAL_FLIP_DELAY_MS + 300;

                if (drawnCardId === 'pugman') {
                    const pugmanCardInfo = CARD_DATA['pugman'];
                    const pugmanCardElem = createCardElement('pugman', pugmanCardInfo.cardRank, pugmanCardInfo.img, pugmanCardInfo.alt);
                    pugmanCardElem.dataset.specialAnimated = 'true'; // Mark for special handling in addCardToStack

                    // Create the revolver card element to animate alongside Pugman
                    const revolverCardInfo = CARD_DATA['pugman-revolver'];
                    const revolverCardElem = createCardElement('pugman-revolver', revolverCardInfo.cardRank, revolverCardInfo.img, revolverCardInfo.alt);
                    revolverCardElem.dataset.specialAnimated = 'true'; // Mark for special handling

                    // --- Special Pugman Animation ---
                    const overlay = document.createElement('div');
                    overlay.className = 'pugman-animation-overlay';
                    document.body.appendChild(overlay);

                    // Add animation class to both cards
                    pugmanCardElem.classList.add('pugman-animation-card');
                    revolverCardElem.classList.add('pugman-animation-card');

                    // Add cards to overlay (they will overlap and animate together)
                    overlay.appendChild(pugmanCardElem);
                    overlay.appendChild(revolverCardElem);

                    // Force reflow for transitions to apply correctly
                    await new Promise(resolve => setTimeout(resolve, 20)); 
                    overlay.classList.add('visible'); // Fade in overlay

                    // Wait for overlay to be somewhat visible before cards animate
                    await new Promise(resolve => setTimeout(resolve, 150)); // Adjusted from 300
                    pugmanCardElem.classList.add('animate'); // Trigger Pugman card spin/scale
                    revolverCardElem.classList.add('animate'); // Trigger Revolver card spin/scale

                    // Wait for card animation to complete (1.5s for transform)
                    const pugmanSpinDuration = 1500;
                    await new Promise(resolve => setTimeout(resolve, pugmanSpinDuration + 100)); // Wait for spin + buffer

                    // Now that spinning is done, flip the card to its front
                    pugmanCardElem.classList.add('flipped');
                    revolverCardElem.classList.add('flipped'); // Flip revolver card as well
                    const pugmanFlipDuration = 600; // Matches CSS transition for .card-inner
                    await new Promise(resolve => setTimeout(resolve, pugmanFlipDuration)); // Wait for flip animation

                    overlay.classList.remove('visible'); // Fade out overlay
                    const overlayFadeOutDuration = 300;
                    await new Promise(resolve => setTimeout(resolve, overlayFadeOutDuration)); // Wait for overlay fade out

                    // Clean up animation classes and styles from Pugman card
                    pugmanCardElem.classList.remove('animate', 'pugman-animation-card');
                    pugmanCardElem.style.transform = '';
                    pugmanCardElem.style.opacity = '';
                    pugmanCardElem.style.transition = '';

                    // Clean up animation classes and styles from Revolver card
                    revolverCardElem.classList.remove('animate', 'pugman-animation-card');
                    revolverCardElem.style.transform = '';
                    revolverCardElem.style.opacity = '';
                    revolverCardElem.style.transition = '';

                    if (overlay.parentNode) { // Check if still in DOM
                        if (pugmanCardElem.parentNode === overlay) overlay.removeChild(pugmanCardElem);
                        if (revolverCardElem.parentNode === overlay) overlay.removeChild(revolverCardElem); // Remove revolver from overlay
                        document.body.removeChild(overlay);
                    }
                    // --- End Special Pugman Animation ---

                    await addCardToStack(drawnCardId, pugmanCardElem);
                    await addCardToStack('pugman-revolver', revolverCardElem); // Add the animated revolver card to stack
                    // Adjust packResetDelay: spin + flip + overlay fade + buffer
                    packResetDelay = pugmanSpinDuration + pugmanFlipDuration + overlayFadeOutDuration + 500; 
                } else {
                    const cardInfo = CARD_DATA[drawnCardId];
                    await addCardToStack(drawnCardId, createCardElement(drawnCardId, cardInfo.cardRank, cardInfo.img, cardInfo.alt));
                }
                setTimeout(() => {
                    this.style.transform = 'scale(1)';
                }, packResetDelay);
            } else {
                console.warn(`Pack ID "${packId}" does not have a specific opening logic or has been removed.`);
            }
        });
    });

    // --- Initialize Particle.js Background ---
    // Make sure this is called after the #particles-js div is in the DOM.
    if (typeof particlesJS !== 'undefined') {
        particlesJS('particles-js', {
            "particles": {
                "number": {
                    "value": 100, // Number of particles
                    "density": {
                        "enable": true,
                        "value_area": 800 // Area where particles are distributed
                    }
                },
                "color": {
                    "value": "#ffffff" // Particle color - white for good contrast on dark bg
                },
                "shape": {
                    "type": "polygon", // Shape: "circle", "edge", "triangle", "polygon", "star", "image"
                    "stroke": {
                        "width": 0,
                        "color": "#000000"
                    },
                    "polygon": {
                        "nb_sides": 1
                    }
                },
                "opacity": {
                    "value": 0.5, // Base opacity
                    "random": false,
                    "anim": {
                        "enable": false,
                        "speed": 1,
                        "opacity_min": 0.1,
                        "sync": false
                    }
                },
                "size": {
                    "value": 3, // Base size
                    "random": true,
                    "anim": {
                        "enable": false,
                        "speed": 40,
                        "size_min": 0.1,
                        "sync": false
                    }
                },
                "line_linked": {
                    "enable": true,
                    "distance": 150, // Max distance to link particles
                    "color": "#888888", // Link color - a medium grey
                    "opacity": 0.4,
                    "width": 1
                },
                "move": {
                    "enable": true,
                    "speed": 3, // Movement speed
                    "direction": "none", // "none", "top", "top-right", etc.
                    "random": false,
                    "straight": false,
                    "out_mode": "out", // "out" or "bounce"
                    "bounce": false,
                    "attract": {
                        "enable": false,
                        "rotateX": 600,
                        "rotateY": 1200
                    }
                }
            },
            "interactivity": {
                "detect_on": "canvas", // "canvas" or "window"
                "events": {
                    "onhover": {
                        "enable": false,
                        "mode": "repulse" // "grab", "bubble", "repulse"
                    },
                    "onclick": {
                        "enable": false,
                        "mode": "repulse" // "push" (adds particles), "remove", "bubble", "repulse"
                    },
                    "resize": true // Recalculates particles on window resize
                },
                "modes": { // Configuration for interactivity modes
                    "grab": {"distance": 140, "line_opacity": 1},
                    "bubble": {"distance": 400, "size": 40, "duration": 2, "opacity": 8, "speed": 3},
                    "repulse": {"distance": 200, "duration": 0.4},
                    "push": {"particles_nb": 4}, // Number of particles to add on click
                    "remove": {"particles_nb": 2}
                }
            },
            "retina_detect": true // Better rendering on high-density displays
        });
    } else {
        console.warn("particles.js library not loaded. Interactive background will not be displayed.");
    }

    // --- Token System ---
    const tokenCountElem = document.getElementById('token-count');
    const tokenFeedbackElem = document.getElementById('token-feedback');
    let tokens = 100;
    let rollingTokenInterval = null;

    function rollTokenDisplay(target, diff = 0) {
        clearInterval(rollingTokenInterval);
        let current = parseInt(tokenCountElem.textContent, 10) || 0;
        const step = current < target ? 1 : -1;
        const speed = 3; // ms per step, much faster roll

        rollingTokenInterval = setInterval(() => {
            if (current === target) {
                clearInterval(rollingTokenInterval);
                if (diff !== 0) showTokenFeedback(diff > 0 ? `+${diff} Tokens` : `${diff} Tokens`);
                return;
            }
            current += step;
            tokenCountElem.textContent = current;
        }, speed);
        // If the change is 0, just show the number
        if (current === target) tokenCountElem.textContent = target;
    }

    function showTokenFeedback(msg) {
        tokenFeedbackElem.textContent = msg;
        tokenFeedbackElem.classList.add('visible');
        setTimeout(() => tokenFeedbackElem.classList.remove('visible'), 1200);
    }

    function shakeScreen() {
        document.body.classList.remove('shake');
        void document.body.offsetWidth;
        document.body.classList.add('shake');
        setTimeout(() => document.body.classList.remove('shake'), 450);
    }

    // Use this function after any token change:
    function updateTokenDisplay(diff = 0) {
        rollTokenDisplay(tokens, diff);
    }

    // --- Card Sell Values ---
    const CARD_SELL_VALUES = {
        'regular': 10,
        'prime': 50,
        'pugman': 250,
        'pugman_gun': 250
    };

    // --- Sell Duplicates Modal Logic ---
    const sellModal = document.getElementById('sell-modal');
    const sellModalBackdrop = document.getElementById('sell-modal-backdrop');
    const sellForm = document.getElementById('sell-form');
    const sellModalCancel = document.getElementById('sell-modal-cancel');
    const sellFormRows = document.getElementById('sell-form-rows');

    // Helper: Get all cards in stacks (top to bottom)
    function getAllStackedCards() {
        return Array.from(document.querySelectorAll('.card-stack')).flatMap(stack =>
            Array.from(stack.children)
        );
    }

    // Helper: Count cards by originalCardId
    function countCardsById() {
        const counts = {};
        getAllStackedCards().forEach(card => {
            const origId = card.dataset.originalCardId;
            counts[origId] = (counts[origId] || 0) + 1;
        });
        return counts;
    }

    // Helper: Get top N cards of a stack
    function getTopNCards(stack, n) {
        // stack.children is HTMLCollection, newest card is lastChild
        const arr = Array.from(stack.children);
        return arr.slice(-n);
    }

    // Open Sell Modal
    document.getElementById('sell-dupes-btn').addEventListener('click', () => {
        const counts = countCardsById();
        const ownedCardIds = Object.keys(counts).filter(cardId => counts[cardId] > 0);

        if (ownedCardIds.length === 0) {
            showTokenFeedback('No cards to sell!');
            return;
        }

        sellFormRows.innerHTML = '';
        ownedCardIds.forEach(cardId => {
            const cardInfo = CARD_DATA[cardId];
            const count = counts[cardId];
            const rank = cardInfo?.cardRank || 'regular';
            let sellValue = CARD_SELL_VALUES[rank] || 10;
            if (cardId === 'pugman' || cardId === 'pugman_gun') sellValue = 250;

            const row = document.createElement('div');
            row.className = 'sell-row';

            row.innerHTML = `
                <span class="sell-card-label">
                    <img class="sell-card-img" src="${cardInfo?.img || ''}" alt="${cardInfo?.alt || cardId}">
                    ${cardInfo?.alt || cardId}
                    <span class="sell-card-count">x${count}</span>
                </span>
                <input class="sell-input" type="number" min="0" max="${count}" value="0" name="${cardId}">
                <span class="sell-value" id="sell-value-${cardId}">0</span>
            `;
            sellFormRows.appendChild(row);

            // Live update value
            const input = row.querySelector('.sell-input');
            input.addEventListener('input', function () {
                let val = Math.max(0, Math.min(Number(this.value), count));
                this.value = val;
                row.querySelector('.sell-value').textContent = val * sellValue;
            });
        });

        sellModal.style.display = 'flex';
    });

    // Cancel button
    sellModalCancel.onclick = () => {
        sellModal.style.display = 'none';
    };

    // Backdrop click closes modal
    sellModalBackdrop.onclick = () => {
        sellModal.style.display = 'none';
    };

    // Confirm sell
    sellForm.onsubmit = function (e) {
        e.preventDefault();
        const counts = countCardsById();
        let sellAllList = [];

        // Gather sell info
        Array.from(sellForm.elements).forEach(input => {
            if (!input.name) return;
            const cardId = input.name;
            const toSell = Math.max(0, Math.min(Number(input.value), counts[cardId]));
            if (toSell > 0 && toSell === counts[cardId]) {
                sellAllList.push(cardId);
            }
        });

        // If any card is being sold in full, show confirm modal
        if (sellAllList.length > 0) {
            showConfirmModal(
                `You are about to sell all copies of: ${sellAllList.map(id => CARD_DATA[id]?.alt || id).join(', ')}. Are you sure?`,
                () => doSell()
            );
        } else {
            doSell();
        }

        function doSell() {
            let totalEarned = 0;
            Array.from(sellForm.elements).forEach(input => {
                if (!input.name) return;
                const cardId = input.name;
                const toSell = Math.max(0, Math.min(Number(input.value), counts[cardId]));
                if (toSell > 0) {
                    const stack = document.querySelector(`.card-stack[data-card-id="${cardId}"]`);
                    if (stack) {
                        const topCards = getTopNCards(stack, toSell);
                        topCards.reverse().forEach(card => stack.removeChild(card));
                    }
                    const cardInfo = CARD_DATA[cardId];
                    let sellValue = 10;
                    if (cardId === 'pugman' || cardId === 'pugman_gun') {
                        sellValue = 250;
                    } else {
                        const rank = cardInfo?.cardRank || 'regular';
                        sellValue = CARD_SELL_VALUES[rank] || 10;
                    }
                    totalEarned += sellValue * toSell;
                }
            });

            if (totalEarned > 0) {
                tokens += totalEarned;
                updateTokenDisplay(totalEarned);
                showTokenFeedback(`+${totalEarned} Tokens`);
            }
            sellModal.style.display = 'none';
        }
    };

    const confirmModal = document.getElementById('confirm-modal');
    const confirmModalBackdrop = document.getElementById('confirm-modal-backdrop');
    const confirmModalContent = document.getElementById('confirm-modal-content');
    const confirmModalMessage = document.getElementById('confirm-modal-message');
    const confirmModalCancel = document.getElementById('confirm-modal-cancel');
    const confirmModalOk = document.getElementById('confirm-modal-ok');

    function showConfirmModal(message, onConfirm) {
        confirmModalMessage.textContent = message;
        confirmModal.style.display = 'flex';
        function cleanup() {
            confirmModal.style.display = 'none';
            confirmModalOk.onclick = null;
            confirmModalCancel.onclick = null;
            confirmModalBackdrop.onclick = null;
        }
        confirmModalOk.onclick = () => { cleanup(); onConfirm(); };
        confirmModalCancel.onclick = cleanup;
        confirmModalBackdrop.onclick = cleanup;
    }
});
