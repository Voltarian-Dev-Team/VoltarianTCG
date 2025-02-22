document.addEventListener("DOMContentLoaded", function() {
    const character = document.querySelector('.character');
    
    character.addEventListener('mouseover', () => {
        character.style.filter = ' contrast(2) brightness(1.5) saturate(2) sepia(0.7) saturate(3) hue-rotate(-20deg)';
    });
    
    character.addEventListener('mouseout', () => {
        character.style.filter = ' contrast(2) brightness(1.3) saturate(2) sepia(0.7) saturate(3) hue-rotate(-20deg)';
    });
});
