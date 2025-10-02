// ============================
// GLOBAL SETUP
// ============================

// Initialize socket.io
const SOCKET = io()

// Avatar Items count
const COLORS_AMOUNT = 7
const HAIRS_AMOUNT = 11
const ACCESSORIES_AMOUNT = 8
const FACES_AMOUNT = 10

// Random names (first + last = player nickname)
const FIRSTNAMES = [
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
]
const LASTNAMES = [
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
]

// Store client/player data
let CLIENT_DATA = {
    "playerId": "", // Will be set after joining/creating party
    "playerName": "", // Default until set/edited
    "avatar": [1, 1, 1, 1], // [color, face, hair, acc]
    "currentParty": null, // Current party code
    "loadedPlayers": [], // Tracks players already rendered
    "guessesLeft": 0, // Player guesses left
}

// ============================
// HELPERS
// ============================

// Avatar URL helpers
function urlColor(i) {
    return `/static/Images/Avatar/Colors/${i}.svg`
}

function urlFace(i) {
    return `/static/Images/Avatar/Faces/${i}.svg`
}

function urlHair(i) {
    return `/static/Images/Avatar/Hairs/${i}.svg`
}

function urlAccessory(i) {
    return `/static/Images/Avatar/Accessories/${i}.svg`
}

const urlPlayer = `/static/Images/Avatar/Player.svg`
const urlShirt = `/static/Images/Avatar/Shirt.svg`

// Preload avatar images
const imageUrls = []
for (let i = 1; i <= COLORS_AMOUNT; i++) imageUrls.push(urlColor(i))
for (let i = 1; i <= FACES_AMOUNT; i++) imageUrls.push(urlFace(i))
for (let i = 1; i <= HAIRS_AMOUNT; i++) imageUrls.push(urlHair(i))
for (let i = 1; i <= ACCESSORIES_AMOUNT; i++) imageUrls.push(urlAccessory(i))
imageUrls.push(urlPlayer, urlShirt)

