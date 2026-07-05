// ===================== Khởi tạo & biến toàn cục =====================
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const list = document.getElementById('wordList');
const otherList = document.getElementById('otherWordList');
const otherCountEl = document.getElementById('otherCount');
const statusEl = document.getElementById('status');
const debugBtn = document.getElementById('debugBtn');

function setStatus(msg) {
    if (statusEl) statusEl.innerText = msg;
    console.log('[Status]', msg);
}

let scannedWords = [];   // toàn bộ từ Tesseract nhận diện được (kể cả không tô), dùng cho double-click + danh sách phụ
let currentWords = [];   // các từ đang hiển thị trong danh sách chính bên phải
let originalImg = null;
let currentScale = 1.0;
let debugMode = false;

let worker = null;
let ocrReady = false;

// Đổi 'eng' thành 'vie' nếu cần quét văn bản tiếng Việt, hoặc 'eng+vie' để quét cả hai (chậm hơn)
const OCR_LANG = 'eng';

// ===================== Khởi tạo Tesseract worker (1 lần) =====================
async function ensureOcrReady() {
    if (ocrReady) return;
    setStatus('Đang tải model OCR lần đầu...');
    worker = await Tesseract.createWorker(OCR_LANG, 1, {
        logger: (m) => {
            if (m.status && typeof m.progress === 'number') {
                setStatus(`${m.status} (${Math.round(m.progress * 100)}%)`);
            }
        }
    });
    await worker.setParameters({ preserve_interword_spaces: '1' });
    ocrReady = true;
    setStatus('Model đã sẵn sàng.');
}

// ===================== Upload ảnh =====================
document.getElementById('upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            originalImg = img;
            ctx.drawImage(img, 0, 0);

            scannedWords = [];
            currentWords = [];
            list.innerHTML = '';
            otherList.innerHTML = '';
            otherCountEl.innerText = '';
            updateCount();
            setStatus('Đã tải ảnh: ' + file.name);
        };
        img.onerror = () => alert('Không đọc được ảnh này. Vui lòng thử ảnh khác.');
        img.src = event.target.result;
    };
    reader.onerror = () => alert('Lỗi khi đọc file.');
    reader.readAsDataURL(file);
});

// ===================== Vẽ lại canvas + gạch chân + debug =====================
function redrawAll(highlightedWord = null) {
    if (!originalImg) return;
    ctx.drawImage(originalImg, 0, 0);

    if (debugMode && scannedWords.length) {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        scannedWords.forEach(w => {
            if (!w.bbox) return;
            const ok = isHighlighted(w.bbox, imgData);
            ctx.strokeStyle = ok ? 'rgba(0,180,0,0.9)' : 'rgba(150,150,150,0.5)';
            ctx.lineWidth = ok ? 2 : 1;
            ctx.strokeRect(w.bbox.x0, w.bbox.y0, w.bbox.x1 - w.bbox.x0, w.bbox.y1 - w.bbox.y0);
        });
    }

    currentWords.forEach(w => {
        if (w.bbox) {
            const isHighlight = (highlightedWord && w === highlightedWord);
            drawUnderline(w, isHighlight);
        }
    });
}

function drawUnderline(word, isHighlight) {
    ctx.strokeStyle = isHighlight ? 'yellow' : (word.manual ? 'orange' : 'red');
    ctx.lineWidth = isHighlight ? 8 : 4;
    ctx.beginPath();
    ctx.moveTo(word.bbox.x0, word.bbox.y1 + 5);
    ctx.lineTo(word.bbox.x1, word.bbox.y1 + 5);
    ctx.stroke();
}

debugBtn.addEventListener('click', () => {
    debugMode = !debugMode;
    debugBtn.innerText = debugMode ? 'Tắt xem debug màu' : 'Bật xem debug màu';
    redrawAll();
});

