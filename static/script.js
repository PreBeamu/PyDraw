// ============================
// VARIABLES
// ============================
const socket = io();

// ============================
// HELPER FUNCTIONS
// ============================

function randomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomizeAvatar() {
    // Random faces
    face = randomInt(1, 8)
    $("#player-face").attr("src", "/static/Images/Faces/" + face + ".svg");
    // Random hairs
    hair = randomInt(1, 8)
    $("#player-hair").attr("src", "/static/Images/Hairs/" + hair + ".svg");
    // Random accessories
    accessory = randomInt(1, 6)
    $("#player-accessory").attr("src", "/static/Images/Accessories/" + accessory + ".svg");
}
randomizeAvatar()

// ============================
// BUTTONS
// ============================

$("#random-avatar").on("click", async () => {
    randomizeAvatar()
});