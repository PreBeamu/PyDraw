import { optionToast } from "/static/Scripts/utils.js";

export function initCanvas(socket) {
    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    let drawing = false;
    let ereaser = false;
    let last = null;
    let currentColors = "#000000";
    let currentLineWidth = 5;
    let history = [];
    let rehistory = [];
    let bucketMode = false;

    let drawingEnabled = true;

    function changeSelected($e) {
        $("#toolbar button").removeClass("selected");
        $e.addClass("selected");
    }

    function resizeCanvas() {
        const parent = canvas.parentElement;

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

        let clientX, clientY;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
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

    // computer
    canvas.addEventListener("mousedown", startDrawing)
    canvas.addEventListener("mousemove", moveDrawing)
    canvas.addEventListener("mouseup", upDrawing)
    canvas.addEventListener("mouseleave", leaveDrawing)

    // mobile
    canvas.addEventListener("touchstart", startDrawing, { passive: false })
    canvas.addEventListener("touchmove", moveDrawing, { passive: false })
    canvas.addEventListener("touchend", upDrawing)
    canvas.addEventListener("touchcancel", leaveDrawing)


    // Mouse events
    function startDrawing(e) {
        if (bucketMode) { return }
        if (e.cancelable) e.preventDefault()
        const color = document.getElementById('color-picker')
        currentColors = ereaser ? "#ffffff" : color.value;
        drawing = true
        last = getPos(e, canvas)
        history.push(canvas.toDataURL())
    }

    function moveDrawing(e) {
        if (bucketMode) { return }
        if (e.cancelable) e.preventDefault()
        if (!drawing) return;
        const pos = getPos(e, canvas)
        drawLine(ctx, last, pos)
        socket.emit("draw_line", {
            from: last,
            to: pos,
            color: currentColors,
            width: currentLineWidth
        });
        last = pos;
    };

    function upDrawing(e) {
        drawing = false;
    };
    function leaveDrawing(e) {
        drawing = false;
    };

    window.addEventListener("resize", resizeCanvas)
    resizeCanvas()


    function floodFill(ctx, x, y, fillColor) {
        const canvasWidth = ctx.canvas.width;
        const canvasHeight = ctx.canvas.height;
        const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
        const data = imageData.data;

        const idx = (Math.floor(y) * canvasWidth + Math.floor(x)) * 4;
        const targetColor = [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];

        const fillColorArr = [
            parseInt(fillColor.slice(1, 3), 16),
            parseInt(fillColor.slice(3, 5), 16),
            parseInt(fillColor.slice(5, 7), 16),
            255
        ];

        if (targetColor.toString() === fillColorArr.toString()) return;

        const stack = [[Math.floor(x), Math.floor(y)]];

        while (stack.length) {
            const [cx, cy] = stack.pop();
            const i = (cy * canvasWidth + cx) * 4;
            if (
                cx >= 0 && cy >= 0 && cx < canvasWidth && cy < canvasHeight &&
                data[i] === targetColor[0] &&
                data[i + 1] === targetColor[1] &&
                data[i + 2] === targetColor[2] &&
                data[i + 3] === targetColor[3]
            ) {
                data[i] = fillColorArr[0];
                data[i + 1] = fillColorArr[1];
                data[i + 2] = fillColorArr[2];
                data[i + 3] = fillColorArr[3];

                stack.push([cx + 1, cy]);
                stack.push([cx - 1, cy]);
                stack.push([cx, cy + 1]);
                stack.push([cx, cy - 1]);
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }

    canvas.addEventListener("click", e => {
        if (!bucketMode) return;
        const pos = getPos(e, canvas);
        history.push(canvas.toDataURL());
        floodFill(ctx, pos.x, pos.y, currentColors);
        socket.emit("draw_line", { block: "block", image: canvas.toDataURL() });
    });


    socket.on("draw_line", (data) => {
        if (data.block) {
            const img = new Image()
            img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            img.src = data.image
        } else if (data.undo) {
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = data.image;
        } else {
            ctx.strokeStyle = data.color
            ctx.lineWidth = data.width
            ctx.lineCap = "round"
            ctx.beginPath()
            ctx.moveTo(data.from.x, data.from.y)
            ctx.lineTo(data.to.x, data.to.y)
            ctx.stroke()
        }
    });


    $("#pencil-btn").on("click", function (e) {
        changeSelected($(this));
        bucketMode = false
        ereaser = false
    });
    $("#eraser-btn").on("click", function (e) {
        changeSelected($(this));
        bucketMode = false
        ereaser = true
    });
    $("#bucket-btn").on("click", function (e) {
        changeSelected($(this));
        bucketMode = true
    });
    $("#thickness").on("change", function (e) {
        changeSelected($(this));
        currentLineWidth = e.target.value

    });
    $("#color-picker").on("change", function (e) {
        changeSelected($(this));
        currentColors = e.target.value
    });

    $("#undo-btn").on("click", () => {
        if (history.length > 0) {
            const lastImage = history.pop()
            rehistory.push(canvas.toDataURL())
            const img = new Image()
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height)
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
                socket.emit("draw_line", { undo: "undo", image: canvas.toDataURL() })
            };
            img.src = lastImage
        }
    });
    $("#redo-btn").on("click", () => {
    if (rehistory.length > 0) {
        const redoImage = rehistory.pop()
        history.push(canvas.toDataURL())
        const img = new Image()
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            socket.emit("draw_line", { undo: "redo", image: canvas.toDataURL() })
        };
        img.src = redoImage
    }
});
    $("#clear-btn").on("click", async function () {
        const status = await optionToast("ต้องการลบรูปวาดทั้งหมดไหม?", -1);
        if (status) {
            history.push(canvas.toDataURL());
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            socket.emit("draw_line", { undo: "undo", image: canvas.toDataURL() })
        }
    });
}
