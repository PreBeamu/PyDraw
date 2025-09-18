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
    face = randomInt(1, 10)
    $("#player-face").attr("src", "/static/Images/Avatar/Faces/" + face + ".svg");
    // Random hairs
    hair = randomInt(1, 8)
    $("#player-hair").attr("src", "/static/Images/Avatar/Hairs/" + hair + ".svg");
    // Random accessories
    accessory = randomInt(1, 8)
    $("#player-accessory").attr("src", "/static/Images/Avatar/Accessories/" + accessory + ".svg");
}
randomizeAvatar()

// ============================
// BUTTONS
// ============================

$("#random-avatar").on("click", async () => {
    randomizeAvatar()
});