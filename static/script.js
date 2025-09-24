// ============================
// GLOBAL SETUP
// ============================

// Initialize socket.io
const socket = io();

// Avatar Items count
const colors_amount = 7;
const hairs_amount = 11;
const accessories_amount = 8;
const faces_amount = 10;

// Random names (first + last = player nickname)
const firstNames = [
    "กะเพรา", "ข้าวผัด", "ผัดไทย", "ต้มยำ", "แกงเขียวหวาน",
    "มัสมั่น", "ลาบ", "ส้มตำ", "หมูกระทะ", "ไก่ทอด",
    "ปลาทอด", "แกงส้ม", "ไข่เจียว", "ข้าวมัน", "ข้าวต้ม",
    "ชาเย็น", "โอเลี้ยง", "น้ำเขียว", "เฉาก๊วย", "โรตี",
    "ข้าวเหนียว", "หมูปิ้ง", "ขนมครก", "บิงซู", "ซูชิ",
    "ราเมง", "พิซซ่า", "เบอร์เกอร์", "สปาเกตตี", "ทาโกะยากิ",
    "ชาบู", "ซาชิมิ", "สเต๊ก", "แพนเค้ก", "วาฟเฟิล",
    "ซาลาเปา", "ข้าวแกง", "บะหมี่", "ก๋วยจั๊บ", "กุ้งอบวุ้นเส้น",
    "เนื้อย่าง", "หม้อไฟ", "สลัด", "โจ๊ก", "บัวลอย",
    "ลอดช่อง", "น้ำแข็งใส", "โกโก้", "มะม่วง", "ทุเรียน"
];
const lastNames = [
    "หมูกรอบ", "ไก่ย่าง", "มะนาว", "โค้ก", "น้ำปลา",
    "ไข่ดาว", "ปลาร้า", "หมึกย่าง", "นมสด", "ชานม",
    "ไข่มุก", "สายไหม", "ปูอัด", "ลูกชิ้น", "ข้าวโพด",
    "มันเผา", "กล้วยทอด", "วาฟเฟิล", "น้ำผึ้ง", "พริกเผา",
    "ชีส", "นุ่มฟู", "กรอบๆ", "หอมเจียว", "เค็มๆ",
    "หวานๆ", "เปรี้ยวจี๊ด", "เผ็ดร้อน", "เย็นชา", "ร้อนแรง",
    "สายฟ้า", "สายลม", "สายหมอก", "สายรุ้ง", "อัญมณี",
    "คริสตัล", "มรกต", "ไพลิน", "เพชร", "ทองคำ",
    "ฟองดู", "หิมะ", "มารุโกะ", "มังกร", "น่ารัก",
    "เทพเจ้า", "ซุปเปอร์", "โคตร", "ขั้นสุด", "สะท้านฟ้า"
];

// Store client/player data
let client_data = {
    "playerId": "",              // Will be set after joining/creating party
    "playerName": "",            // Default until set/edited
    "avatar": [1, 1, 1, 1],      // [color, face, hair, accessory]
    "currentParty": null,        // Current party code
    "loadedPlayers": [],         // Tracks players already rendered
};

// ============================
// IMAGE URL HELPERS
// ============================
function urlColor(i) { return `/static/Images/Avatar/Colors/${i}.svg`; }
function urlFace(i) { return `/static/Images/Avatar/Faces/${i}.svg`; }
function urlHair(i) { return `/static/Images/Avatar/Hairs/${i}.svg`; }
function urlAccessory(i) { return `/static/Images/Avatar/Accessories/${i}.svg`; }

const urlPlayer = `/static/Images/Avatar/Player.svg`;
const urlShirt = `/static/Images/Avatar/Shirt.svg`;

// Preload all avatar images for smooth rendering
const imageUrls = [];
for (let i = 1; i <= colors_amount; i++) imageUrls.push(urlColor(i));
for (let i = 1; i <= faces_amount; i++) imageUrls.push(urlFace(i));
for (let i = 1; i <= hairs_amount; i++) imageUrls.push(urlHair(i));
for (let i = 1; i <= accessories_amount; i++) imageUrls.push(urlAccessory(i));
imageUrls.push(urlPlayer, urlShirt);

// ============================
// HELPER FUNCTIONS
// ============================

// Generate random integer between min and max
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Set player name: use input value or generate random name
function setPlayerName() {
    var userName = $("#userName").val();
    if (userName.trim().length == 0) {
        const first = firstNames[Math.floor(Math.random() * firstNames.length)];
        const last = lastNames[Math.floor(Math.random() * lastNames.length)];
        userName = first + last
    }
    client_data.playerName = userName
}

