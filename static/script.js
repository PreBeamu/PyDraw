// ============================
// MAIN SCRIPT
// ============================

import { preloadAvatarImages, loadAvatar } from './Scripts/avatar.js';
import { initSocketHandlers } from './Scripts/socketHandlers.js';
import { initUIHandlers } from './Scripts/uiHandlers.js';
import { initCanvas } from './Scripts/canvas.js';

// Initialize socket.io
const SOCKET = io();

// ============================
// INITIALIZATION
// ============================
$(document).ready(function () {
    preloadAvatarImages();
    loadAvatar();
    initSocketHandlers(SOCKET);
    initUIHandlers(SOCKET);
    initCanvas(SOCKET);
    $("#startGame-btn, #optionsO-btn, #optionsX-btn, .optionsC").hide();
});

$(window).bind("pageshow", function(event) {
    if (event.originalEvent.persisted) {
        window.location.reload() 
    }
})