const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const list = document.getElementById('wordList');
let scannedWords = []; 
let currentWords = [];
let originalImg = null;

document.getElementById('upload').addEventListener('change', (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            originalImg = img;
            ctx.drawImage(img, 0, 0);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(e.target.files[0]);
});

function redrawAll(highlightedWord = null) {
    if (!originalImg) return;
    ctx.drawImage(originalImg, 0, 0);
    currentWords.forEach(w => {
        const isHighlight = (highlightedWord && w === highlightedWord);
        drawUnderline(w, isHighlight);
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

document.getElementById('scanBtn').addEventListener('click', async () => {
    list.innerHTML = 'Đang quét...';
    const { data: { words } } = await Tesseract.recognize(canvas, 'eng');
    scannedWords = words;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    words.forEach(w => {
        if (isHighlighted(w.bbox, data)) addToList(w, false);
    });
});

function addToList(word, isManual) {
    word.manual = isManual;
    word.id = Date.now() + Math.random();
    currentWords.push(word);
    redrawAll();

    const li = document.createElement('li');
    li.className = 'word-item';
    li.onmouseover = () => redrawAll(word);
    li.onmouseout = () => redrawAll();
    li.innerHTML = `
        <input type="text" value="${word.text}">
        <button style="background:#e74c3c" onclick="removeWord(${word.id}, this)">×</button>
    `;
    list.appendChild(li);
}

function removeWord(id, btn) {
    currentWords = currentWords.filter(w => w.id !== id);
    btn.parentElement.remove();
    redrawAll();
}

function addManualWord() {
    const input = document.getElementById('newWordInput');
    if (!input.value) return;
    addToList({text: input.value, bbox: {x0:0, y0:0, x1:0, y1:0}}, true);
    input.value = '';
}

canvas.addEventListener('dblclick', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const found = scannedWords.find(w => x >= w.bbox.x0 && x <= w.bbox.x1 && y >= w.bbox.y0 && y <= w.bbox.y1);
    if (found) addToList(found, true);
});

function isHighlighted(bbox, data) {
    let yellow = 0, total = 0;
    for (let y = bbox.y0; y < bbox.y1; y += 4) {
        for (let x = bbox.x0; x < bbox.x1; x += 4) {
            const i = (y * canvas.width + x) * 4;
            if (data[i] > 180 && data[i+1] > 180 && data[i+2] < 150) yellow++;
            total++;
        }
    }
    return (yellow / total) > 0.15;
}

function copyWordList() {
    const inputs = document.querySelectorAll('#wordList input');
    let textToCopy = "";

    inputs.forEach(input => {
        textToCopy += input.value + "\n"; // Mỗi từ một dòng
    });

    if (textToCopy === "") {
        alert("Danh sách đang trống!");
        return;
    }

    // Sử dụng Clipboard API để copy vào bộ nhớ đệm
    navigator.clipboard.writeText(textToCopy).then(() => {
        alert("Đã copy danh sách từ vựng thành công!");
    }).catch(err => {
        console.error("Lỗi khi copy: ", err);
    });
}

let currentScale = 1.0; // Tỉ lệ zoom mặc định

function changeZoom(delta) {
    currentScale += delta;
    if (currentScale < 0.2) currentScale = 0.2; // Giới hạn nhỏ nhất
    if (currentScale > 3.0) currentScale = 3.0; // Giới hạn lớn nhất
    
    const canvas = document.getElementById('canvas');
    canvas.style.transform = `scale(${currentScale})`;
    
    // Lưu ý: Tọa độ chuột khi dblclick cần chia cho currentScale
    // Cập nhật lại logic trong dblclick:
    // const x = (e.offsetX) / currentScale;
    // const y = (e.offsetY) / currentScale;
}