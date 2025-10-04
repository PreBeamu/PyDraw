// ============================
// SOCKET EVENT HANDLERS
// ============================

import { CLIENT_DATA } from '/static/Scripts/clientData.js';
import { buildAvatarDOM } from '/static/Scripts/avatar.js';
import { triggerAnim, startCountdown, setStatus } from '/static/Scripts/utils.js';

export function initSocketHandlers(socket) {
    // Chat messages
    socket.on("message", (data) => {
        const $msgBox = $('<div class="msg-box"></div>');

        if (data.custom_class) {
            $msgBox.addClass("system");
            $msgBox.addClass(data.custom_class);
        }

        const $avDisplay = buildAvatarDOM(data.avatar);
        const $container = $('<div></div>');
        const $senderName = $('<p class="sender-name"></p>').text(data.name);
        const $textContainer = $('<p class="text-container"></p>').text(data.message);
        $container.append($senderName, $textContainer);

        $msgBox.append($avDisplay, $container);
        $(".party .holder .box").append($msgBox);

        requestAnimationFrame(() => {
            $msgBox.addClass("show");
        });
        $(".party .holder .box").scrollTop($(".party .holder .box").prop("scrollHeight"));
    });

    // Player list updates
    socket.on("update_players", (data) => {
        if (data.type === "Party") {
            $("#plr-list.party .box").empty();
            $.each(data.players, function (uuid, plr) {
                const $plrBox = $('<div class="plr-box"></div>');

                if (CLIENT_DATA.loadedPlayers[uuid]) {
                    $plrBox.css({ transform: "scale(1)" });
                }

                if (uuid === data.host) {
                    const $hostCrown = $('<img class="crown" src="/static/Images/Icons/Host.svg"></img>');
                    $plrBox.append($hostCrown);
                }

                if (CLIENT_DATA.playerId === data.host) {
                    $("#startGame-btn, #optionsO-btn").show();
                }

                const $avDisplay = buildAvatarDOM(plr.Avatar);
                const $info = $('<div class="plr-info"></div>');
                const $userName = $('<p class="username"></p>').text(plr.Name);
                if (CLIENT_DATA.playerId === uuid) {
                    $userName.append($('<span class="meTag">(คุณ)</span>'));
                }
                const displayUUID = uuid.substring(0, 20);
                const $idText = $('<p class="uuid"></p>').text(`UUID : ${displayUUID}`);

                $info.append($userName, $idText);
                $plrBox.append($avDisplay, $info);
                $("#plr-list.party .box").append($plrBox);

                if (!CLIENT_DATA.loadedPlayers[uuid]) {
                    CLIENT_DATA.loadedPlayers[uuid] = true;
                    requestAnimationFrame(() => $plrBox.addClass("show"));
                }
            });
        } else if (data.type === "InGame") {
            $("#plr-list.game .box").empty();
            $.each(data.players, function (uuid, plr) {
                const $plrBox = $('<div class="plr-box"></div>');

                if (CLIENT_DATA.loadedPlayers[uuid] && data.reset) {
                    $plrBox.css({ transform: "scale(1)" });
                }

                if (uuid === data.drawer_id) {
                    const $drawerPencil = $('<img class="drawer" src="/static/Images/Icons/Pencil.svg"></img>');
                    $plrBox.append($drawerPencil);
                    $plrBox.addClass("drawer");
                }

                const $avDisplay = buildAvatarDOM(plr.Avatar);
                const $info = $('<div class="plr-info"></div>');
                const $userName = $('<p class="username"></p>');
                const $name = $('<span class="name"></span>').text(plr.Name);
                $userName.append($name);
                if (CLIENT_DATA.playerId === uuid) {
                    $userName.append($('<span class="meTag">(คุณ)</span>'));
                }
                const $scoreText = $('<p class="score"></p>').text(`${plr.Scores} คะแนน`);

                $info.append($userName, $scoreText);
                $plrBox.append($avDisplay, $info);
                $("#plr-list.game .box").append($plrBox);

                if (!CLIENT_DATA.loadedPlayers[uuid]) {
                    CLIENT_DATA.loadedPlayers[uuid] = true;
                    requestAnimationFrame(() => $plrBox.addClass("show"));
                }
            });
        }
    });

    // Game start
    socket.on("start_game", (data) => {
        $("#party-page").addClass("disabled");
        $(".game .holder .box").empty();
        $("#guessMsg").prop("disabled", true).addClass("disabled").attr("placeholder", "ไม่สามารถส่งคำตอบได้ในขณะนี้");
        if (data.guessLimit) {
            $("#guessesLeft").show();
            $("#guessesLeft").text(`ทายได้อีก ${data.guessLimit} ครั้ง`);
            CLIENT_DATA.guessesLeft = data.guessLimit;
        } else {
            $("#guessesLeft").hide();
        }
        startCountdown(3);
        setTimeout(() => {
            $("#countdown").removeClass("active");
            $("#game-page").removeClass("disabled");
        }, 3000);
    });

    // Timer updates
    socket.on("update_timer", (data) => {
        const timeParts = data.time.split(":");
        const minutes = parseInt(timeParts[0], 10);
        const seconds = parseInt(timeParts[1], 10);
        const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        $("#timer").text(formatted);
    });

    socket.on("timer_anim", () => {
        triggerAnim($("#timer"), "update");
    });

    // Topic picking
    socket.on("topics_pick_drawer", (data) => {
        $("#topics-list").addClass("show");
        $("#Topic-1").text(data.topic1);
        $("#Topic-2").text(data.topic2);
        $("#Topic-3").text(data.topic3);
        $("#guessMsg").prop("disabled", true).addClass("disabled").attr("placeholder", "ไม่สามารถส่งคำตอบได้เนื่องจากเป็นคนวาด!");
    });

    socket.on("topics_pick_all", () => {
        $("#guessMsg").prop("disabled", true).addClass("disabled").attr("placeholder", "ไม่สามารถส่งคำตอบได้ในขณะนี้");
        triggerAnim($("#hint"), "update");
        setStatus($(".banner"), "ผู้เล่นกำลังเลือกหัวข้อ");
    });

    socket.on("pick_done", (data) => {
        if (data.drawer_id !== CLIENT_DATA.playerId) {
            triggerAnim($("#hint"), "update");
            $("#hint").text(data.hint);
            $("#guessMsg").prop("disabled", false).removeClass("disabled").attr("placeholder", 'คำตอบไม่จำเป็นต้องมี "วรรณยุกต์" ครบถ้วนก็ได้นะ!');
        }
        $(".game .holder .box").empty();
        setStatus();
    });

    // Canvas alerts
    socket.on("canvas_alert", (data) => {
        $("#topics-list").removeClass("show");
        setStatus($(data.icon), data.msg);
    });

    socket.on("show_answer", (data) => {
        setStatus($(".reveal"), "คำตอบคือ");
        $(".status h1").text(data.answer);
    });

    // Guess messages
    socket.on("guess", (data) => {
        if (data.custom_class === "correct" && data.playerId === CLIENT_DATA.playerId) {
            $("#guessMsg").prop("disabled", true).addClass("disabled").attr("placeholder", "คำตอบถูกต้อง!");
        }

        $("#guessesLeft").text(`ทายได้อีก ${data.guesses_left} ครั้ง`);
        CLIENT_DATA.guessesLeft = data.guesses_left;
        if (data.guesses_left <= 0) {
            $("#guessMsg").prop("disabled", true).addClass("disabled").attr("placeholder", "แย่จัง! ทายผิดหมดเลย~");
        }

        const $msgBox = $('<div class="msg-box"></div>');

        if (data.custom_class) {
            $msgBox.addClass("system");
            $msgBox.addClass(data.custom_class);
        }

        const $senderName = $('<p class="sender-name"></p>').text(data.name);
        const $textContainer = $('<p class="text-container"></p>').text(data.message);

        if (data.custom_class) {
            $msgBox.append($senderName, $textContainer);
        } else {
            const $colon = $('<span>:</span>');
            $msgBox.append($senderName, $colon, $textContainer);
        }
        $(".game .holder .box").append($msgBox);

        requestAnimationFrame(() => {
            $msgBox.addClass("show");
        });
        $(".game .holder .box").scrollTop($(".game .holder .box").prop("scrollHeight"));
    });

    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d");

    let drawing = false;
    let last = null;
    let currentColors = "#000000";
    let currentLineWidth = 4;
    let history = [];

    function resizeCanvas() {
        const parent = canvas.parentElement;

        // เก็บรูปก่อน
        const imgData = canvas.toDataURL();
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;

        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        img.src = imgData;
    }


    function getPos(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }


    function drawLine(ctx, p1, p2) {
        ctx.strokeStyle = currentColors;
        ctx.lineWidth = currentLineWidth;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    }

    // Mouse events
    canvas.addEventListener("mousedown", e => {
        drawing = true;
        last = getPos(e, canvas);
        history.push(canvas.toDataURL()); // เก็บ snapshot สำหรับ undo
    });

    canvas.addEventListener("mousemove", e => {
        if (!drawing) return;
        const pos = getPos(e, canvas);
        drawLine(ctx, last, pos); // วาดเส้นจาก last → pos
        last = pos;
        socket.emit("draw", { image: canvas.toDataURL() });
    });

    canvas.addEventListener("mouseup", () => { drawing = false; });
    canvas.addEventListener("mouseleave", () => { drawing = false; });


    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();


    // อัปเดตภาพจาก server
    socket.on("update_image", img => {
        console.log(img)
        const image = new Image();
        image.onload = () => {
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        };
        image.src = img;
    });
}