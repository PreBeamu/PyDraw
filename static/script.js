// ============================
// GLOBAL SETUP
// ============================
const socket = io();

// Avatar Items count
const hairs_amount = 8;
const accessories_amount = 8;
const faces_amount = 10;

// ============================
// IMAGE URL HELPERS
// ============================
function urlFace(i) {
    return `/static/Images/Avatar/Faces/${i}.svg`;
}
function urlHair(i) {
    return `/static/Images/Avatar/Hairs/${i}.svg`;
}
function urlAccessory(i) {
    return `/static/Images/Avatar/Accessories/${i}.svg`;
}
const urlPlayer = `/static/Images/Avatar/Player.svg`;
const urlShirt  = `/static/Images/Avatar/Shirt.svg`;

// ============================
// IMAGE PRELOAD
// ============================
function preloadImage(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = url;
    });
}

// Build all URLs
const imageUrls = [];
for (let i = 1; i <= faces_amount; i++) imageUrls.push(urlFace(i));
for (let i = 1; i <= hairs_amount; i++) imageUrls.push(urlHair(i));
for (let i = 1; i <= accessories_amount; i++) imageUrls.push(urlAccessory(i));
imageUrls.push(urlPlayer, urlShirt);

// Preload all images then randomize
Promise.all(imageUrls.map(preloadImage)).then(() => {
    randomizeAvatar();
});

// ============================
// HELPER FUNCTIONS
// ============================
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function setImageWhenLoaded(selector, url) {
    const img = new Image();
    img.onload = () => {
        $(selector).attr("src", url);
    };
    img.src = url;
}

// Randomize avatar
function randomizeAvatar() {
    const face = randomInt(1, faces_amount);
    const hair = randomInt(1, hairs_amount);
    const accessory = randomInt(1, accessories_amount);

    setImageWhenLoaded("#player-face", urlFace(face));
    setImageWhenLoaded("#player-hair", urlHair(hair));
    setImageWhenLoaded("#player-accessory", urlAccessory(accessory));
}

// ============================
// BUTTONS
// ============================
$("#random-avatar").on("click", () => {
    randomizeAvatar();
});
