// ============================
// UTILITY FUNCTIONS
// ============================

export function playSound(audio, vol) {
    const sound = $(audio)[0];
    if (!sound) return;
    sound.volume = vol
    sound.currentTime = 0;
    sound.play().catch(() => { });
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
    playSound("#count-sound", 1);

    const timer = setInterval(() => {
        count--;
        if (count > 0) {
            $countdown.text(count);
            triggerAnim($countdown, "spin");
            playSound("#count-sound", 1);
        } else {
            clearInterval(timer);
            $countdown.text("!");
            triggerAnim($countdown, "spin");
            playSound("#start-sound", 1);
        }
    }, 1000);
}

export function setStatus($icon, status) {
    const $status = $(".canvasC .status");
    const $icons = $(".status img");
    const $statusText = $(".canvasC .status h2");

    $(".toastify").remove();
    $(".status h1").text("");
    clearCanvas()
    if ($icon) {
        if ($icon.is(".alert") || $icon.is(".tag")) {
            playSound("#alert-sound", 0.5)
        } else if ($icon.is(".star")) {
            playSound("#master-sound", 0.5)
        } else {
            playSound("#status-sound", 0.5)
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
    playSound("#error-sound", 0.5)
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
    playSound("#noti-sound", 0.5)
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
                playSound("#click-sound_5", 1);
                setTimeout(() => $(".toastify").remove(), 200);
                resolve(true);
            });
            $("#x-btn").on("click", function () {
                $(".t-container").addClass("hidden");
                playSound("#click-sound_5", 1);
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