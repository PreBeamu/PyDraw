// ============================
// GLOBAL SETUP
// ============================
const socket = io();

// Avatar Items count
const hairs_amount = 8;
const accessories_amount = 8;
const faces_amount = 10;

// ============================
// HELPER FUNCTIONS
// ============================

function preloadImage(url) {
    const img = new Image();
    img.src = url;
}
const imageUrls = [];
for (let i = 1; i <= faces_amount; i++) {
    imageUrls.push(`/static/Images/Avatar/Faces/${i}.svg`);
}
for (let i = 1; i <= hairs_amount; i++) {
    imageUrls.push(`/static/Images/Avatar/Hairs/${i}.svg`);
}
for (let i = 1; i <= accessories_amount; i++) {
    imageUrls.push(`/static/Images/Avatar/Accessories/${i}.svg`);
}
imageUrls.push(`/static/Images/Avatar/Player.svg`);
imageUrls.push(`/static/Images/Avatar/Shirt.svg`);
imageUrls.forEach((url) => preloadImage(url));

function randomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomizeAvatar() {
    // Random face
    const face = randomInt(1, faces_amount);
    $("#player-face").attr("src", `/static/Images/Avatar/Faces/${face}.svg`);
    // Random hair
    const hair = randomInt(1, hairs_amount);
    $("#player-hair").attr("src", `/static/Images/Avatar/Hairs/${hair}.svg`);
    // Random accessory
    const accessory = randomInt(1, accessories_amount);
    $("#player-accessory").attr("src", `/static/Images/Avatar/Accessories/${accessory}.svg`);
}
randomizeAvatar();

// ============================
// BUTTONS
// ============================

$("#random-avatar").on("click", async () => {
    randomizeAvatar();
});