// Load image smoothly (swap src only after fully loaded)
function setImageWhenLoaded(selector, url) {
    const img = new Image();
    img.onload = () => {
        $(selector).attr("src", url);
    };
    img.src = url;
}

// Save avatar data as JSON in localStorage
function saveAvatar() {
    localStorage.setItem("avatar", JSON.stringify(client_data.avatar));
}

// If avatar data exists in localStorage load them
function loadAvatar() {
    const saved = localStorage.getItem("avatar");
    if (saved) {
        client_data.avatar = JSON.parse(saved);

        // Apply Images
        setImageWhenLoaded("#player-color", urlColor(client_data.avatar[0]));
        setImageWhenLoaded("#customize-container #color .player", urlColor(client_data.avatar[0]));

        setImageWhenLoaded("#player-face", urlFace(client_data.avatar[1]));
        setImageWhenLoaded("#customize-container #face .face", urlFace(client_data.avatar[1]));

        setImageWhenLoaded("#player-hair", urlHair(client_data.avatar[2]));
        setImageWhenLoaded("#customize-container #hair .hair", urlHair(client_data.avatar[2]));

        setImageWhenLoaded("#player-accessory", urlAccessory(client_data.avatar[3]));
        setImageWhenLoaded("#customize-container #accessory .accessory", urlAccessory(client_data.avatar[3]));
    } else {
        randomizeAvatar();
    }
}

// Randomize avatar parts and update client_data
function randomizeAvatar() {
    const color = randomInt(1, colors_amount);
    const face = randomInt(1, faces_amount);
    const hair = randomInt(1, hairs_amount);
    const accessory = randomInt(1, accessories_amount);
    setImageWhenLoaded("#player-color", urlColor(color));
    setImageWhenLoaded("#customize-container #color .player", urlColor(color));
    client_data.avatar[0] = color
    setImageWhenLoaded("#player-face", urlFace(face));
    setImageWhenLoaded("#customize-container #face .face", urlFace(face));
    client_data.avatar[1] = face
    setImageWhenLoaded("#player-hair", urlHair(hair));
    setImageWhenLoaded("#customize-container #hair .hair", urlHair(hair));
    client_data.avatar[2] = hair
    setImageWhenLoaded("#player-accessory", urlAccessory(accessory));
    setImageWhenLoaded("#customize-container #accessory .accessory", urlAccessory(accessory));
    client_data.avatar[3] = accessory
    saveAvatar();
}

// Return next index in cycle (1 → max, goes back to 1)
function nextIndex(current, max) {
    return current >= max ? 1 : current + 1;
}

// ============================
// SOCKET EVENT HANDLERS
// ============================

// Handle incoming chat messages
socket.on("message", (data) => {
    const $msgBox = $('<div class="msg-box"></div>');

    // System/custom messages
    if (data.custom_class) {
        $msgBox.addClass("system")
        $msgBox.addClass(data.custom_class)
    }

    // Build avatar profile pic
    const $avatarContainer = $('<div class="avatar-container"></div>');
    $avatarContainer.append(
        $(`<img class="player" src="${urlColor(data.avatar[0])}">`),
        $(`<img class="shirt" src="${urlShirt}">`),
        $(`<img class="face" src="${urlFace(data.avatar[1])}">`),
        $(`<img class="hair" src="${urlHair(data.avatar[2])}">`),
        $(`<img class="accessory" src="${urlAccessory(data.avatar[3])}">`)
    );

    // Build text content
    const $container = $('<div></div>');
    const $senderName = $('<p class="sender-name"></p>').text(data.name);
    const $textContainer = $('<p class="text-container"></p>').text(data.message);
    $container.append($senderName, $textContainer);

    $msgBox.append($avatarContainer, $container);
    $(".chat-display .box").append($msgBox);

    // Animate and scroll down
    requestAnimationFrame(() => {
        $msgBox.addClass("show");
    });
    $(".chat-display .box").scrollTop($(".chat-display .box").prop("scrollHeight"));
});

