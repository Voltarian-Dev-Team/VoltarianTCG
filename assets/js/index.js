// --- Main Application Script ---
// This part would typically be in your main application file (e.g., 'main.js').
// It relies on the 'Confetti' object being available from the 'confetti-lib.js' (or similar).

// A Set to keep track of cards that have already triggered confetti.
// This ensures confetti only appears on the first flip of each unique card.
// IMPORTANT: For this to work correctly, each card MUST have a unique 'id' attribute.
const flippedCardIds = new Set();

// A Set to keep track of pack IDs that have already been opened.
const openedPacks = new Set();

// Object to store loaded Image objects for each rank.
// These images will be used to draw custom confetti particles.
const rankConfettiImages = {
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

    // --- Card Interaction Setup ---
    // Select all elements with the class 'character-card' to attach event listeners.
    // IMPORTANT: Ensure your HTML card elements have the class 'character-card'
    // and a unique 'id' attribute (e.g., <div id="card1" class="character-card" cardRank="Gold">).
    const characterCards = document.querySelectorAll(".character-card");

    characterCards.forEach(card => {
        // Card Flip event listener
        card.addEventListener("click", function () {
            const wasFlipped = this.classList.contains("flipped"); // Check state *before* toggle

            // Toggle the 'flipped' class to perform the card flip animation
            this.classList.toggle("flipped");

            // If it just became flipped (was not flipped, now is flipped)
            // and confetti hasn't been triggered for this card ID yet.
            if (!wasFlipped && this.classList.contains("flipped")) {
                triggerConfettiForCard(this);
            }
        });



        // 3D Tilt on Hover: Calculates rotation based on mouse position
        // Store a reference to the 'card' element to ensure 'querySelector' is called on it.
        const currentCard = card;
        currentCard.addEventListener("mousemove", (e) => {
            const rect = currentCard.getBoundingClientRect();
            const x = e.clientX - rect.left; // x position within the card
            const y = e.clientY - rect.top;  // y position within the card
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const maxTilt = 13; // Maximum tilt in degrees

            // Calculate rotation for Y (horizontal movement) and X (vertical movement) axes
            const rotY = ((x - centerX) / centerX) * maxTilt;
            const rotX = -((y - centerY) / centerY) * maxTilt;

            // Get the card-inner element for this specific card
            const cardInner = currentCard.querySelector(".card-inner");
            if (cardInner) {
                // Apply rotation. If the card is flipped, add 180deg to the Y rotation.
                if (currentCard.classList.contains("flipped")) {
                    cardInner.style.transform = `rotateY(${rotY}deg) rotateX(${rotX}deg)`;
                } else {
                    cardInner.style.transform = `rotateY(${180 + rotY}deg) rotateX(${rotX}deg)`;
                }
            }
        });

        // 3D Tilt on Hover: Resets tilt when mouse leaves the card
        currentCard.addEventListener("mouseleave", () => {
            const cardInner = currentCard.querySelector(".card-inner");
            if (cardInner) {
                // Reset inline transform style, allowing CSS to define the resting state
                cardInner.style.transform = "";
            }
        });

        // 3D Tilt on Hover: Resets transition for a smooth entry
        currentCard.addEventListener("mouseenter", () => {
            const cardInner = currentCard.querySelector(".card-inner");
            if (cardInner) {
                // This ensures a smooth transition when the mouse enters after a mouseleave
                cardInner.style.transition = "transform 0.12s cubic-bezier(.4,2.3,.3,1)";
            }
        });

        // Ensures smooth transition after the card flip animation completes
        currentCard.addEventListener("transitionend", () => {
            const cardInner = currentCard.querySelector(".card-inner");
            if (cardInner) {
                // After the flip, set a longer, smoother transition for subsequent tilts
                cardInner.style.transition = "transform 0.6s cubic-bezier(.4,2.3,.3,1)";
            }
        });
    });

    // --- Card Pack Opening Setup ---
    const packOpenerElements = document.querySelectorAll('.card-pack-opener');

    packOpenerElements.forEach(packOpener => {
        packOpener.addEventListener('click', async function() { // Use 'function' for 'this'
            const packId = this.dataset.packId;
            const packContentsString = this.dataset.packContents;

            if (!packId || !packContentsString) {
                console.error("Pack opener is missing data-pack-id or data-pack-contents attributes.", this);
                return;
            }

            if (openedPacks.has(packId)) {
                console.log(`Pack ${packId} has already been opened.`);
                // Optionally, provide some visual feedback that it's already opened
                this.style.transform = 'scale(0.90)'; // Slightly different scale for re-click
                setTimeout(() => {
                    // If it's already opened, it should have the 'opened' class
                    if (this.classList.contains('opened')) {
                        this.style.transform = 'scale(0.95)';
                    } else {
                         this.style.transform = 'scale(1)';
                    }
                }, 150);
                return;
            }

            openedPacks.add(packId);
            this.classList.add('opened'); // Uses CSS for opened state

            // Define the IDs of the cards that are "in" this pack
            const packContentsIds = packContentsString.split(',').map(id => id.trim()).filter(id => id);

            if (packContentsIds.length === 0) {
                console.warn(`Pack ${packId} has no cards defined in data-pack-contents.`);
                return;
            }

            // --- Phase 1: Make cards "appear" (fly in, face down) ---
            const appearPromises = [];
            for (let i = 0; i < packContentsIds.length; i++) {
                const cardId = packContentsIds[i];
                const cardElement = document.getElementById(cardId);

                if (cardElement) {
                    const promise = new Promise(resolve => {
                        setTimeout(() => {
                            cardElement.classList.add('is-visible');
                            // Resolve after the CSS animation for appearing is expected to finish
                            setTimeout(resolve, PACK_CARD_APPEAR_DURATION_MS);
                        }, i * PACK_CARD_APPEAR_STAGGER_MS);
                    });
                    appearPromises.push(promise);
                }
            }
            await Promise.all(appearPromises); // Wait for all "appear" animations to be triggered and notionally complete

            // --- Phase 2: Sequentially flip cards and show confetti ---
            for (let i = 0; i < packContentsIds.length; i++) {
                const cardId = packContentsIds[i];
                const cardElement = document.getElementById(cardId);

                if (cardElement && !cardElement.classList.contains("flipped")) {
                    await new Promise(resolve => setTimeout(resolve, PACK_REVEAL_FLIP_DELAY_MS));
                    cardElement.classList.add("flipped");
                    triggerConfettiForCard(cardElement);
                }
            }
        });
    });
});
