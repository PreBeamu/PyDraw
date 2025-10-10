// ============================
// UI EVENT HANDLERS
// ============================

import {
    COLORS_AMOUNT,
    FACES_AMOUNT,
    HAIRS_AMOUNT,
    ACCESSORIES_AMOUNT,
} from "/static/Scripts/constants.js";
import { CLIENT_DATA } from "/static/Scripts/clientData.js";
import {
    parseGuess,
    formatGuess,
    updateButtons,
    resetOptions,
    nextIndex,
    triggerAnim,
    errorToast,
    optionToast,
} from "/static/Scripts/utils.js";
import {
    setPlayerName,
    setImageWhenLoaded,
    saveAvatar,
    randomizeAvatar,
    urlColor,
    urlFace,
    urlHair,
    urlAccessory,
} from "/static/Scripts/avatar.js";

export function initUIHandlers(socket) {
    // Avatar customization
    $("#customizer").on("click", () => {
        $("#customizer").toggleClass("active");
    });

    $("#closet .islot").each((_, el) => {
        const $display = $(el);
        const id = $display.attr("id");
        const $container = $display.find(".idisplay");

        const cycleAvatar = () => {
            switch (id) {
                case "color":
                    CLIENT_DATA.avatar[0] = nextIndex(
                        CLIENT_DATA.avatar[0],
                        COLORS_AMOUNT
                    );
                    setImageWhenLoaded("#plr-color", urlColor(CLIENT_DATA.avatar[0]));
                    setImageWhenLoaded(
                        "#closet #color .player",
                        urlColor(CLIENT_DATA.avatar[0])
                    );
                    break;

                case "face":
                    CLIENT_DATA.avatar[1] = nextIndex(
                        CLIENT_DATA.avatar[1],
                        FACES_AMOUNT
                    );
                    setImageWhenLoaded("#plr-face", urlFace(CLIENT_DATA.avatar[1]));
                    setImageWhenLoaded(
                        "#closet #face .face",
                        urlFace(CLIENT_DATA.avatar[1])
                    );
                    break;

                case "hair":
                    CLIENT_DATA.avatar[2] = nextIndex(
                        CLIENT_DATA.avatar[2],
                        HAIRS_AMOUNT
                    );
                    setImageWhenLoaded("#plr-hair", urlHair(CLIENT_DATA.avatar[2]));
                    setImageWhenLoaded(
                        "#closet #hair .hair",
                        urlHair(CLIENT_DATA.avatar[2])
                    );
                    break;

                case "acc":
                    CLIENT_DATA.avatar[3] = nextIndex(
                        CLIENT_DATA.avatar[3],
                        ACCESSORIES_AMOUNT
                    );
                    setImageWhenLoaded("#plr-acc", urlAccessory(CLIENT_DATA.avatar[3]));
                    setImageWhenLoaded(
                        "#closet #acc .acc",
                        urlAccessory(CLIENT_DATA.avatar[3])
                    );
                    break;
            }
            saveAvatar();
        };

        $container.on("click", cycleAvatar);
    });

    $("#randomizer").on("click", () => {
        randomizeAvatar();
    });

    // Party buttons
    $("#createParty-btn").on("click", () => {
        $("#main-page").addClass("disabled");
        $("#loader").addClass("active");
        $("#customizer").removeClass("active");
        $(".holder .box").empty();
        setPlayerName();

        setTimeout(async () => {
            try {
                const res = await axios.post("/create_party", {
                    name: CLIENT_DATA.playerName,
                    avatar: CLIENT_DATA.avatar,
                });

                const { party_code, player_id } = res.data;
                CLIENT_DATA.playerId = player_id;
                CLIENT_DATA.currentParty = party_code;
                CLIENT_DATA.loadedPlayers = [];

                $("#party-page").removeClass("disabled");
                $("#codeLabel").text("รหัสเชิญ : " + party_code);
                $("#plr-list.party .box").empty();

                socket.emit("join_party_room", {
                    party_code: party_code,
                    player_id: player_id,
                    create: true,
                });
            } catch (err) {
                errorToast("เกิดปัญหาในการสร้างปาร์ตี้!",2500)
                $("#main-page").removeClass("disabled");
            } finally {
                $("#loader").removeClass("active");
            }
        }, 250);
    });

    $("#joinParty-btn").on("click", () => {
        const partyCode = $("#inviteCode").val().toUpperCase();
        const codeRegex = /^[A-Z0-9]{5}$/;
        if (!codeRegex.test(partyCode)) {
            errorToast("รหัสเชิญผิดกรุณาใส่รหัสห้อง 5 หลักที่ประกอบด้วย (A–Z, 0–9)",2500)
            return;
        }

        $(".holder .box").empty();
        $("#main-page").addClass("disabled");
        $("#loader").addClass("active");
        $("#customizer").removeClass("active");
        $("#startGame-btn, #optionsO-btn, #optionsX-btn, .optionsC").hide();
        setPlayerName();

        setTimeout(async () => {
            try {
                const res = await axios.post("/join_party", {
                    party_code: partyCode,
                    name: CLIENT_DATA.playerName,
                    avatar: CLIENT_DATA.avatar,
                });

                const { player_id, party_state } = res.data;
                CLIENT_DATA.playerId = player_id;
                CLIENT_DATA.currentParty = partyCode;

                $("#codeLabel").text("รหัสเชิญ : " + partyCode);
                if (party_state !== "InGame") $("#party-page").removeClass("disabled");
                else $("#game-page").removeClass("disabled");

                socket.emit("join_party_room", {
                    party_code: partyCode,
                    player_id: CLIENT_DATA.playerId,
                    join: true,
                });
            } catch (err) {
                errorToast("เกิดปัญหาในการเข้าร่วมปาร์ตี้!",2500)
                $("#main-page").removeClass("disabled");
            } finally {
                $("#loader").removeClass("active");
            }
        }, 250);
    });

    $("#codeLabel").on("click", async () => {
        const original = $("#codeLabel").text();
        const party_code = original.split(":")[1]?.trim();

        if (!party_code || party_code === "-----" || $(".copied").hasClass("show"))
            return;

        await navigator.clipboard.writeText(party_code).catch(() => { });
        $(".copied").addClass("show");
        setTimeout(() => $(".copied").removeClass("show"), 1000);
    });

    $("#leaveParty-btn").on("click", async () => {
        const status = await optionToast("ต้องการออกจากปาร์ตี้ปัจจุบันหรือไม่?", -1);
        if (!status) return;

        const partyCode = $("#codeLabel")
            .text()
            .replace("รหัสเชิญ : ", "")
            .trim()
            .toUpperCase();

        $("#loader").addClass("active");
        $("#customizer").removeClass("active");
        $("#party-page").addClass("disabled");
        $("#startGame-btn, #optionsO-btn, #optionsX-btn, .optionsC").hide();
        resetOptions();

        setTimeout(async () => {
            try {
                const res = await new Promise((resolve) => {
                    socket.emit("leave_party_room", (response) => {
                        resolve(response);
                    });
                });

                if (!res.success) throw new Error(res.error || "Failed to leave party");

                $("#main-page").removeClass("disabled");
                $("#codeLabel").text("รหัสเชิญ : ----");
                $("#plr-list.party .box").empty();
                CLIENT_DATA.loadedPlayers = [];
                CLIENT_DATA.currentParty = null;
                CLIENT_DATA.playerId = null;
            } catch (err) {
                errorToast("เกิดปัญหาในการออกจากปาร์ตี้!",2500)
                $("#main-page").addClass("disabled");
                $("#party-page").removeClass("disabled");
                $("#codeLabel").text("รหัสเชิญ : " + partyCode);
            } finally {
                $("#loader").removeClass("active");
            }
        }, 250);
    });

    $("#startGame-btn").on("click", async () => {
        $(".toastify").remove();
        socket.emit(
            "start_game",
            {
                party_code: CLIENT_DATA.currentParty,
                roundsCount: parseInt($("#roundsCount").text(), 10),
                guessLimit: parseInt(parseGuess($("#guessLimit").text()), 10),
                drawTime: parseInt($("#drawTime").text(), 10),
                onlyCustom: !$("#topic-override").hasClass("disabled"),
                customTopics: $("#customTopics").val(),
            },
            (res) => {
                if (!res.success) {
                    errorToast("เกิดปัญหาในการเริ่มเกม!",2500)
                }
            }
        );
    });

    // Chat and guess
    $("#chatMsg").on("keydown", (e) => {
        if (e.key !== "Enter") return;

        const message = $("#chatMsg").val();
        if (message.trim() === "") return;

        socket.emit("message", {
            custom_class: null,
            party_code: CLIENT_DATA.currentParty,
            name: CLIENT_DATA.playerName,
            avatar: CLIENT_DATA.avatar,
            message: message,
        });
        $("#chatMsg").val("");
    });

    $("#guessMsg").on("keydown", (e) => {
        if (e.key !== "Enter") return;

        const message = $("#guessMsg").val();
        if (message.trim() === "") return;

        socket.emit("guess", {
            party_code: CLIENT_DATA.currentParty,
            name: CLIENT_DATA.playerName,
            message: message,
        });
        $("#guessMsg").val("");
    });

    // Settings menu
    $("#optionsO-btn").on("click", () => {
        $(".toastify").remove();
        $(".partyC .transition-div").addClass("fill");
        $("#startGame-btn, #optionsO-btn, #leaveParty-btn").addClass("hidden");

        setTimeout(() => {
            $("#startGame-btn, #optionsO-btn, #leaveParty-btn").hide();
            $("#plr-list.party, #chat-box.party").hide();
            $(".optionsC, #optionsX-btn").show();
            $("#optionsX-btn").removeClass("hidden");
            $(".partyC .transition-div").removeClass("fill");
        }, 300);
    });

    $("#optionsX-btn").on("click", () => {
        $(".toastify").remove();
        $(".partyC .transition-div").addClass("fill");
        $("#optionsX-btn").addClass("hidden");

        setTimeout(() => {
            $(".optionsC, #optionsX-btn").hide();
            $("#plr-list.party, #chat-box.party").show();
            $("#startGame-btn, #optionsO-btn, #leaveParty-btn")
                .show()
                .removeClass("hidden");
            $(".partyC .transition-div").removeClass("fill");
        }, 300);
    });

    $(".optionsC").on("click", ".increase", (e) => {
        const $num = $(e.currentTarget).siblings(".option-value");
        let value = parseGuess($num.text());
        const max = parseInt($num.data("max"), 10);

        if (value < max) $num.text(formatGuess(value + 1));
        updateButtons($num);
    });

    $(".optionsC").on("click", ".decrease", (e) => {
        const $num = $(e.currentTarget).siblings(".option-value");
        let value = parseGuess($num.text());
        const min = parseInt($num.data("min"), 10);

        if (value > min) $num.text(formatGuess(value - 1));
        updateButtons($num);
    });

    $("#topic-override").on("click", () => {
        $("#topic-override").removeClass("disabled");
        $("#topic-merge").addClass("disabled");
    });

    $("#topic-merge").on("click", () => {
        $("#topic-merge").removeClass("disabled");
        $("#topic-override").addClass("disabled");
    });

    $(".option-value").each((_, el) => updateButtons($(el)));

    // Topic picker
    $(".choose-btn").on("click", (e) => {
        const topic = $(e.currentTarget).text().trim();
        socket.emit("pick_topic", {
            picked_topic: topic,
        });
        $("#topics-list").removeClass("show");
        triggerAnim($("#hint"), "update");
        $("#hint").text(topic);
    });

    $("#returnMain-btn").on("click", async () => {
        const status = await optionToast("ต้องการกลับไปหน้าหลักไม่?", -1);
        if (!status) return;

        const partyCode = $("#codeLabel")
            .text()
            .replace("รหัสเชิญ : ", "")
            .trim()
            .toUpperCase();

        $("#transition-page").addClass("fill");
        $("#customizer").removeClass("active");
        $("#end-page").addClass("disabled");
        $("#startGame-btn, #optionsO-btn, #optionsX-btn, .optionsC").hide();
        resetOptions();

        setTimeout(async () => {
            try {
                const res = await new Promise((resolve) => {
                    socket.emit("leave_party_room", (response) => {
                        resolve(response);
                    });
                });

                if (!res.success) throw new Error(res.error || "Failed to leave party");

                $("#main-page").removeClass("disabled");
                $("#codeLabel").text("รหัสเชิญ : ----");
                $("#plr-list.party .box").empty();
                CLIENT_DATA.loadedPlayers = [];
                CLIENT_DATA.currentParty = null;
                CLIENT_DATA.playerId = null;
            } catch (err) {
                errorToast("เกิดปัญหาในการกลับไปหน้าหลัก!",2500)
                $("#main-page").addClass("disabled");
                $("#end-page").removeClass("disabled");
                $("#codeLabel").text("รหัสเชิญ : " + partyCode);
            } finally {
                $("#transition-page").removeClass("fill");
            }
        }, 500);
    });
}