// Handle party player list updates
socket.on("update_players", (data) => {
    $(".players-container .box").empty();

    $.each(data.players, function (uuid, plr) {
        const $plrBox = $('<div class="plr-box"></div>');

        // Play cool animation
        if (client_data.loadedPlayers[uuid]) {
            $plrBox.css({ transform: "scale(1)" });
        }

        // Add crown if host
        if (uuid == data.host) {
            const $hostCrown = $('<img class="crown" src="/static/Images/Icons/Host.svg"></img>');
            $plrBox.append($hostCrown);
        }

        // Host only buttons
        if (client_data.playerId == data.host) {
            $("#start-button, #settings-button").show();
        }

        // Avatar display
        const $avatarContainer = $('<div class="avatar-container"></div>').append(
            $(`<img class="player" src="${urlColor(plr.avatar[0])}">`),
            $(`<img class="shirt" src="${urlShirt}">`),
            $(`<img class="face" src="${urlFace(plr.avatar[1])}">`),
            $(`<img class="hair" src="${urlHair(plr.avatar[2])}">`),
            $(`<img class="accessory" src="${urlAccessory(plr.avatar[3])}">`)
        );

        // Player info
        const $info = $('<div class="plr-info"></div>');
        const $userName = $('<p class="username"></p>').text(plr.name);
        if (client_data.playerId == uuid) {
            $userName.append($('<span class="meTag">(คุณ)</span>'));
        }
        const $idText = $('<p class="uuid"></p>').text(`UUID : ${uuid}`);

        $info.append($userName, $idText);
        $plrBox.append($avatarContainer, $info);

        $(".players-container .box").append($plrBox);

        // Animate new players
        if (!client_data.loadedPlayers[uuid]) {
            client_data.loadedPlayers[uuid] = true;
            requestAnimationFrame(() => $plrBox.addClass("show"));
        }
    });
});

// Run when DOM is ready
$(document).ready(function () {
    loadAvatar();
    $("#start-button, #settings-button, #settings-exit").hide()
});

// ============================
// BUTTONS & UI ACTIONS
// ============================

// Toggle avatar customization menu
$("#customize-avatar").on("click", () => {
    $("#customize-avatar").toggleClass("active");
});

// Handle avatar part change buttons (color/face/hair/accessory)
$("#customize-container .item-display").each(function () {
    const $display = $(this);
    const id = $display.attr("id");
    const $container = $display.find(".item-container");

    // Cycle avatar part
    function cycleAvatar() {
        switch (id) {
            case "color":
                client_data.avatar[0] = nextIndex(client_data.avatar[0], colors_amount);
                setImageWhenLoaded("#player-color", urlColor(client_data.avatar[0]));
                setImageWhenLoaded("#customize-container #color .player", urlColor(client_data.avatar[0]));
                break;

            case "face":
                client_data.avatar[1] = nextIndex(client_data.avatar[1], faces_amount);
                setImageWhenLoaded("#player-face", urlFace(client_data.avatar[1]));
                setImageWhenLoaded("#customize-container #face .face", urlFace(client_data.avatar[1]));
                break;

            case "hair":
                client_data.avatar[2] = nextIndex(client_data.avatar[2], hairs_amount);
                setImageWhenLoaded("#player-hair", urlHair(client_data.avatar[2]));
                setImageWhenLoaded("#customize-container #hair .hair", urlHair(client_data.avatar[2]));
                break;

            case "accessory":
                client_data.avatar[3] = nextIndex(client_data.avatar[3], accessories_amount);
                setImageWhenLoaded("#player-accessory", urlAccessory(client_data.avatar[3]));
                setImageWhenLoaded("#customize-container #accessory .accessory", urlAccessory(client_data.avatar[3]));
                break;
        }
        saveAvatar();
    }
    $container.on("click", cycleAvatar);
});

// Random avatar button
$("#random-avatar").on("click", randomizeAvatar);

// ============================
// PARTY ACTIONS (Create/Join/Leave)
// ============================

// Create new party
$("#create-button").on("click", () => {
    $(".main-page").addClass("disabled");
    $(".loader").addClass("active");
    $("#customize-avatar").removeClass("active");
    $(".chat-display .box").empty();
    setPlayerName();

    setTimeout(async () => {
        try {
            const res = await axios.post("/create_party", {
                name: client_data.playerName,
                avatar: client_data.avatar
            });
            const { party_code, player_id } = res.data;

            client_data.playerId = player_id;
            client_data.currentParty = party_code;
            client_data.loadedPlayers = [];

            $(".party-page").removeClass("disabled");
            $("#party-code").text("รหัสเชิญ : " + party_code);
            $(".players-container .box").empty();

            // Join socket room as host
            socket.emit("join_party_room", {
                party_code: party_code,
                player_id: player_id,
                host_name: client_data.playerName,
            });

        } catch (err) {
            console.error("Error creating party:", err);
            alert("There was an error creating the party. Please try again.");
            $(".main-page").removeClass("disabled");
        } finally {
            $(".loader").removeClass("active");
        }
    }, 250);
});

