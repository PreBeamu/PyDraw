import {
    optionToast,
    clearCanvas,
    playSound,
} from "/static/Scripts/utils.js";
import { CLIENT_DATA } from '/static/Scripts/clientData.js';

export function initCanvas(socket) {
    const $canvas = $("#game-canvas");
    const canvas = $canvas[0];
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const canvasData = CLIENT_DATA.canvasData;

    // Create cursor circle element
    const $cursorCircle = $('<div id="cursor-circle"></div>');
    $cursorCircle.css({
        position: 'fixed',
        border: '2px solid rgba(0, 0, 0, 0.8)',
        borderRadius: '50%',
        pointerEvents: 'none',
        display: 'none',
        transform: 'translate(-50%, -50%)',
        zIndex: 10000,
        boxShadow: 'inset 0 0 0 2px rgba(255, 255, 255, 0.8)'
    });
    $('body').append($cursorCircle);

    function updateCursorSize() {
        const size = canvasData.thickness;
        $cursorCircle.css({
            width: size + 'px',
            height: size + 'px'
        });
    }

    function updateCursorPosition(e) {
        let clientX, clientY;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        $cursorCircle.css({
            left: clientX + 'px',
            top: clientY + 'px',
            display: 'block'
        });
    }

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

    function drawLine(ctx, p1, p2, color, width, isErasing = false) {
        ctx.imageSmoothingEnabled = false;
        if (isErasing) {
            ctx.globalCompositeOperation = "destination-out";
            ctx.strokeStyle = "rgba(0,0,0,1)";
        } else {
            ctx.globalCompositeOperation = "source-over";
            ctx.strokeStyle = color;
        }
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
    }

    // Mouse events
    function startDrawing(e) {
        if (canvasData.mode === "Bucket") return;
        if (e.cancelable) e.preventDefault();

        canvasData.lastPos = getPos(e, canvas);
        canvasData.histories.undo.push(canvas.toDataURL());
        canvasData.histories.redo = [];
    }

    function moveDrawing(e) {
        if (canvasData.mode === "Bucket") return;
        if (e.cancelable) e.preventDefault();
        if (!canvasData.lastPos) return;
        if (!canvasData.isDrawer) return;

        const pos = getPos(e, canvas);
        const isErasing = canvasData.mode === "Erase";
        const currentColor = isErasing ? "#000000" : canvasData.color;

        drawLine(ctx, canvasData.lastPos, pos, currentColor, canvasData.thickness, isErasing);
        socket.emit("draw_line", {
            from: canvasData.lastPos,
            to: pos,
            color: currentColor,
            width: canvasData.thickness,
            erase: isErasing
        });
        canvasData.lastPos = pos;
    }

    function upDrawing(e) {
        canvasData.lastPos = null;
    }

    function leaveDrawing(e) {
        canvasData.lastPos = null;
    }

    // Computer
    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", (e) => {
        updateCursorPosition(e);
        moveDrawing(e);
        if (canvasData.isDrawer) {
            $canvas.css('cursor', 'none');
        } else {
            $canvas.css('cursor', 'unset');
            $cursorCircle.hide();
        }
    });
    document.addEventListener("mouseup", upDrawing);
    canvas.addEventListener("mouseleave", () => {
        if (canvasData.isDrawer) {
            $cursorCircle.hide();
        }
    });
    canvas.addEventListener("mouseenter", () => {
        if (canvasData.isDrawer) {
            $cursorCircle.show();
        } else {
            $cursorCircle.hide();
        }
        updateCursorSize();
    });

    // Mobile
    canvas.addEventListener("touchstart", startDrawing, { passive: false });
    canvas.addEventListener("touchmove", (e) => {
        updateCursorPosition(e);
        moveDrawing(e);
    }, { passive: false });
    canvas.addEventListener("touchend", upDrawing);
    canvas.addEventListener("touchcancel", leaveDrawing);

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

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

        // Increased tolerance for better edge coverage
        const tolerance = 50;
        function matchesTarget(i) {
            return Math.abs(data[i] - targetColor[0]) <= tolerance &&
                Math.abs(data[i + 1] - targetColor[1]) <= tolerance &&
                Math.abs(data[i + 2] - targetColor[2]) <= tolerance &&
                Math.abs(data[i + 3] - targetColor[3]) <= tolerance;
        }

        const stack = [[Math.floor(x), Math.floor(y)]];
        const visited = new Set();
        const toFill = [];

        // First pass: identify pixels to fill
        while (stack.length) {
            const [cx, cy] = stack.pop();
            const key = `${cx},${cy}`;

            if (visited.has(key)) continue;
            if (cx < 0 || cy < 0 || cx >= canvasWidth || cy >= canvasHeight) continue;

            const i = (cy * canvasWidth + cx) * 4;

            if (matchesTarget(i)) {
                visited.add(key);
                toFill.push([cx, cy, i]);

                stack.push([cx + 1, cy]);
                stack.push([cx - 1, cy]);
                stack.push([cx, cy + 1]);
                stack.push([cx, cy - 1]);
            }
        }

        // Second pass: fill identified pixels and expand edges slightly
        const expanded = new Set();
        for (const [cx, cy, i] of toFill) {
            data[i] = fillColorArr[0];
            data[i + 1] = fillColorArr[1];
            data[i + 2] = fillColorArr[2];
            data[i + 3] = fillColorArr[3];

            // Fill neighboring pixels to close gaps (expand by 1 pixel at edges)
            const neighbors = [
                [cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1],
                [cx + 1, cy + 1], [cx - 1, cy - 1], [cx + 1, cy - 1], [cx - 1, cy + 1]
            ];

            for (const [nx, ny] of neighbors) {
                if (nx >= 0 && ny >= 0 && nx < canvasWidth && ny < canvasHeight) {
                    const key = `${nx},${ny}`;

                    // Fill edge pixels unconditionally to eliminate gaps
                    if (!visited.has(key) && !expanded.has(key)) {
                        expanded.add(key);
                        const ni = (ny * canvasWidth + nx) * 4;
                        data[ni] = fillColorArr[0];
                        data[ni + 1] = fillColorArr[1];
                        data[ni + 2] = fillColorArr[2];
                        data[ni + 3] = fillColorArr[3];
                    }
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }

    canvas.addEventListener("click", e => {
        if (canvasData.mode !== "Bucket") return;
        if (!canvasData.isDrawer) return;
        const pos = getPos(e, canvas);
        canvasData.histories.undo.push(canvas.toDataURL());
        canvasData.histories.redo = [];
        floodFill(ctx, pos.x, pos.y, canvasData.color);
        socket.emit("draw_line", { block: "block", image: canvas.toDataURL() });
    });

    socket.on("draw_line", (data) => {
        if (data.block) {
            const img = new Image();
            img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            img.src = data.image;
        } else if (data.undo) {
            const img = new Image();
            img.onload = () => {
                clearCanvas();
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = data.image;
        } else {
            drawLine(ctx, data.from, data.to, data.color, data.width, data.erase || false);
        }
    });

    $("#pencil-btn").on("click", function (e) {
        changeSelected($(this));
        canvasData.mode = "Draw";
        playSound("click_6", 0.25);
    });

    $("#eraser-btn").on("click", function (e) {
        changeSelected($(this));
        canvasData.mode = "Erase";
        playSound("click_6", 0.25);
    });

    $("#bucket-btn").on("click", function (e) {
        changeSelected($(this));
        canvasData.mode = "Bucket";
        playSound("click_6", 0.25);
    });

    $("#thickness").on("change", function (e) {
        canvasData.thickness = parseInt(e.target.value);
        updateCursorSize();
    });

    $("#color-picker").on("change", function (e) {
        canvasData.color = e.target.value;
    });

    $("#undo-btn").on("click", () => {
        if (!canvasData.isDrawer) return;
        if (canvasData.histories.undo.length > 0) {
            const lastImage = canvasData.histories.undo.pop();
            canvasData.histories.redo.push(canvas.toDataURL());
            const img = new Image();
            img.onload = () => {
                clearCanvas();
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                socket.emit("draw_line", { undo: "undo", image: canvas.toDataURL() });
            };
            img.src = lastImage;
        }
        playSound("click_6", 0.25);
    });

    $("#redo-btn").on("click", () => {
        if (!canvasData.isDrawer) return;
        if (canvasData.histories.redo.length > 0) {
            const redoImage = canvasData.histories.redo.pop();
            canvasData.histories.undo.push(canvas.toDataURL());
            const img = new Image();
            img.onload = () => {
                clearCanvas();
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                socket.emit("draw_line", { undo: "redo", image: canvas.toDataURL() });
            };
            img.src = redoImage;
        }
        playSound("click_6", 0.25);
    });

    $("#clear-btn").on("click", async function () {
        playSound("click_2", 0.15);
        const status = await optionToast("ต้องการลบรูปวาดทั้งหมดไหม?", -1);
        if (!canvasData.isDrawer) return;
        if (status) {
            canvasData.histories.undo.push(canvas.toDataURL());
            canvasData.histories.redo = [];
            clearCanvas();
            socket.emit("draw_line", { undo: "undo", image: canvas.toDataURL() });
        }
    });

    // Initialize UI with current state
    $("#color-picker").val(canvasData.color);
    $("#thickness").val(canvasData.thickness);
    updateCursorSize();
}