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
// HELPERS
// ============================

// Avatar URL helpers
function urlColor(i) { return `/static/Images/Avatar/Colors/${i}.svg`; }
function urlFace(i) { return `/static/Images/Avatar/Faces/${i}.svg`; }
function urlHair(i) { return `/static/Images/Avatar/Hairs/${i}.svg`; }
function urlAccessory(i) { return `/static/Images/Avatar/Accessories/${i}.svg`; }

const urlPlayer = `/static/Images/Avatar/Player.svg`;
const urlShirt = `/static/Images/Avatar/Shirt.svg`;

// Preload avatar images
const imageUrls = [];
for (let i = 1; i <= colors_amount; i++) imageUrls.push(urlColor(i));
for (let i = 1; i <= faces_amount; i++) imageUrls.push(urlFace(i));
for (let i = 1; i <= hairs_amount; i++) imageUrls.push(urlHair(i));
for (let i = 1; i <= accessories_amount; i++) imageUrls.push(urlAccessory(i));
imageUrls.push(urlPlayer, urlShirt);

// Utilities
function randomInt(min, max) {
    // Generate random integer between min and max
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function nextIndex(current, max) {
    // Return next index in cycle (1 → max, goes back to 1)
    return current >= max ? 1 : current + 1;
}
function parseGuess(text) {
    // If "ปิด" return as 0
    if (text === "ปิด") return 0;
    return parseInt(text, 10) || 0;
}
function formatGuess(value) {
    // If 0 return as "ปิด"
    return value === 0 ? "ปิด" : value;
}
function resetSettings() {
    // Reset settings to default value
    $(".setting-value").each(function () {
        const $num = $(this);
        const defaultValue = parseInt($num.data("default"), 10);

        $num.text(formatGuess(defaultValue));
        updateButtons($num);
    });
}
function updateButtons($num) {
    // Enable/disable increase/decrease buttons
    const value = parseGuess($num.text());
    const min = parseInt($num.data("min"), 10);
    const max = parseInt($num.data("max"), 10);

    $num.siblings(".decrease").toggleClass("disabled", value <= min);
    $num.siblings(".increase").toggleClass("disabled", value >= max);
}

// Avatar helpers
function setPlayerName() {
    // Set player name: use input value or generate random name
    var userName = $("#userName").val().trim().replace(/\s+/g, "");
    if (userName.length == 0) {
        const first = firstNames[Math.floor(Math.random() * firstNames.length)];
        const last = lastNames[Math.floor(Math.random() * lastNames.length)];
        userName = first + last
    }
    client_data.playerName = userName
}
function setImageWhenLoaded(selector, url) {
    // Load image smoothly (swap src only after fully loaded)
    const img = new Image();
    img.onload = () => {
        $(selector).attr("src", url);
    };
    img.src = url;
}
function saveAvatar() {
    // Save avatar data as JSON in localStorage
    localStorage.setItem("avatar", JSON.stringify(client_data.avatar));
}
function loadAvatar() {
    // If avatar data exists in localStorage load them
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
function randomizeAvatar() {
    // Randomize avatar parts and update client_data
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

// Countdown
function startCountdown(val) {
    // Start a countdown
    let count = val;
    const $countdown = $(".countdown");
    $countdown.addClass("active").text(count);
    triggerSpin($countdown);

    const timer = setInterval(() => {
        count--;
        if (count > 0) {
            $countdown.text(count);
            triggerSpin($countdown);
        } else {
            clearInterval(timer);
            $countdown.text("!");
            triggerSpin($countdown);
        }
    }, 1000);
}
function triggerSpin($el) {
    $el.removeClass("spin");
    void $el[0].offsetWidth;
    $el.addClass("spin");
}

// ============================
// SOCKET EVENT HANDLERS
// ============================

socket.on("message", (data) => { // Handle incoming chat messages
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
socket.on("update_players", (data) => { // Handle party player list updates
    if (data.type == "Party") {
        $("#party-players-container .box").empty();
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

            $("#party-players-container .box").append($plrBox);

            // Animate new players
            if (!client_data.loadedPlayers[uuid]) {
                client_data.loadedPlayers[uuid] = true;
                requestAnimationFrame(() => $plrBox.addClass("show"));
            }
        });
    } else if (data.type == "InGame") {
        $("#game-players-container .box").empty();
        $.each(data.players, function (uuid, plr) {
            const $plrBox = $('<div class="plr-box"></div>');

            // Play cool animation
            if (client_data.loadedPlayers[uuid] && data.reset) {
                $plrBox.css({ transform: "scale(1)" });
            }

            // Add pencil if drawer
            if (uuid == data.drawer) {
                const $drawerPencil = $('<img class="drawer" src="/static/Images/Icons/Pencil.svg"></img>');
                $plrBox.append($drawerPencil);
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
            const $userName = $('<p class="username"></p>');
            const $name = $('<span class="name"></span>').text(plr.name);
            $userName.append($name);
            if (client_data.playerId == uuid) {
                $userName.append($('<span class="meTag">(คุณ)</span>'));
            }
            const $scoreText = $('<p class="score"></p>').text(`${plr.score} คะแนน`);

            $info.append($userName, $scoreText);
            $plrBox.append($avatarContainer, $info);

            $("#game-players-container .box").append($plrBox);

            // Animate new players
            if (!client_data.loadedPlayers[uuid]) {
                client_data.loadedPlayers[uuid] = true;
                requestAnimationFrame(() => $plrBox.addClass("show"));
            }
        });
    }
});
socket.on("start_game", () => { // Start the game
    $(".party-page").addClass("disabled");
    startCountdown(3);
    setTimeout(async () => {
        $(".countdown").removeClass("active");
        $(".game-page").removeClass("disabled");
    }, 3000);
});
socket.on("update_timer", (data) => { // Listen for server countdown updates
    const timeParts = data.time.split(":");
    const minutes = parseInt(timeParts[0], 10);
    const seconds = parseInt(timeParts[1], 10);
    const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    $("#game-timer").text(formatted);
});
socket.on("topics_pick", (data) => { // Start the game
    if (data.drawer == client_data.playerId) {
        $(".topics-picker").addClass("show");
        $("#pickTopic1").text(data.topic1);
        $("#pickTopic2").text(data.topic2);
        $("#pickTopic3").text(data.topic3);
    }
});

// ============================
// UI INIT
// ============================

$(document).ready(function () {
    loadAvatar();
    $("#start-button, #settings-button, #settings-exit, .settings-container").hide()
});

// ============================
// UI ACTIONS
// ============================

// Avatar customization
$("#customize-avatar").on("click", () => { // Toggle avatar customization menu
    $("#customize-avatar").toggleClass("active");
});
$("#customize-container .item-display").each(function () { // Handle avatar part change buttons
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
$("#random-avatar").on("click", randomizeAvatar); // Random avatar button

// Party actions
$("#create-button").on("click", () => { // Create new party
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
            $("#party-players-container .box").empty();

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
$("#join-button").on("click", () => { // Join existing party
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
                party_code: partyCode,
                name: client_data.playerName,
                avatar: client_data.avatar
            });
            const { player_id, party_state } = res.data;

            client_data.playerId = player_id;
            client_data.currentParty = partyCode;

            $("#party-code").text("รหัสเชิญ : " + partyCode);
            if (party_state != "InGame") {
                $(".party-page").removeClass("disabled");
            } else {
                $(".game-page").removeClass("disabled");
            }

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
$("#party-code").on("click", async () => { // Copy party code to clipboard
    const original = $("#party-code").text();
    const party_code = original.split(":")[1]?.trim();

    if (!party_code || party_code === "-----" || $(".code-copied").hasClass("show")) {
        return;
    }
    await navigator.clipboard.writeText(party_code).catch(() => { });
    $(".code-copied").addClass("show");
    setTimeout(() => $(".code-copied").removeClass("show"), 1000);
});
$("#leave-button").on("click", () => { // Leave current party
    const confirmLeave = confirm("Are you sure you want to leave the party?");
    const partyCode = $("#party-code").text().replace("รหัสเชิญ : ", "").trim().toUpperCase();
    if (!confirmLeave) return;

    $(".loader").addClass("active");
    $("#customize-avatar").removeClass("active");
    $(".party-page").addClass("disabled");
    resetSettings();

    setTimeout(async () => {
        try {
            const res = await axios.post("/leave_party", {
                party_code: partyCode,
                player_id: client_data.playerId
            });
            if (!res.data.success) throw new Error("Failed to leave");

            $(".main-page").removeClass("disabled");
            $("#party-code").text("รหัสเชิญ : ----");
            $("#party-players-container .box").empty();
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
$("#start-button").on("click", async () => { /// Start the game and apply settings to backend
    try {
        const res = await axios.post("/start_game", {
            party_code: client_data.currentParty,
            player_id: client_data.playerId,
            roundsCount: parseInt($("#roundsCount").text(), 10),
            guessLimit: parseInt(parseGuess($("#guessLimit").text()), 10),
            drawTime: parseInt($("#drawTime").text(), 10),
            onlyCustom: !$("#ctopic-override").hasClass("disabled"),
            customTopics: $("#customTopics").val()
        });
        if (!res.data.success) throw new Error("Failed to start");

    } catch (err) {
        console.error("Error starting game:", err);
        alert("There was an error starting the game. Please try again.");
    }
});

// Chat System
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

// Settings
$("#settings-button").on("click", () => { // Open settings menu
    $(".transition-div").addClass("fill")
    $("#start-button, #settings-button, #leave-button").addClass("hidden")
    setTimeout(() => {
        $("#start-button, #settings-button, #leave-button").hide()
        $("#party-players-container, #party-chat-container").hide();
        $(".settings-container, #settings-exit").show();
        $("#settings-exit").removeClass("hidden");
        $(".transition-div").removeClass("fill")
    }, 300);
});
$("#settings-exit").on("click", () => { // Close settings menu
    $(".transition-div").addClass("fill")
    $("#settings-exit").addClass("hidden")
    setTimeout(() => {
        $(".settings-container, #settings-exit").hide()
        $("#party-players-container, #party-chat-container").show();
        $("#start-button, #settings-button, #leave-button").show();
        $("#start-button, #settings-button, #leave-button").removeClass("hidden");
        $(".transition-div").removeClass("fill")
    }, 300);
});
$(".settings-container").on("click", ".increase", function () { // Increase
    const $num = $(this).siblings(".setting-value");
    let value = parseGuess($num.text());
    const max = parseInt($num.data("max"), 10);

    if (value < max) {
        $num.text(formatGuess(value + 1))
    }
    updateButtons($num);
});
$(".settings-container").on("click", ".decrease", function () { // Decrease
    const $num = $(this).siblings(".setting-value");
    let value = parseGuess($num.text());
    const min = parseInt($num.data("min"), 10);

    if (value > min) $num.text(formatGuess(value - 1));
    updateButtons($num);
});
$("#ctopic-override").on("click", () => { // Toggle custom topic style
    $("#ctopic-override").removeClass("disabled");
    $("#ctopic-add").addClass("disabled");
});
$("#ctopic-add").on("click", () => { // Toggle custom topic style
    $("#ctopic-add").removeClass("disabled");
    $("#ctopic-override").addClass("disabled");
});
$(".setting-value").each(function () { // Init
    updateButtons($(this));
});

// Topics picker
function sendPickedTopic(topic) {
    socket.emit("message", {
        picked_topic: null,
    });
}

$("#pickTopic1").on("click", () => {

});
$("#pickTopic2").on("click", () => {

});
$("#pickTopic3").on("click", () => {

});