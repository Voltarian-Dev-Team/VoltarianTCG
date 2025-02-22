document.addEventListener("DOMContentLoaded", function() {
    const character = document.querySelector('.character');
    
    character.addEventListener('mouseover', () => {
        character.style.filter = 'brightness(1.5) contrast(2)';
    });
    
    character.addEventListener('mouseout', () => {
        character.style.filter = 'brightness(1.3) contrast(2)';
    });
});
