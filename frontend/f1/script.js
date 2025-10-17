// Wait for the document to be fully loaded
document.addEventListener('DOMContentLoaded', function() {

    // Find the play button by its ID
    const playButton = document.getElementById('play-btn');

    // Add a click event listener to the button
    if (playButton) {
        playButton.addEventListener('click', function() {
            // Show a simple alert message when clicked
            alert('Starting the challenge! Good luck! 🎉');
        });
    }

});