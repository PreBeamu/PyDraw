// ============================
// AVATAR HELPERS
// ============================

import { COLORS_AMOUNT, FACES_AMOUNT, HAIRS_AMOUNT, ACCESSORIES_AMOUNT, FIRSTNAMES, LASTNAMES } from '/static/scripts/constants.js';
import { CLIENT_DATA } from '/static/scripts/clientData.js';
import { randomInt } from '/static/scripts/utils.js';

// Avatar URL helpers
export function urlColor(i) {
    return `/static/Images/Avatar/Colors/${i}.svg`;
}

export function urlFace(i) {
    return `/static/Images/Avatar/Faces/${i}.svg`;
}

export function urlHair(i) {
    return `/static/Images/Avatar/Hairs/${i}.svg`;
}

export function urlAccessory(i) {
    return `/static/Images/Avatar/Accessories/${i}.svg`;
}

export const urlPlayer = `/static/Images/Avatar/Player.svg`;
export const urlShirt = `/static/Images/Avatar/Shirt.svg`;

// Preload avatar images
export function preloadAvatarImages() {
    const imageUrls = [];
    for (let i = 1; i <= COLORS_AMOUNT; i++) imageUrls.push(urlColor(i));
    for (let i = 1; i <= FACES_AMOUNT; i++) imageUrls.push(urlFace(i));
    for (let i = 1; i <= HAIRS_AMOUNT; i++) imageUrls.push(urlHair(i));
    for (let i = 1; i <= ACCESSORIES_AMOUNT; i++) imageUrls.push(urlAccessory(i));
    imageUrls.push(urlPlayer, urlShirt);

    // Preload by creating Image objects
    imageUrls.forEach(url => {
        const img = new Image();
        img.src = url;
    });
}

export function setPlayerName() {
    const saved = localStorage.getItem("avatar");
    if (saved) {
        CLIENT_DATA.avatar = JSON.parse(saved);
    }
    
    let userName = $("#userName").val().trim().replace(/\s+/g, "");
    if (userName.length === 0) {
        const first = FIRSTNAMES[Math.floor(Math.random() * FIRSTNAMES.length)];
        const last = LASTNAMES[Math.floor(Math.random() * LASTNAMES.length)];
        userName = first + last;
    }
    CLIENT_DATA.playerName = userName;
}

export function setImageWhenLoaded(selector, url) {
    const img = new Image();
    img.onload = () => {
        $(selector).attr("src", url);
    };
    img.src = url;
}

export function saveAvatar() {
    localStorage.setItem("avatar", JSON.stringify(CLIENT_DATA.avatar));
}

export function loadAvatar() {
    const saved = localStorage.getItem("avatar");
    if (saved) {
        CLIENT_DATA.avatar = JSON.parse(saved);

        setImageWhenLoaded("#plr-color", urlColor(CLIENT_DATA.avatar[0]));
        setImageWhenLoaded("#closet #color .player", urlColor(CLIENT_DATA.avatar[0]));

        setImageWhenLoaded("#plr-face", urlFace(CLIENT_DATA.avatar[1]));
        setImageWhenLoaded("#closet #face .face", urlFace(CLIENT_DATA.avatar[1]));

        setImageWhenLoaded("#plr-hair", urlHair(CLIENT_DATA.avatar[2]));
        setImageWhenLoaded("#closet #hair .hair", urlHair(CLIENT_DATA.avatar[2]));

        setImageWhenLoaded("#plr-acc", urlAccessory(CLIENT_DATA.avatar[3]));
        setImageWhenLoaded("#closet #acc .acc", urlAccessory(CLIENT_DATA.avatar[3]));
    } else {
        randomizeAvatar();
    }
}

export function randomizeAvatar() {
    const color = randomInt(1, COLORS_AMOUNT);
    const face = randomInt(1, FACES_AMOUNT);
    const hair = randomInt(1, HAIRS_AMOUNT);
    const acc = randomInt(1, ACCESSORIES_AMOUNT);

    setImageWhenLoaded("#plr-color", urlColor(color));
    setImageWhenLoaded("#closet #color .player", urlColor(color));
    CLIENT_DATA.avatar[0] = color;

    setImageWhenLoaded("#plr-face", urlFace(face));
    setImageWhenLoaded("#closet #face .face", urlFace(face));
    CLIENT_DATA.avatar[1] = face;

    setImageWhenLoaded("#plr-hair", urlHair(hair));
    setImageWhenLoaded("#closet #hair .hair", urlHair(hair));
    CLIENT_DATA.avatar[2] = hair;

    setImageWhenLoaded("#plr-acc", urlAccessory(acc));
    setImageWhenLoaded("#closet #acc .acc", urlAccessory(acc));
    CLIENT_DATA.avatar[3] = acc;

    saveAvatar();
}

export function buildAvatarDOM(avatar) {
    return $('<div class="av-display"></div>').append(
        $(`<img class="player" src="${urlColor(avatar[0])}">`),
        $(`<img class="shirt" src="${urlShirt}">`),
        $(`<img class="face" src="${urlFace(avatar[1])}">`),
        $(`<img class="hair" src="${urlHair(avatar[2])}">`),
        $(`<img class="acc" src="${urlAccessory(avatar[3])}">`)
    );
}