// ===================== Tiền xử lý ảnh riêng cho OCR =====================
function buildOcrCanvas() {
    const off = document.createElement('canvas');
    const scaleUp = canvas.width < 1500 ? 1.6 : 1.0;
    off.width = Math.round(canvas.width * scaleUp);
    off.height = Math.round(canvas.height * scaleUp);
    const octx = off.getContext('2d');
    octx.drawImage(canvas, 0, 0, off.width, off.height);

    const imgData = octx.getImageData(0, 0, off.width, off.height);
    const d = imgData.data;

    let min = 255, max = 0;
    for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        if (gray < min) min = gray;
        if (gray > max) max = gray;
    }
    const range = Math.max(1, max - min);

    for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const stretched = ((gray - min) / range) * 255;
        d[i] = d[i + 1] = d[i + 2] = stretched;
    }
    octx.putImageData(imgData, 0, 0);

    return { canvas: off, scale: scaleUp };
}

// ===================== Quét OCR =====================
document.getElementById('scanBtn').addEventListener('click', async () => {
    if (!originalImg) {
        alert('Vui lòng chọn ảnh trước khi quét.');
        return;
    }

    setStatus('Đang quét, vui lòng chờ...');
    try {
        await ensureOcrReady();

        const { canvas: ocrCanvas, scale } = buildOcrCanvas();
        const { data } = await worker.recognize(ocrCanvas);

        currentWords = currentWords.filter(w => w.manual);
        document.querySelectorAll('#wordList li').forEach(li => {
            if (li.dataset.manual !== 'true') li.remove();
        });

        scannedWords = [];
        otherList.innerHTML = '';
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let addedCount = 0;
        let otherCount = 0;

        (data.words || []).forEach(w => {
            if (!w.text || !w.text.trim()) return;
            const bbox = {
                x0: w.bbox.x0 / scale,
                y0: w.bbox.y0 / scale,
                x1: w.bbox.x1 / scale,
                y1: w.bbox.y1 / scale
            };
            const wordObj = { text: w.text, bbox };
            scannedWords.push(wordObj);

            if (isHighlighted(bbox, imgData)) {
                addToList(wordObj, false);
                addedCount++;
            } else {
                addToOtherList(wordObj);
                otherCount++;
            }
        });

        otherCountEl.innerText = otherCount ? `(${otherCount})` : '';
        setStatus(`Quét xong. Tự động thêm ${addedCount} từ. Còn ${otherCount} từ khác có thể bấm thêm ở mục "Từ khác được nhận diện".`);
        if (currentWords.length === 0) {
            list.innerHTML = 'Không tìm thấy từ nào được bôi highlight xanh.';
        }
        redrawAll();
    } catch (err) {
        console.error(err);
        setStatus('Có lỗi khi quét.');
        alert('Có lỗi khi quét: ' + err.message);
    }
});

// ===================== Danh sách từ vựng chính =====================
function addToList(word, isManual) {
    const newWord = { ...word, manual: isManual, id: Date.now() + Math.random() };
    currentWords.push(newWord);
    redrawAll();
    updateCount();

    const li = document.createElement('li');
    li.className = 'word-item';
    li.dataset.manual = isManual ? 'true' : 'false';
    li.onmouseover = () => redrawAll(newWord);
    li.onmouseout = () => redrawAll();
    li.innerHTML = `
        <input type="text" value="${newWord.text}">
        <button style="background:#e74c3c" onclick="removeWord(${newWord.id}, this)">×</button>
    `;
    list.appendChild(li);
    return newWord;
}

function removeWord(id, btn) {
    currentWords = currentWords.filter(w => w.id !== id);
    btn.parentElement.remove();
    redrawAll();
    updateCount();
}

function addManualWord() {
    const input = document.getElementById('newWordInput');
    if (!input.value) return;
    addToList({ text: input.value, bbox: null }, true);
    input.value = '';
}