// Join existing party
$("#join-button").on("click", () => {
    const partyCode = $("#inviteCode").val().toUpperCase();
    const codeRegex = /^[A-Z0-9]{5}$/;
    if (!codeRegex.test(partyCode)) {
        alert("Please enter a valid 5-character party code (A–Z, 0–9).");
        return;
    }

    $(".chat-display .box").empty();
    $(".main-page").addClass("disabled");
    $(".loader").addClass("active");
    $("#customize-avatar").removeClass("active");
    setPlayerName();

    setTimeout(async () => {
        try {
            const res = await axios.post("/join_party", {
                code: partyCode,
                name: client_data.playerName,
                avatar: client_data.avatar
            });
            const { player_id } = res.data;

            client_data.playerId = player_id;
            client_data.currentParty = partyCode;

            $(".party-page").removeClass("disabled");
            $("#party-code").text("รหัสเชิญ : " + partyCode);

            // Join socket room as player
            socket.emit("join_party_room", {
                party_code: partyCode,
                player_id: client_data.playerId,
                player_name: client_data.playerName,
            });

        } catch (err) {
            console.error("Error joining party:", err);
            alert("There was an error joining the party. Please try again.");
            $(".main-page").removeClass("disabled");
        } finally {
            $(".loader").removeClass("active");
        }
    }, 250);
});

// Copy party code to clipboard
$("#party-code").on("click", async () => {
    const original = $("#party-code").text();
    const code = original.split(":")[1]?.trim();

    if (!code || code === "-----" || $(".code-copied").hasClass("show")) {
        return;
    }
    await navigator.clipboard.writeText(code).catch(() => { });
    $(".code-copied").addClass("show");
    setTimeout(() => $(".code-copied").removeClass("show"), 1000);
});

// Open settings menu
$("#settings-button").on("click", () => {
    $(".transition-div").addClass("fill")
    $("#start-button, #settings-button, #leave-button").addClass("hidden")
    setTimeout(() => {
        $("#start-button, #settings-button, #leave-button").hide()
        $(".players-container, .chat-container").hide();
        $(".settings-container, #settings-exit").show();
        $("#settings-exit").removeClass("hidden");
        $(".transition-div").removeClass("fill")
    }, 300);
});

// Close settings menu
$("#settings-exit").on("click", () => {
    $(".transition-div").addClass("fill")
    $("#settings-exit").addClass("hidden")
    setTimeout(() => {
        $(".settings-container, #settings-exit").hide()
        $(".players-container, .chat-container").show();
        $("#start-button, #settings-button, #leave-button").show();
        $("#start-button, #settings-button, #leave-button").removeClass("hidden");
        $(".transition-div").removeClass("fill")
    }, 300);
});

// Leave current party
$("#leave-button").on("click", () => {
    const confirmLeave = confirm("Are you sure you want to leave the party?");
    const partyCode = $("#party-code").text().replace("รหัสเชิญ : ", "").trim().toUpperCase();
    if (!confirmLeave) return;

    $(".loader").addClass("active");
    $("#customize-avatar").removeClass("active");
    $(".party-page").addClass("disabled");

    setTimeout(async () => {
        try {
            const res = await axios.post("/leave_party", {
                code: partyCode,
                player_id: client_data.playerId
            });
            if (!res.data.success) throw new Error("Failed to leave");

            $(".main-page").removeClass("disabled");
            $("#party-code").text("รหัสเชิญ : ----");
            $(".players-container .box").empty();
            client_data.loadedPlayers = [];

            // Notify server
            socket.emit("leave_party_room", {
                party_code: client_data.currentParty,
                player_name: client_data.playerName,
            });

        } catch (err) {
            console.error("Error leaving party:", err);
            alert("There was an error leaving the party. Please try again.");

            // Restore UI since leave failed
            $(".main-page").addClass("disabled");
            $(".party-page").removeClass("disabled");
            $("#party-code").text("รหัสเชิญ : " + partyCode);
        } finally {
            $(".loader").removeClass("active");
        }
    }, 250);
});

// ============================
// CHAT BOX
// ============================

// Send message when Enter is pressed
$("#chatMsg").on("keydown", function (e) {
    if (e.key === 'Enter') {
        var message = $("#chatMsg").val();
        if (message.trim() == 0) return;

        socket.emit("message", {
            custom_class: null,
            party_code: client_data.currentParty,
            name: client_data.playerName,
            avatar: client_data.avatar,
            message: message,
        });
        $("#chatMsg").val('');
    }
});