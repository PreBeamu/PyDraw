import { optionToast } from "/static/Scripts/utils.js";

export function initCanvas(socket) {
    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d");

    let drawing = false;
    let last = null;
    let currentColors = "#000000";
    let currentLineWidth = 4;
    let history = [];

    function changeSelected($e) {
        $("#toolbar button").removeClass("selected");
        $e.addClass("selected");
    }

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
            y: (e.clientY - rect.top) * scaleY,
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
    canvas.addEventListener("mousedown", (e) => {
        drawing = true;
        last = getPos(e, canvas);
        history.push(canvas.toDataURL()); // เก็บ snapshot สำหรับ undo
    });

    canvas.addEventListener("mousemove", (e) => {
        if (!drawing) return;
        const pos = getPos(e, canvas);
        drawLine(ctx, last, pos); // วาดเองด้วย
        socket.emit("draw_line", {
            from: last,
            to: pos,
            color: currentColors,
            width: currentLineWidth,
        });
        last = pos;
    });
    canvas.addEventListener("mouseup", () => {
        drawing = false;
    });
    canvas.addEventListener("mouseleave", () => {
        drawing = false;
    });

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // อัปเดตภาพจาก server
    socket.on("draw_line", (data) => {
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.width;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(data.from.x, data.from.y);
        ctx.lineTo(data.to.x, data.to.y);
        ctx.stroke();
    });

    $("#pencil-btn").on("click", function () {
        changeSelected($(this));
    });
    $("#eraser-btn").on("click", function () {
        changeSelected($(this));
    });
    $("#bucket-btn").on("click", function () {
        changeSelected($(this));
    });

    $("#undo-btn").on("click", function () {
        // unduu
    });
    $("#redo-btn").on("click", function () {
        // reduu
    });

    $("#clear-btn").on("click", async function () {
        const status = await optionToast("ต้องการลบรูปวาดทั้งหมดไหม?", -1);
        console.log(status);
    });
}
