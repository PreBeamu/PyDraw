// ============================
// GLOBAL SETUP
// ============================
const socket = io();
// Avatar Items count
const colors_amount = 7;
const hairs_amount = 11;
const accessories_amount = 8;
const faces_amount = 10;
// Random Words
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
// Client Data
let client_data = {
    "playerId": "xxxx",
    "playerName": "Player",
    "avatar": [1, 1, 1, 1],
    "currentParty": null
};

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

function setPlayerName() {
    var userName = $("#userName").val();
    if (userName.trim() == 0) {
        const first = firstNames[Math.floor(Math.random() * firstNames.length)];
        const last = lastNames[Math.floor(Math.random() * lastNames.length)];
        userName = first + last
    }
    client_data.playerName = userName
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
    client_data.avatar[0] = color
    setImageWhenLoaded("#player-face", urlFace(face));
    client_data.avatar[1] = face
    setImageWhenLoaded("#player-hair", urlHair(hair));
    client_data.avatar[2] = hair
    setImageWhenLoaded("#player-accessory", urlAccessory(accessory));
    client_data.avatar[3] = accessory
}

// ============================
// WEBSOCKETS
// ============================
socket.on("message", (data) => {
    // Create msg-box
    const $msgBox = $('<div class="msg-box"></div>');
    if (data.custom_class) {
        $msgBox.addClass("system")
        $msgBox.addClass(data.custom_class)
    }
    // Avatar container
    const $avatarContainer = $('<div class="avatar-container"></div>');
    // Avatar images (replace with dynamic data later)
    const $player = $(`<img class="player" src="/static/Images/Avatar/Colors/${data.avatar[0]}.svg">`);
    const $shirt = $(`<img class="shirt" src="/static/Images/Avatar/Shirt.svg">`);
    const $face = $(`<img class="face" src="/static/Images/Avatar/Faces/${data.avatar[1]}.svg">`);
    const $hair = $(`<img class="hair" src="/static/Images/Avatar/Hairs/${data.avatar[2]}.svg">`);
    const $accessory = $(`<img class="accessory" id="player-accessory" src="/static/Images/Avatar/Accessories/${data.avatar[3]}.svg">`);
    $avatarContainer.append($player, $shirt, $face, $hair, $accessory);
    // Text container
    const $container = $('<div></div>');
    const $senderName = $('<p class="sender-name"></p>').text(data.name);
    const $textContainer = $('<p class="text-container"></p>').text(data.message);
    $msgBox.append($avatarContainer, $container);
    $container.append($senderName, $textContainer);
    $(".chat-display .box").append($msgBox);
    requestAnimationFrame(() => {
        $msgBox.addClass("show");
    });
    // Scroll to bottom
    $(".chat-display .box").scrollTop($(".chat-display .box").prop("scrollHeight"));
});

// ============================
// MAIN
// ============================

// Main Buttons
$("#random-avatar").on("click", () => {
    randomizeAvatar();
});

$("#create-button").on("click", async () => {
    $(".main-page").addClass("disabled");
    $(".loader").addClass("active");
    $(".chat-display .box").empty();
    try {
        const res = await axios.post("/create_party", {
            name: client_data.playerName,
            avatar: client_data.avatar
        });
        const { party_code, player_id } = res.data;
        setPlayerName();
        client_data.playerId = player_id;
        client_data.currentParty = party_code;
        $(".party-page").removeClass("disabled");
        $("#party-code").text("รหัสเชิญ : " + party_code)
        // Socket Create
        socket.emit("join_party_room", {
            party_code: party_code,
            player_id: player_id,
        });
        socket.emit("message", {
            custom_class: "create",
            party_code: client_data.currentParty,
            name: client_data.playerName,
            avatar: client_data.avatar,
            msg: `${client_data.playerName} สร้างปาร์ตี้!`,
        });
    } catch (err) {
        console.error("Error creating party:", err);
        alert("There was an error creating the party. Please try again.");
        $(".main-page").removeClass("disabled");
    } finally {
        $(".loader").removeClass("active");
    }
});

$("#join-button").on("click", async () => {
    const partyCode = $("#inviteCode").val().toUpperCase()
    const codeRegex = /^[A-Z0-9]{5}$/;
    if (!codeRegex.test(partyCode)) {
        alert("Please enter a valid 5-character party code (A–Z, 0–9).");
        return;
    }
    $(".chat-display .box").empty();
    $(".main-page").addClass("disabled");
    $(".loader").addClass("active");
    try {
        const res = await axios.post("/join_party", {
            code: partyCode,
            name: client_data.playerName,
            avatar: client_data.avatar
        });
        const { player_id, party_host, players } = res.data;
        setPlayerName();
        client_data.playerId = player_id;
        client_data.currentParty = partyCode;
        $(".party-page").removeClass("disabled");
        $("#party-code").text("รหัสเชิญ : " + partyCode)
        // Socket JoinRoom
        socket.emit("join_party_room", {
            party_code: partyCode,
            player_id: client_data.playerId,
        });
        socket.emit("message", {
            custom_class: "join",
            party_code: client_data.currentParty,
            name: client_data.playerName,
            avatar: client_data.avatar,
            msg: `${client_data.playerName} เข้าร่วมปาร์ตี้!`,
        });
    } catch (err) {
        console.error("Error creating party:", err);
        alert("There was an error joining the party. Please try again.");
        $(".main-page").removeClass("disabled");
    } finally {
        $(".loader").removeClass("active");
    }
});

// Party Buttons
$("#party-code").on("click", async () => {
    const original = $("#party-code").text();
    const code = original.split(":")[1]?.trim();

    if (!code || code === "-----" || $(".code-copied").hasClass("show")) {
        return;
    }
    await navigator.clipboard.writeText(code).catch(() => { });
    $(".code-copied").addClass("show");
    setTimeout(() => {
        $(".code-copied").removeClass("show");
    }, 1000);
});

$("#leave-button").on("click", async () => {
    const confirmLeave = confirm("Are you sure you want to leave the party?");
    const partyCode = $("#party-code").text().replace("รหัสเชิญ : ", "").trim().toUpperCase();
    if (!confirmLeave) {
        return;
    }
    $(".loader").addClass("active");
    $(".party-page").addClass("disabled");
    try {
        const res = await axios.post("/leave_party", {
            code: partyCode,
            player_id: client_data.playerId
        });
        if (!res.data.success) throw new Error("Failed to leave");
        $(".main-page").removeClass("disabled");
        $("#party-code").text("รหัสเชิญ : ----");
        // Socket LeaveRoom
        socket.emit("leave_party_room", {
            party_code: client_data.partyCode,
            player_id: client_data.playerId,
        });
        socket.emit("message", {
            custom_class: "left",
            party_code: client_data.currentParty,
            name: client_data.playerName,
            avatar: client_data.avatar,
            msg: `${client_data.playerName} ออกจากปาร์ตี้!`,
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
});

// Chat Textbox function
$("#chatMsg").on("keydown", function (e) {
    if (e.key === 'Enter') {
        var message = $("#chatMsg").val();
        if (message.trim() == 0) {
            return
        }
        socket.emit("message", {
            custom_class: null,
            party_code: client_data.currentParty,
            name: client_data.playerName,
            avatar: client_data.avatar,
            msg: message,
        });
        $("#chatMsg").val('');
    }
});

// Refresh Confirm
window.addEventListener("beforeunload", e => {
    if (!$("#party-page").hasClass("disabled")) {
        const msg = "Changes you made may not be saved.";
        e.preventDefault();
        return msg;
    }
});
