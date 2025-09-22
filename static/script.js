// ============================
// GLOBAL SETUP
// ============================
const socket = io();

// Avatar Items count
const colors_amount = 7;
const hairs_amount = 11;
const accessories_amount = 8;
const faces_amount = 10;

// ============================
// IMAGE URL HELPERS
// ============================
function urlColor(i) {
    return `/static/Images/Avatar/Colors/${i}.svg`;
}
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
const urlShirt = `/static/Images/Avatar/Shirt.svg`;

// Build all URLs
const imageUrls = [];
for (let i = 1; i <= colors_amount; i++) imageUrls.push(urlColor(i));
for (let i = 1; i <= faces_amount; i++) imageUrls.push(urlFace(i));
for (let i = 1; i <= hairs_amount; i++) imageUrls.push(urlHair(i));
for (let i = 1; i <= accessories_amount; i++) imageUrls.push(urlAccessory(i));
imageUrls.push(urlPlayer, urlShirt);
randomizeAvatar();

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
    const color = randomInt(1, colors_amount);
    const face = randomInt(1, faces_amount);
    const hair = randomInt(1, hairs_amount);
    const accessory = randomInt(1, accessories_amount);
    setImageWhenLoaded("#player-color", urlColor(color));
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

$("#create-button").on("click", () => {
    $(".main-page").addClass("disabled");
    $(".loader").addClass("active");
    setTimeout(() => {
        $(".party-page").removeClass("disabled");
        $(".loader").removeClass("active");
    }, 250);
});

$("#leave-button").on("click", () => {
    $(".party-page").addClass("disabled");
    $(".loader").addClass("active");
    setTimeout(() => {
        $(".main-page").removeClass("disabled");
        $(".loader").removeClass("active");
    }, 250);
});