// ===================== Danh sách "Từ khác được nhận diện" =====================
function addToOtherList(word) {
    const li = document.createElement('li');
    li.className = 'other-word-item';
    li.textContent = word.text;
    li.onmouseover = () => redrawAll(word);
    li.onmouseout = () => redrawAll();
    li.onclick = () => {
        if (li.classList.contains('added')) return;
        addToList(word, true);
        li.classList.add('added');
    };
    otherList.appendChild(li);
}

// ===================== Double-click để thêm từ thủ công từ ảnh =====================
canvas.addEventListener('dblclick', (e) => {
    if (!originalImg) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    const TOLERANCE = 8;

    let best = null;
    let bestArea = Infinity;
    scannedWords.forEach(w => {
        if (!w.bbox) return;
        const b = w.bbox;
        if (x >= b.x0 - TOLERANCE && x <= b.x1 + TOLERANCE &&
            y >= b.y0 - TOLERANCE && y <= b.y1 + TOLERANCE) {
            const area = (b.x1 - b.x0) * (b.y1 - b.y0);
            if (area < bestArea) {
                bestArea = area;
                best = w;
            }
        }
    });

    if (best) {
        addToList(best, true);
    } else {
        setStatus('Không tìm thấy từ tại vị trí này (thử click gần giữa từ hơn).');
    }
});

// ===================== Kiểm tra vùng highlight (hue-based, có đệm bbox) =====================
function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            default: h = (r - g) / d + 4;
        }
        h *= 60;
    }
    return [h, s, l];
}

function isHighlightPixel(r, g, b) {
    const [h, s, l] = rgbToHsl(r, g, b);
    // Nới rộng khoảng hue (vàng -> vàng-xanh -> xanh lá) và hạ ngưỡng bão hoà/độ sáng
    // để bắt được cả highlighter nhạt màu do ảnh chụp thiếu sáng hoặc marker mờ
    return h >= 35 && h <= 170 && s >= 0.15 && l >= 0.45 && l <= 0.97;
}

function isHighlighted(bbox, data) {
    // Đệm thêm quanh bbox: highlighter thường phủ rộng hơn khung chữ Tesseract nhận diện,
    // đặc biệt phía trên/dưới (do nét highlighter kéo dài qua phần đầu/chân chữ)
    const w = bbox.x1 - bbox.x0;
    const h = bbox.y1 - bbox.y0;
    const padX = w * 0.08;
    const padY = h * 0.35;

    const y0 = Math.max(0, Math.floor(bbox.y0 - padY));
    const y1 = Math.min(canvas.height, Math.ceil(bbox.y1 + padY));
    const x0 = Math.max(0, Math.floor(bbox.x0 - padX));
    const x1 = Math.min(canvas.width, Math.ceil(bbox.x1 + padX));

    let hit = 0, total = 0;
    const step = 2;

    for (let y = y0; y < y1; y += step) {
        for (let x = x0; x < x1; x += step) {
            const i = (y * canvas.width + x) * 4;
            if (isHighlightPixel(data[i], data[i + 1], data[i + 2])) hit++;
            total++;
        }
    }
    if (total === 0) return false;
    return (hit / total) > 0.08;
}

// ===================== Copy danh sách =====================
function copyWordList() {
    const inputs = document.querySelectorAll('#wordList input');
    const textToCopy = Array.from(inputs).map(input => input.value.trim()).filter(Boolean).join('\n');

    if (!textToCopy) {
        alert('Danh sách đang trống!');
        return;
    }

    navigator.clipboard.writeText(textToCopy).then(() => {
        alert('Đã copy toàn bộ ' + inputs.length + ' từ vựng thành công!');
    }).catch(err => {
        console.error('Lỗi khi copy: ', err);
        alert('Không copy được, vui lòng thử lại.');
    });
}

function updateCount() {
    document.getElementById('wordCount').innerText = `Tổng số từ: ${currentWords.length}`;
}

function changeZoom(delta) {
    currentScale += delta;
    if (currentScale < 0.2) currentScale = 0.2;
    if (currentScale > 3.0) currentScale = 3.0;
    canvas.style.transform = `scale(${currentScale})`;
}
