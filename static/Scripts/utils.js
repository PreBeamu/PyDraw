// ============================
// UTILITY FUNCTIONS
// ============================

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

    const timer = setInterval(() => {
        count--;
        if (count > 0) {
            $countdown.text(count);
            triggerAnim($countdown, "spin");
        } else {
            clearInterval(timer);
            $countdown.text("!");
            triggerAnim($countdown, "spin");
        }
    }, 1000);
}

export function setStatus($icon, status) {
    const $status = $(".canvasC .status");
    const $icons = $(".status img");
    const $statusText = $(".canvasC .status h2");

    $(".status h1").text("");
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
}