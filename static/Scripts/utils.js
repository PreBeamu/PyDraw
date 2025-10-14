// ============================
// UTILITY FUNCTIONS
// ============================

const audioCache = {};
export function playSound(soundName, vol) {
    const soundPaths = {
        'error': '/static/Sounds/Error.mp3',
        'notify': '/static/Sounds/Notify.mp3',
        'countdown': '/static/Sounds/Countdown.mp3',
        'start': '/static/Sounds/Start.mp3',
        'alert': '/static/Sounds/Alert.mp3',
        'master': '/static/Sounds/Master.mp3',
        'status': '/static/Sounds/Status.mp3',
        'end': '/static/Sounds/EndGame.mp3',
        'coin': '/static/Sounds/Coin.mp3',
        'click_1': '/static/Sounds/Click_1.mp3',
        'click_2': '/static/Sounds/Click_2.mp3',
        'click_3': '/static/Sounds/Click_3.mp3',
        'click_4': '/static/Sounds/Click_4.mp3',
        'click_5': '/static/Sounds/Click_5.mp3',
        'click_6': '/static/Sounds/Click_6.mp3',
        'click_7': '/static/Sounds/Click_7.mp3',
        'click_8': '/static/Sounds/Click_8.mp3',
    };
    
    const path = soundPaths[soundName];
    
    if (!path) return;
    
    if (!audioCache[soundName]) {
        audioCache[soundName] = new Audio(path);
    }
    
    const sound = audioCache[soundName];
    sound.volume = vol;
    sound.currentTime = 0;
    sound.play().catch(() => {});
}

export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function nextIndex(current, max) {
    return current >= max ? 1 : current + 1;
}

export function parseGuess(text) {
    if (text === "ปิด") return 0;
    return parseInt(text, 10) || 0;
}

export function formatGuess(value) {
    return value === 0 ? "ปิด" : value;
}

export function resetOptions() {
    $(".option-value").each(function () {
        const $num = $(this);
        const defaultValue = parseInt($num.data("default"), 10);

        $num.text(formatGuess(defaultValue));
        updateButtons($num);
    });
}

export function updateButtons($num) {
    const value = parseGuess($num.text());
    const min = parseInt($num.data("min"), 10);
    const max = parseInt($num.data("max"), 10);

    $num.siblings(".decrease").toggleClass("disabled", value <= min);
    $num.siblings(".increase").toggleClass("disabled", value >= max);
}

export function triggerAnim($el, $class) {
    $el.removeClass($class);
    void $el[0].offsetWidth;
    $el.addClass($class);
}

export function startCountdown(val) {
    let count = val;
    const $countdown = $("#countdown");
    $countdown.addClass("active").text(count);
    triggerAnim($countdown, "spin");
    playSound("countdown", 1);

    const timer = setInterval(() => {
        count--;
        if (count > 0) {
            $countdown.text(count);
            triggerAnim($countdown, "spin");
            playSound("countdown", 1);
        } else {
            clearInterval(timer);
            $countdown.text("!");
            triggerAnim($countdown, "spin");
            playSound("start", 1);
        }
    }, 1000);
}

export function setStatus($icon, status) {
    const $status = $(".canvasC .status");
    const $icons = $(".status img");
    const $statusText = $(".canvasC .status h2");

    $("#cursor-circle").hide();
    $(".toastify").remove();
    $(".status h1").text("");
    clearCanvas()
    if ($icon) {
        if ($icon.is(".alert") || $icon.is(".tag")) {
            playSound("alert", 0.5)
        } else if ($icon.is(".star")) {
            playSound("master", 0.5)
        } else {
            playSound("status", 0.5)
        }
    }
    if ($status.hasClass("show") && status) {
        $status.removeClass("show");
        $icons.removeClass("show");
        $("#plr-list.game").removeClass("cut");
        $("#toolbar").addClass("hidden");
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
    clearCanvas()
}

export function errorToast(text, dur) {
    $(".toastify").remove()
    playSound("error", 0.5)
    Toastify({
        text: `
            <div class="t-error">
                <img class="icon" src="/static/Images/Icons/Error.svg" />
                <p>${text}</p>
            </div>
        `,
        duration: dur,
        position: "center",
        escapeMarkup: false,
        style: {
            background: "transparent",
            boxShadow: "none",
        },
    }).showToast();
}

export function optionToast(text, dur) {
    $(".toastify").remove();
    playSound("notify", 0.5)
    return new Promise((resolve) => {
        Toastify({
            text: `
                <div class="t-container">
                    <div class="t-options">
                        <img class="icon" src="/static/Images/Icons/Prompt.svg" />
                        <p>${text}</p>
                    </div>
                    <div class="t-buttons">
                        <button id="o-btn" style="--btn-color: #51e874ff; --border-color: #15481e">
                            <img class="icon" src="/static/Images/Icons/Check.svg" />
                        </button>
                        <button id="x-btn" style="--btn-color: #ff6868; --border-color: #481515">
                            <img class="icon" src="/static/Images/Icons/Cross.svg" />
                        </button>
                    </div>
                </div>
            `,
            duration: dur,
            position: "center",
            escapeMarkup: false,
            style: {
                background: "transparent",
                boxShadow: "none",
            },
        }).showToast();

        setTimeout(() => {
            $("#o-btn").on("click", function () {
                $(".t-container").addClass("hidden");
                playSound("click_5", 1);
                setTimeout(() => $(".toastify").remove(), 200);
                resolve(true);
            });
            $("#x-btn").on("click", function () {
                $(".t-container").addClass("hidden");
                playSound("click_5", 1);
                setTimeout(() => $(".toastify").remove(), 200);
                resolve(false);
            });
        }, 100);
    });
}

export function clearCanvas() {
    const canvasEl = document.getElementById("game-canvas");
    if (!canvasEl) return;
    const ctx = canvasEl.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
}