// Utilities
function randomInt(min, max) {
    // Generate random integer between min and max
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function nextIndex(current, max) {
    // Return next index in cycle (1 → max, goes back to 1)
    return current >= max ? 1 : current + 1
}

function parseGuess(text) {
    // If "ปิด" return as 0
    if (text === "ปิด") return 0
    return parseInt(text, 10) || 0
}

function formatGuess(value) {
    // If 0 return as "ปิด"
    return value === 0 ? "ปิด" : value
}

function resetOptions() {
    // Reset options to default value
    $(".option-value").each(function () {
        const $num = $(this)
        const defaultValue = parseInt($num.data("default"), 10)

        $num.text(formatGuess(defaultValue))
        updateButtons($num)
    })
}

function updateButtons($num) {
    // Enable/disable increase/decrease buttons
    const value = parseGuess($num.text())
    const min = parseInt($num.data("min"), 10)
    const max = parseInt($num.data("max"), 10)

    $num.siblings(".decrease").toggleClass("disabled", value <= min)
    $num.siblings(".increase").toggleClass("disabled", value >= max)
}

// Avatar helpers
function setPlayerName() {
    // Set player name: use input value or generate random name
    let userName = $("#userName").val().trim().replace(/\s+/g, "")
    if (userName.length == 0) {
        const first = FIRSTNAMES[Math.floor(Math.random() * FIRSTNAMES.length)]
        const last = LASTNAMES[Math.floor(Math.random() * LASTNAMES.length)]
        userName = first + last
    }
    CLIENT_DATA.playerName = userName
}

function setImageWhenLoaded(selector, url) {
    // Load image smoothly (swap src only after fully loaded)
    const img = new Image()
    img.onload = () => {
        $(selector).attr("src", url)
    }
    img.src = url
}

function saveAvatar() {
    // Save avatar data as JSON in localStorage
    localStorage.setItem("avatar", JSON.stringify(CLIENT_DATA.avatar))
}

function loadAvatar() {
    // If avatar data exists in localStorage load them
    const saved = localStorage.getItem("avatar")
    if (saved) {
        CLIENT_DATA.avatar = JSON.parse(saved)

        // Apply Images
        setImageWhenLoaded("#plr-color", urlColor(CLIENT_DATA.avatar[0]))
        setImageWhenLoaded("#closet #color .player", urlColor(CLIENT_DATA.avatar[0]))

        setImageWhenLoaded("#plr-face", urlFace(CLIENT_DATA.avatar[1]))
        setImageWhenLoaded("#closet #face .face", urlFace(CLIENT_DATA.avatar[1]))

        setImageWhenLoaded("#plr-hair", urlHair(CLIENT_DATA.avatar[2]))
        setImageWhenLoaded("#closet #hair .hair", urlHair(CLIENT_DATA.avatar[2]))

        setImageWhenLoaded("#plr-acc", urlAccessory(CLIENT_DATA.avatar[3]))
        setImageWhenLoaded("#closet #acc .acc", urlAccessory(CLIENT_DATA.avatar[3]))
    } else {
        randomizeAvatar()
    }
}

function randomizeAvatar() {
    // Randomize avatar parts and update CLIENT_DATA
    const color = randomInt(1, COLORS_AMOUNT)
    const face = randomInt(1, FACES_AMOUNT)
    const hair = randomInt(1, HAIRS_AMOUNT)
    const acc = randomInt(1, ACCESSORIES_AMOUNT)
    setImageWhenLoaded("#plr-color", urlColor(color))
    setImageWhenLoaded("#closet #color .player", urlColor(color))
    CLIENT_DATA.avatar[0] = color
    setImageWhenLoaded("#plr-face", urlFace(face))
    setImageWhenLoaded("#closet #face .face", urlFace(face))
    CLIENT_DATA.avatar[1] = face
    setImageWhenLoaded("#plr-hair", urlHair(hair))
    setImageWhenLoaded("#closet #hair .hair", urlHair(hair))
    CLIENT_DATA.avatar[2] = hair
    setImageWhenLoaded("#plr-acc", urlAccessory(acc))
    setImageWhenLoaded("#closet #acc .acc", urlAccessory(acc))
    CLIENT_DATA.avatar[3] = acc
    saveAvatar()
}

function buildAvatarDOM(avatar) {
    return $('<div class="av-display"></div>').append(
        $(`<img class="player" src="${urlColor(avatar[0])}">`),
        $(`<img class="shirt" src="${urlShirt}">`),
        $(`<img class="face" src="${urlFace(avatar[1])}">`),
        $(`<img class="hair" src="${urlHair(avatar[2])}">`),
        $(`<img class="acc" src="${urlAccessory(avatar[3])}">`)
    )
}

// Countdown
function startCountdown(val) {
    // Start a countdown
    let count = val
    const $countdown = $("#countdown")
    $countdown.addClass("active").text(count)
    triggerAnim($countdown, "spin")

    const timer = setInterval(() => {
        count--
        if (count > 0) {
            $countdown.text(count)
            triggerAnim($countdown, "spin")
        } else {
            clearInterval(timer)
            $countdown.text("!")
            triggerAnim($countdown, "spin")
        }
    }, 1000)
}

function triggerAnim($el, $class) {
    $el.removeClass($class)
    void $el[0].offsetWidth
    $el.addClass($class)
}

// Status
function setStatus($icon, status) {
    const $status = $(".canvasC .status");
    const $icons = $(".status img");
    const $statusText = $(".canvasC .status h2");

    $(".status h1").text("")
    if ($status.hasClass("show") && status) {
        $status.removeClass("show");
        $icons.removeClass("show");
        setTimeout(() => {
            $("#hint").text(". . .");
            $status.addClass("show");
            $icon.addClass("show");
            $statusText.text(status);
        }, 200);
    } else {
        $status.removeClass("show");
        $icons.removeClass("show");
        $statusText.empty();
        if (status) {
            $("#hint").text(". . .");
            $status.addClass("show");
            $icon.addClass("show");
            $statusText.text(status);
        }
    }
}

// ============================
// UI INIT
// ============================
$(document).ready(function () {
    loadAvatar()
    $("#startGame-btn, #optionsO-btn, #optionsX-btn, .optionsC").hide()
})

// ============================
// AVATAR CUSTOMIZATION
// ============================
$("#customizer").on("click", () => {
    // Toggle avatar customization menu visibility
    $("#customizer").toggleClass("active")
})

$("#closet .islot").each((_, el) => {
    const $display = $(el)
    const id = $display.attr("id")
    const $container = $display.find(".idisplay")

    const cycleAvatar = () => {
        // Cycle avatar parts based on the button clicked
        switch (id) {
            case "color":
                CLIENT_DATA.avatar[0] = nextIndex(CLIENT_DATA.avatar[0], COLORS_AMOUNT)
                setImageWhenLoaded("#plr-color", urlColor(CLIENT_DATA.avatar[0]))
                setImageWhenLoaded("#closet #color .player", urlColor(CLIENT_DATA.avatar[0]))
                break

            case "face":
                CLIENT_DATA.avatar[1] = nextIndex(CLIENT_DATA.avatar[1], FACES_AMOUNT)
                setImageWhenLoaded("#plr-face", urlFace(CLIENT_DATA.avatar[1]))
                setImageWhenLoaded("#closet #face .face", urlFace(CLIENT_DATA.avatar[1]))
                break

            case "hair":
                CLIENT_DATA.avatar[2] = nextIndex(CLIENT_DATA.avatar[2], HAIRS_AMOUNT)
                setImageWhenLoaded("#plr-hair", urlHair(CLIENT_DATA.avatar[2]))
                setImageWhenLoaded("#closet #hair .hair", urlHair(CLIENT_DATA.avatar[2]))
                break

            case "acc":
                CLIENT_DATA.avatar[3] = nextIndex(CLIENT_DATA.avatar[3], ACCESSORIES_AMOUNT)
                setImageWhenLoaded("#plr-acc", urlAccessory(CLIENT_DATA.avatar[3]))
                setImageWhenLoaded("#closet #acc .acc", urlAccessory(CLIENT_DATA.avatar[3]))
                break
        }
        // Save the updated avatar configuration
        saveAvatar()
    }

    // Attach click handler to cycle avatar part
    $container.on("click", cycleAvatar)
})

$("#randomizer").on("click", () => {
    // Assign random values to all avatar parts
    randomizeAvatar()
})

// ============================
// PARTY BUTTONS
// ============================
$("#createParty-btn").on("click", () => {
    // Initiate party creation process
    $("#main-page").addClass("disabled")
    $("#loader").addClass("active")
    $("#customizer").removeClass("active")
    $(".holder .box").empty()
    setPlayerName()

    setTimeout(async () => {
        try {
            // Request server to create a new party
            const res = await axios.post("/create_party", {
                name: CLIENT_DATA.playerName,
                avatar: CLIENT_DATA.avatar
            })

            const { party_code, player_id } = res.data
            CLIENT_DATA.playerId = player_id
            CLIENT_DATA.currentParty = party_code
            CLIENT_DATA.loadedPlayers = []

            // Show party page
            $("#party-page").removeClass("disabled")
            $("#codeLabel").text("รหัสเชิญ : " + party_code)
            $("#plr-list.party .box").empty()

            // Join socket room as host
            SOCKET.emit("join_party_room", {
                party_code: party_code,
                player_id: player_id,
                create: true,
            })

        } catch (err) {
            console.error("Error creating party:", err)
            alert("There was an error creating the party. Please try again.")
            $("#main-page").removeClass("disabled")
        } finally {
            $("#loader").removeClass("active")
        }
    }, 250)
})

$("#joinParty-btn").on("click", () => {
    // Join an existing party using invite code
    const partyCode = $("#inviteCode").val().toUpperCase()
    const codeRegex = /^[A-Z0-9]{5}$/
    if (!codeRegex.test(partyCode)) {
        alert("Please enter a valid 5-character party code (A–Z, 0–9).")
        return
    }

    $(".holder .box").empty()
    $("#main-page").addClass("disabled")
    $("#loader").addClass("active")
    $("#customizer").removeClass("active")
    $("#startGame-btn, #optionsO-btn, #optionsX-btn, .optionsC").hide()
    setPlayerName()

    setTimeout(async () => {
        try {
            const res = await axios.post("/join_party", {
                party_code: partyCode,
                name: CLIENT_DATA.playerName,
                avatar: CLIENT_DATA.avatar
            })

            const { player_id, party_state } = res.data
            CLIENT_DATA.playerId = player_id
            CLIENT_DATA.currentParty = partyCode

            // Show appropriate page depending on party state
            $("#codeLabel").text("รหัสเชิญ : " + partyCode)
            if (party_state !== "InGame") $("#party-page").removeClass("disabled")
            else $("#game-page").removeClass("disabled")

            // Join socket room as player
            SOCKET.emit("join_party_room", {
                party_code: partyCode,
                player_id: CLIENT_DATA.playerId,
                join: true,
            })

        } catch (err) {
            console.error("Error joining party:", err)
            alert("There was an error joining the party. Please try again.")
            $("#main-page").removeClass("disabled")
        } finally {
            $("#loader").removeClass("active")
        }
    }, 250)
})

$("#codeLabel").on("click", async () => {
    // Copy party code to clipboard
    const original = $("#codeLabel").text()
    const party_code = original.split(":")[1]?.trim()

    if (!party_code || party_code === "-----" || $(".copied").hasClass("show")) return

    await navigator.clipboard.writeText(party_code).catch(() => { })
    $(".copied").addClass("show")
    setTimeout(() => $(".copied").removeClass("show"), 1000)
})

$("#leaveParty-btn").on("click", async () => {
    // Leave current party
    const confirmLeave = confirm("Are you sure you want to leave the party?");
    if (!confirmLeave) return;

    const partyCode = $("#codeLabel").text().replace("รหัสเชิญ : ", "").trim().toUpperCase();

    // Show loader & hide party UI
    $("#loader").addClass("active");
    $("#customizer").removeClass("active");
    $("#party-page").addClass("disabled");
    $("#startGame-btn, #optionsO-btn, #optionsX-btn, .optionsC").hide();
    resetOptions();

    setTimeout(async () => {
        try {
            // Emit leave event and wait for server response
            const res = await new Promise((resolve) => {
                SOCKET.emit("leave_party_room", (response) => {
                    resolve(response);
                });
            });

            if (!res.success) throw new Error(res.error || "Failed to leave party");

            // Clear UI
            $("#main-page").removeClass("disabled");
            $("#codeLabel").text("รหัสเชิญ : ----");
            $("#plr-list.party .box").empty();
            CLIENT_DATA.loadedPlayers = [];
            CLIENT_DATA.currentParty = null;
            CLIENT_DATA.playerId = null;

        } catch (err) {
            console.error("Error leaving party:", err);
            alert("There was an error leaving the party. Please try again.");

            // Restore UI since leave failed
            $("#main-page").addClass("disabled");
            $("#party-page").removeClass("disabled");
            $("#codeLabel").text("รหัสเชิญ : " + partyCode);
        } finally {
            $("#loader").removeClass("active");
        }
    }, 250)
});


$("#startGame-btn").on("click", async () => {
    // Start the game and send options to server
    SOCKET.emit("start_game", {
        party_code: CLIENT_DATA.currentParty,
        roundsCount: parseInt($("#roundsCount").text(), 10),
        guessLimit: parseInt(parseGuess($("#guessLimit").text()), 10),
        drawTime: parseInt($("#drawTime").text(), 10),
        onlyCustom: !$("#topic-override").hasClass("disabled"),
        customTopics: $("#customTopics").val()
    }, (res) => {
        if (!res.success) {
            alert("Error: " + res.success)
        }
    })
})

// ============================
// CHATBOX & GUESSBOX
// ============================
$("#chatMsg").on("keydown", (e) => {
    // Send chat message when Enter is pressed
    if (e.key !== 'Enter') return

    const message = $("#chatMsg").val()
    if (message.trim() === "") return

    SOCKET.emit("message", {
        custom_class: null,
        party_code: CLIENT_DATA.currentParty,
        name: CLIENT_DATA.playerName,
        avatar: CLIENT_DATA.avatar,
        message: message,
    })
    $("#chatMsg").val('')
})

$("#guessMsg").on("keydown", (e) => {
    // Send guess message when Enter is pressed
    if (e.key !== 'Enter') return

    const message = $("#guessMsg").val()
    if (message.trim() === "") return

    SOCKET.emit("guess", {
        party_code: CLIENT_DATA.currentParty,
        name: CLIENT_DATA.playerName,
        message: message,
    })
    $("#guessMsg").val('')
})

// ============================
// SETTINGS MENU
// ============================
$("#optionsO-btn").on("click", () => {
    // Open options panel
    $(".transition-div").addClass("fill")
    $("#startGame-btn, #optionsO-btn, #leaveParty-btn").addClass("hidden")

    setTimeout(() => {
        $("#startGame-btn, #optionsO-btn, #leaveParty-btn").hide()
        $("#plr-list.party, #chat-box.party").hide()
        $(".optionsC, #optionsX-btn").show()
        $("#optionsX-btn").removeClass("hidden")
        $(".transition-div").removeClass("fill")
    }, 300)
})

$("#optionsX-btn").on("click", () => {
    // Close options panel
    $(".transition-div").addClass("fill")
    $("#optionsX-btn").addClass("hidden")

    setTimeout(() => {
        $(".optionsC, #optionsX-btn").hide()
        $("#plr-list.party, #chat-box.party").show()
        $("#startGame-btn, #optionsO-btn, #leaveParty-btn").show().removeClass("hidden")
        $(".transition-div").removeClass("fill")
    }, 300)
})

$(".optionsC").on("click", ".increase", (e) => {
    // Increase/decrease options
    const $num = $(e.currentTarget).siblings(".option-value")
    let value = parseGuess($num.text())
    const max = parseInt($num.data("max"), 10)

    if (value < max) $num.text(formatGuess(value + 1))
    updateButtons($num)
})

$(".optionsC").on("click", ".decrease", (e) => {
    const $num = $(e.currentTarget).siblings(".option-value")
    let value = parseGuess($num.text())
    const min = parseInt($num.data("min"), 10)

    if (value > min) $num.text(formatGuess(value - 1))
    updateButtons($num)
})

$("#topic-override").on("click", () => {
    // Custom topic toggles
    $("#topic-override").removeClass("disabled")
    $("#topic-merge").addClass("disabled")
})

$("#topic-merge").on("click", () => {
    // Custom topic toggles
    $("#topic-merge").removeClass("disabled")
    $("#topic-override").addClass("disabled")
})

$(".option-value").each((_, el) => updateButtons($(el)))

// ============================
// TOPIC PICKER
// ============================
$(".choose-btn").on("click", (e) => {
    // Player picks a topic
    const topic = $(e.currentTarget).text().trim()
    SOCKET.emit("pick_topic", {
        picked_topic: topic
    })
    $("#topics-list").removeClass("show")
    triggerAnim($("#hint"), "update")
    $("#hint").text(topic)
})

// ============================
// SOCKET: Chat messages
// ============================
SOCKET.on("message", (data) => {
    const $msgBox = $('<div class="msg-box"></div>')

    // System/custom messages
    if (data.custom_class) {
        $msgBox.addClass("system")
        $msgBox.addClass(data.custom_class)
    }

    // Build avatar profile pic
    const $avDisplay = buildAvatarDOM(data.avatar)

    // Build text content
    const $container = $('<div></div>')
    const $senderName = $('<p class="sender-name"></p>').text(data.name)
    const $textContainer = $('<p class="text-container"></p>').text(data.message)
    $container.append($senderName, $textContainer)

    $msgBox.append($avDisplay, $container)
    $(".party .holder .box").append($msgBox)

    // Animate and scroll down
    requestAnimationFrame(() => {
        $msgBox.addClass("show")
    })
    $(".party .holder .box").scrollTop($(".party .holder .box").prop("scrollHeight"))
})

// ============================
// SOCKET: Player list updates
// ============================
SOCKET.on("update_players", (data) => {
    if (data.type == "Party") {
        $("#plr-list.party .box").empty()
        $.each(data.players, function (uuid, plr) {
            const $plrBox = $('<div class="plr-box"></div>')

            // Play cool animation
            if (CLIENT_DATA.loadedPlayers[uuid]) {
                $plrBox.css({
                    transform: "scale(1)"
                })
            }

            // Add crown if host
            if (uuid == data.host) {
                const $hostCrown = $('<img class="crown" src="/static/Images/Icons/Host.svg"></img>')
                $plrBox.append($hostCrown)
            }

            // Host only buttons
            if (CLIENT_DATA.playerId == data.host) {
                $("#startGame-btn, #optionsO-btn").show()
            }

            // Avatar display
            const $avDisplay = buildAvatarDOM(plr.Avatar)

            // Player info
            const $info = $('<div class="plr-info"></div>')
            const $userName = $('<p class="username"></p>').text(plr.Name)
            if (CLIENT_DATA.playerId == uuid) {
                $userName.append($('<span class="meTag">(คุณ)</span>'))
            }
            const displayUUID = uuid.substring(0, 20)
            const $idText = $('<p class="uuid"></p>').text(`UUID : ${displayUUID}`)

            $info.append($userName, $idText)
            $plrBox.append($avDisplay, $info)

            $("#plr-list.party .box").append($plrBox)

            // Animate new players
            if (!CLIENT_DATA.loadedPlayers[uuid]) {
                CLIENT_DATA.loadedPlayers[uuid] = true
                requestAnimationFrame(() => $plrBox.addClass("show"))
            }
        })
    } else if (data.type == "InGame") {
        $("#plr-list.game .box").empty()
        $.each(data.players, function (uuid, plr) {
            const $plrBox = $('<div class="plr-box"></div>')

            // Play cool animation
            if (CLIENT_DATA.loadedPlayers[uuid] && data.reset) {
                $plrBox.css({
                    transform: "scale(1)"
                })
            }

            // Add pencil if drawer
            if (uuid == data.drawer_id) {
                const $drawerPencil = $('<img class="drawer" src="/static/Images/Icons/Pencil.svg"></img>')
                $plrBox.append($drawerPencil)
                $plrBox.addClass("drawer")
            }

            // Avatar display
            const $avDisplay = buildAvatarDOM(plr.Avatar)

            // Player info
            const $info = $('<div class="plr-info"></div>')
            const $userName = $('<p class="username"></p>')
            const $name = $('<span class="name"></span>').text(plr.Name)
            $userName.append($name)
            if (CLIENT_DATA.playerId == uuid) {
                $userName.append($('<span class="meTag">(คุณ)</span>'))
            }
            const $scoreText = $('<p class="score"></p>').text(`${plr.Scores} คะแนน`)

            $info.append($userName, $scoreText)
            $plrBox.append($avDisplay, $info)

            $("#plr-list.game .box").append($plrBox)

            // Animate new players
            if (!CLIENT_DATA.loadedPlayers[uuid]) {
                CLIENT_DATA.loadedPlayers[uuid] = true
                requestAnimationFrame(() => $plrBox.addClass("show"))
            }
        })
    }
})

// ============================
// SOCKET: Game start
// ============================
SOCKET.on("start_game", (data) => {
    $("#party-page").addClass("disabled")
    $(".game .holder .box").empty()
    $("#guessMsg").prop("disabled", true).addClass("disabled").attr("placeholder", "ไม่สามารถส่งคำตอบได้ในขณะนี้");
    if (data.guessLimit) {
        $("#guessesLeft").show()
        $("#guessesLeft").text(`ทายได้อีก ${data.guessLimit} ครั้ง`)
        CLIENT_DATA.guessesLeft = data.guessLimit
    } else {
        $("#guessesLeft").hide()
    }
    startCountdown(3)
    setTimeout(async () => {
        $("#countdown").removeClass("active")
        $("#game-page").removeClass("disabled")
    }, 3000)
})

// ============================
// SOCKET: Timer updates
// ============================
SOCKET.on("update_timer", (data) => {
    const timeParts = data.time.split(":")
    const minutes = parseInt(timeParts[0], 10)
    const seconds = parseInt(timeParts[1], 10)
    const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    $("#timer").text(formatted)
})
SOCKET.on("timer_anim", () => {
    triggerAnim($("#timer"), "update")
})

// ============================
// SOCKET: Show Topics picker
// ============================
SOCKET.on("topics_pick_drawer", (data) => {
    $("#topics-list").addClass("show")
    $("#Topic-1").text(data.topic1)
    $("#Topic-2").text(data.topic2)
    $("#Topic-3").text(data.topic3)
    $("#guessMsg").prop("disabled", true).addClass("disabled").attr("placeholder", "ไม่สามารถส่งคำตอบได้เนื่องจากเป็นคนวาด!");
})
SOCKET.on("topics_pick_all", () => {
    $("#guessMsg").prop("disabled", true).addClass("disabled").attr("placeholder", "ไม่สามารถส่งคำตอบได้ในขณะนี้");
    triggerAnim($("#hint"), "update")
    setStatus($(".banner"), "ผู้เล่นกำลังเลือกหัวข้อ")
})
SOCKET.on("pick_done", (data) => {
    if (data.drawer_id != CLIENT_DATA.playerId) {
        triggerAnim($("#hint"), "update")
        $("#hint").text(data.hint)
        $("#guessMsg").prop("disabled", false).removeClass("disabled").attr("placeholder", 'คำตอบไม่จำเป็นต้องมี "วรรณยุกต์" ครบถ้วนก็ได้นะ!');
    }
    $(".game .holder .box").empty()
    setStatus()
})

// ============================
// SOCKET: Show Canvas Alert
// ============================
SOCKET.on("canvas_alert", (data) => {
    $("#topics-list").removeClass("show")
    setStatus($(data.icon), data.msg)
})
SOCKET.on("show_answer", (data) => {
    setStatus($(".reveal"), "คำตอบคือ")
    $(".status h1").text(data.answer)
})

// ============================
// SOCKET: Guess messages
// ============================
SOCKET.on("guess", (data) => {
    // Check if already done
    if (data.custom_class === "correct" && data.playerId === CLIENT_DATA.playerId) {
        $("#guessMsg").prop("disabled", true).addClass("disabled").attr("placeholder", "คำตอบถูกต้อง!");
    }

    // Check guessesLeft
    $("#guessesLeft").text(`ทายได้อีก ${data.guesses_left} ครั้ง`)
    CLIENT_DATA.guessesLeft = data.guesses_left
    if (data.guesses_left <= 0) {
        $("#guessMsg").prop("disabled", true).addClass("disabled").attr("placeholder", "แย่จัง! ทายผิดหมดเลย~");
    }    

    // Display guesses
    const $msgBox = $('<div class="msg-box"></div>')

    // System/custom messages
    if (data.custom_class) {
        $msgBox.addClass("system")
        $msgBox.addClass(data.custom_class)
    }

    const $senderName = $('<p class="sender-name"></p>').text(data.name)
    const $textContainer = $('<p class="text-container"></p>').text(data.message)

    if (data.custom_class) {
        $msgBox.append($senderName, $textContainer)
    } else {
        const $colon = $('<span>:</span>')
        $msgBox.append($senderName, $colon, $textContainer)
    }
    $(".game .holder .box").append($msgBox)

    // Animate and scroll down
    requestAnimationFrame(() => {
        $msgBox.addClass("show")
    })
    $(".game .holder .box").scrollTop($(".game .holder .box").prop("scrollHeight"))
})
