// ============================
// SOCKET EVENT HANDLERS
// ============================

import { CLIENT_DATA } from '/static/Scripts/clientData.js';
import { buildAvatarDOM } from '/static/Scripts/avatar.js';
import { triggerAnim, startCountdown, setStatus, playSound } from '/static/Scripts/utils.js';

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

                if (CLIENT_DATA.playerId === data.host && !$("#startGame-btn, #optionsO-btn").hasClass("hidden")) {
                    $("#startGame-btn, #optionsO-btn").show();
                }

                const $avDisplay = buildAvatarDOM(plr.Avatar);
                const $info = $('<div class="plr-info"></div>');
                const $userName = $('<p class="username"></p>');
                const $name = $('<span class="name"></span>').text(plr.Name);
                $userName.append($name);
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
                const $scoreText = $('<p class="score"></p>').text(`${plr.Scores.toLocaleString()} คะแนน`);

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
        CLIENT_DATA.canvasData.isDrawer = false
        CLIENT_DATA.canvasData.histories = {
            undo: [],
            redo: [],
        }
    });

    socket.on("pick_done", (data) => {
        if (data.drawer_id !== CLIENT_DATA.playerId) {
            triggerAnim($("#hint"), "update");
            $("#hint").text(data.hint);
            $("#guessMsg").prop("disabled", false).removeClass("disabled").attr("placeholder", 'คำตอบไม่จำเป็นต้องมี "วรรณยุกต์" ครบถ้วนก็ได้นะ!');
        } else {
            $("#plr-list.game").addClass("cut");
            $("#toolbar").removeClass("hidden");
            CLIENT_DATA.canvasData.isDrawer = true
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
        if (data.type == "normal") {
            setStatus($(".reveal"), "คำตอบคือ");
            $(".status h1").text(data.answer);
        } else if (data.type == "master") {
            setStatus($(".star"), "ผลงานชิ้นเอก");
            $(".status h1").text("ตอบถูกทุกคนเลย!");
        } else if (data.type == "none") {
            setStatus($(".angry"), "ว้า~ แย่จัง");
            $(".status h1").text("ตอบไม่ได้สักคน!");
        }
        CLIENT_DATA.canvasData.isDrawer = false
    });

    // Guess messages
    socket.on("guess", (data) => {
        if (data.playerId == CLIENT_DATA.playerId) {
            $("#guessesLeft").text(`ทายได้อีก ${data.guesses_left} ครั้ง`);
            CLIENT_DATA.guessesLeft = data.guesses_left;
            if (data.guesses_left === 0) {
                $("#guessMsg").prop("disabled", true).addClass("disabled").attr("placeholder", "แย่จัง! ทายผิดหมดเลย~");
            }
            if (data.custom_class == "correct") {
                $("#guessMsg").prop("disabled", true).addClass("disabled").attr("placeholder", "คำตอบถูกต้อง!");
            }
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

    // Scoreboard
    socket.on("game_ended", (data) => {
        $("#transition-page").addClass("fill");
        setStatus();
        playSound("end", 1);

        setTimeout(() => {
            $("#game-page").addClass("disabled");
        }, 100);

        setTimeout(() => {
            playSound("coin", 1);
            $("#transition-page").removeClass("fill");
            $("#end-page").removeClass("disabled");
            $("#plr-list .box").empty();
            $("#top-three .box").removeClass("show");

            // TOP 3 PLAYER
            const topColors = ["#f6c14d", "#bababa", "#ff9162"];
            const topIds = ["#1st-place", "#2nd-place", "#3rd-place"];

            topIds.forEach((id, i) => {
                const player = data.players[i];
                const $box = $(id);

                if (player) {
                    const $avDisplay = buildAvatarDOM(player.Avatar);
                    $box.find(".av-display").replaceWith($avDisplay);
                    $avDisplay.addClass("av-display");

                    $box.find(".username").text(player.Name);
                    $box.find(".score").text(`${player.Scores.toLocaleString()} คะแนน`);
                    $box.css("--score-color", topColors[i]);

                    $box.addClass("show");
                } else {
                    $box.find(".player")
                        .attr("src", `/static/Images/Avatar/Colors/1.svg`)
                        .css("filter", "brightness(50%)");
                    $box.find(".shirt, .face, .hair, .acc").hide();
                    $box.css("--score-color", "#858585");
                    $box.find(".username").text("-");
                    $box.find(".score").text("ไม่มีผู้เล่น");
                }
            });

            // PLAYERLIST
            data.players.forEach((player, index) => {
                const rank = index + 1;
                const $plrBox = $('<div class="plr-box"></div>');
                const $avDisplay = buildAvatarDOM(player.Avatar);
                const $info = $('<div class="plr-info"></div>');
                const $userName = $('<p class="username"></p>');
                const $name = $('<span class="name"></span>').text(player.Name);
                $userName.append($name);

                if (CLIENT_DATA.playerName && player.Name === CLIENT_DATA.playerName) {
                    $userName.append($('<span class="meTag">(คุณ)</span>'));
                }

                const $scoreText = $('<p class="score"></p>').text(`${player.Scores.toLocaleString()} คะแนน`);

                $info.append($userName, $scoreText);

                const $left = $('<div class="plr-boxL"></div>');
                $left.append($avDisplay, $info);

                const $rank = $(`<h1>#${rank}</h1>`);

                $plrBox.append($left, $rank);
                $("#plr-list .box").append($plrBox);

                // Delay animation for each player
                setTimeout(() => {
                    requestAnimationFrame(() => $plrBox.addClass("show"));
                }, 100 * index);
            });
        }, 1000);
    });

}