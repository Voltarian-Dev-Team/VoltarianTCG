// --- Confetti Library Module ---
// This entire block can be placed in a separate JavaScript file (e.g., 'confetti-lib.js').
// It encapsulates all confetti-related logic and exposes only what's necessary.
const Confetti = (function () {
    // Private variables for the confetti system
    let confettiCanvas;
    let confettiCtx;
    let confettiParticles = [];
    let animationFrameId = null;

    // --- Confetti Particle Class ---
    /**
     * Represents a single confetti particle.
     * @class
     * @param {number} x - Initial X position.
     * @param {number} y - Initial Y position.
     * @param {number} vx - Initial X velocity.
     * @param {number} vy - Initial Y velocity.
     * @param {HTMLImageElement} image - The image to draw for this particle.
     * @param {number} width - The width of the particle.
     * @param {number} height - The height of the particle.
     */
    class ConfettiParticle {
        constructor(x, y, vx, vy, image, width, height) {
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
            this.image = image;
            this.width = width;
            this.height = height;
            this.alpha = 1; // Opacity, for fading out
            this.rotation = Math.random() * Math.PI * 2; // Initial random rotation
            this.rotationSpeed = (Math.random() - 0.5) * 0.1; // Random rotation speed
            this.gravity = 0.5; // Downward acceleration
            this.friction = 0.99; // Horizontal deceleration
            this.decay = 0.01; // Rate of alpha decay (how fast it fades)
        }

        /**
         * Updates the particle's position, velocity, rotation, and opacity.
         */
        update() {
            this.vx *= this.friction; // Apply friction to horizontal velocity
            this.vy += this.gravity; // Apply gravity to vertical velocity
            this.x += this.vx;
            this.y += this.vy;
            this.rotation += this.rotationSpeed; // Update rotation
            this.alpha -= this.decay; // Decrease opacity
        }

        /**
         * Draws the particle on the canvas context.
         * @param {CanvasRenderingContext2D} ctx - The 2D rendering context of the canvas.
         */
        draw(ctx) {
            ctx.save(); // Save the current canvas state (important for transformations)
            ctx.translate(this.x, this.y); // Move origin to particle's center for rotation
            ctx.rotate(this.rotation); // Apply rotation
            ctx.globalAlpha = Math.max(0, this.alpha); // Apply opacity, ensuring it doesn't go below 0

            // Draw the image centered around the new origin
            if (this.image) {
                ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
            }
            ctx.restore(); // Restore the canvas state to not affect other drawings
        }
    }

    // --- Confetti Canvas Initialization ---
    /**
     * Initializes the confetti canvas, setting its properties and adding it to the DOM.
     * It's set to cover the entire window and be non-interactive.
     */
    function initConfettiCanvas() {
        confettiCanvas = document.createElement('canvas');
        confettiCtx = confettiCanvas.getContext('2d');

        // Style the canvas to cover the entire window and be non-interactive
        confettiCanvas.style.position = 'fixed';
        confettiCanvas.style.top = '0';
        confettiCanvas.style.left = '0';
        confettiCanvas.style.width = '100vw';
        confettiCanvas.style.height = '100vh';
        confettiCanvas.style.pointerEvents = 'none'; // Allow clicks to pass through elements beneath it
        confettiCanvas.style.zIndex = '9998'; // Ensure it's above most content but below any critical modals

        document.body.appendChild(confettiCanvas); // Add the canvas to the document body

        // Set initial canvas dimensions
        resizeConfettiCanvas();
    }

    /**
     * Resizes the confetti canvas to match the window's dimensions.
     * This function should be called on window resize events to maintain responsiveness.
     */
    function resizeConfettiCanvas() {
        if (confettiCanvas) {
            confettiCanvas.width = window.innerWidth;
            confettiCanvas.height = window.innerHeight;
        }
    }

    // --- Confetti Animation Loop ---
    /**
     * The main animation loop for the confetti particles.
     * It clears the canvas, updates and redraws all active particles,
     * and requests the next animation frame.
     */
    function animateConfettiLoop() {
        // Clear the entire canvas for the new frame
        if (confettiCtx) {
            confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        }

        // Filter out particles that have faded completely (alpha <= 0) or fallen off screen
        confettiParticles = confettiParticles.filter(particle =>
            particle.alpha > 0 && particle.y < confettiCanvas.height + particle.height
        );

        // Update and draw remaining particles
        confettiParticles.forEach(particle => {
            particle.update();
            particle.draw(confettiCtx);
        });

        // Continue the animation loop if there are still particles
        if (confettiParticles.length > 0) {
            animationFrameId = requestAnimationFrame(animateConfettiLoop);
        } else {
            animationFrameId = null; // Stop the loop when no particles are left
        }
    }

    /**
     * Creates and adds new confetti particles to the canvas.
     * This is the main function exposed by the confetti library for external use.
     * @param {number} originX - Normalized X coordinate (0-1) for the burst origin.
     * @param {number} originY - Normalized Y coordinate (0-1) for the burst origin.
     * @param {number} count - Number of confetti particles to create.
     * @param {HTMLImageElement} image - The image to use for the particles.
     * @param {number} particleWidth - Desired width of each particle.
     * @param {number} particleHeight - Desired height of each particle.
     */
    function createConfetti(originX, originY, count, image, particleWidth, particleHeight) {
        // Convert normalized origin (0-1) to actual pixel coordinates on the canvas
        const actualX = originX * confettiCanvas.width;
        const actualY = originY * confettiCanvas.height;

        for (let i = 0; i < count; i++) {
            // For a more "falling like actual confetti" effect:
            // Give an initial upward (negative) vertical velocity, then gravity pulls it down.
            // Provide a random horizontal spread.
            const initialUpwardSpeed = Math.random() * 15 + 10; // Stronger initial upward thrust (pixels/frame)
            const horizontalSpread = Math.random() * 20 - 10; // Random horizontal velocity (-10 to +10 pixels/frame)

            const vx = horizontalSpread;
            const vy = -initialUpwardSpeed; // Initial upward velocity (negative for upward movement)

            confettiParticles.push(new ConfettiParticle(
                actualX,
                actualY,
                vx,
                vy,
                image,
                particleWidth,
                particleHeight
            ));
        }

        // Start the animation loop if it's not already running
        if (!animationFrameId) {
            animateConfettiLoop();
        }
    }

    // Initialize the confetti canvas when the DOM is ready.
    // This ensures the canvas exists before any confetti is attempted to be drawn.
    document.addEventListener("DOMContentLoaded", initConfettiCanvas);
    // Update canvas dimensions on window resize
    window.addEventListener('resize', resizeConfettiCanvas);

    // Expose the createConfetti function to the global scope via the 'Confetti' object.
    // This allows your main application script to call Confetti.createConfetti(...).
    return {
        createConfetti: createConfetti
    };
})();