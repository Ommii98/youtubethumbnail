// app.js - Core functionality for ThumbCraft thumbnail editor
// This script provides a lightweight, fast implementation focusing on essential features:
// • Upload background image or set solid/gradient background
// • Add text elements (title, subtitle) with drag, edit, style controls
// • Add emoji stickers
// • Export canvas as PNG

const canvas = document.getElementById('thumbCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('elementsOverlay');

let bgImage = null;
let bgMode = 'solid'; // 'solid', 'gradient', 'image'
let solidColor = '#ffffff';
let gradientColors = ['#FF416C', '#7B2FFF'];
let gradientAngle = 135;
let overlayOpacity = 0.3;

// Element storage
let elements = [];
let selectedEl = null;

// Utility functions
function degToRad(d) { return d * Math.PI / 180; }
function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (bgMode === 'image' && bgImage) {
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
  } else if (bgMode === 'solid') {
    ctx.fillStyle = solidColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (bgMode === 'gradient') {
    const rad = degToRad(gradientAngle);
    const x = Math.cos(rad) * canvas.width;
    const y = Math.sin(rad) * canvas.height;
    const grad = ctx.createLinearGradient(0, 0, x, y);
    grad.addColorStop(0, gradientColors[0]);
    grad.addColorStop(1, gradientColors[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  // dark overlay for readability
  ctx.fillStyle = `rgba(0,0,0,${overlayOpacity / 100})`;
  ctx.fillRect(0,0,canvas.width,canvas.height);
}

function renderElements() {
  elements.forEach(el => {
    if (el.type === 'text') {
      ctx.save();
      ctx.globalAlpha = el.opacity / 100;
      ctx.translate(el.x, el.y);
      ctx.rotate(degToRad(el.rotation));
      ctx.textAlign = el.align;
      ctx.fillStyle = el.color;
      ctx.font = `${el.fontSize}px ${el.fontFamily}`;
      if (el.stroke) {
        ctx.lineWidth = el.strokeWidth;
        ctx.strokeStyle = el.strokeColor;
        ctx.strokeText(el.text, 0, 0);
      }
      ctx.fillText(el.text, 0, 0);
      ctx.restore();
    } else if (el.type === 'emoji') {
      ctx.save();
      ctx.globalAlpha = el.opacity / 100;
      ctx.translate(el.x, el.y);
      ctx.rotate(degToRad(el.rotation));
      ctx.font = `${el.size}px serif`;
      ctx.fillText(el.emoji, 0, 0);
      ctx.restore();
    } else if (el.type === 'shape') {
      ctx.save();
      ctx.globalAlpha = el.opacity / 100;
      ctx.translate(el.x, el.y);
      ctx.rotate(degToRad(el.rotation));
      ctx.fillStyle = el.color;
      if (el.shapeType === 'rect') {
        ctx.fillRect(-el.width/2, -el.height/2, el.width, el.height);
      } else if (el.shapeType === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, el.radius, 0, 2 * Math.PI);
        ctx.fill();
      } else if (el.shapeType === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(0, -el.height/2);
        ctx.lineTo(el.width/2, el.height/2);
        ctx.lineTo(-el.width/2, el.height/2);
        ctx.closePath();
        ctx.fill();
      } else if (el.shapeType === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(-el.width/2, -el.height/4);
        ctx.lineTo(el.width/4, -el.height/4);
        ctx.lineTo(el.width/4, -el.height/2);
        ctx.lineTo(el.width/2, 0);
        ctx.lineTo(el.width/4, el.height/2);
        ctx.lineTo(el.width/4, el.height/4);
        ctx.lineTo(-el.width/2, el.height/4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    } else if (el.type === 'image') {
      ctx.save();
      ctx.globalAlpha = el.opacity / 100;
      ctx.translate(el.x, el.y);
      ctx.rotate(degToRad(el.rotation));
      ctx.drawImage(el.img, -el.width/2, -el.height/2, el.width, el.height);
      ctx.restore();
    }
  });
}

function redraw() {
  drawBackground();
  renderElements();
}

// Background handlers
// Trigger hidden file input when Upload Image button is clicked
document.getElementById('btnUploadBg').addEventListener('click', () => {
  document.getElementById('bgUpload').click();
});

// Background image upload handler
document.getElementById('bgUpload').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  if (file.type.startsWith('video/')) {
    // Video handling: capture multiple frames as thumbnail choices
    const video = document.createElement('video');
    video.src = url;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    
    document.getElementById('videoFramesSection').style.display = 'block';
    const list = document.getElementById('videoFramesList');
    list.innerHTML = '<span style="font-size:12px;color:#666;">Analyzing video...</span>';
    
    video.addEventListener('loadeddata', async () => {
      list.innerHTML = '';
      const duration = video.duration || 1;
      // Seek points at 10%, 30%, 50%, 70%, 90%
      const seekPoints = [0.1, 0.3, 0.5, 0.7, 0.9].map(p => p * duration);
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
      const w = video.videoWidth * scale;
      const h = video.videoHeight * scale;
      const x = (canvas.width - w) / 2;
      const y = (canvas.height - h) / 2;

      for (let i = 0; i < seekPoints.length; i++) {
        await new Promise((resolve) => {
          video.currentTime = seekPoints[i];
          video.addEventListener('seeked', function onSeeked() {
            video.removeEventListener('seeked', onSeeked);
            tempCtx.fillStyle = '#000';
            tempCtx.fillRect(0,0,tempCanvas.width,tempCanvas.height);
            tempCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, x, y, w, h);
            
            const imgUrl = tempCanvas.toDataURL('image/png');
            const imgEl = document.createElement('img');
            imgEl.src = imgUrl;
            imgEl.style.width = '100%';
            imgEl.style.cursor = 'pointer';
            imgEl.style.border = '2px solid transparent';
            imgEl.style.borderRadius = '4px';
            
            imgEl.onclick = () => {
              const bgImg = new Image();
              bgImg.onload = () => {
                bgImage = bgImg;
                bgMode = 'image';
                redraw();
                saveState();
              };
              bgImg.src = imgUrl;
            };
            
            list.appendChild(imgEl);
            resolve();
          });
        });
      }
      
      // Auto select the first frame (50% mark usually better, let's just pick index 2 (50%))
      if (list.children.length > 2) {
        list.children[2].click();
      } else if (list.children.length > 0) {
        list.children[0].click();
      }
      
      URL.revokeObjectURL(url);
    });
    video.load();
  } else {
    // Image handling (existing logic)
    const img = new Image();
    img.onload = () => {
      bgImage = img;
      bgMode = 'image';
      redraw();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }
});

document.getElementById('btnSolidBg').addEventListener('click', () => {
  bgMode = 'solid';
  redraw();
});

document.getElementById('bgColor').addEventListener('input', e => {
  solidColor = e.target.value;
  if (bgMode === 'solid') redraw();
});

document.getElementById('btnGradientBg').addEventListener('click', () => {
  bgMode = 'gradient';
  redraw();
});

['gradColor1','gradColor2','gradAngle'].forEach(id => {
  document.getElementById(id).addEventListener('input', e => {
    if (id === 'gradColor1') gradientColors[0] = e.target.value;
    if (id === 'gradColor2') gradientColors[1] = e.target.value;
    if (id === 'gradAngle') gradientAngle = parseInt(e.target.value);
    document.getElementById('gradAngleVal').textContent = `${gradientAngle}°`;
    if (bgMode === 'gradient') redraw();
  });
});

document.getElementById('overlayOpacity').addEventListener('input', e => {
  overlayOpacity = parseInt(e.target.value);
  document.getElementById('overlayVal').textContent = `${overlayOpacity}%`;
  redraw();
});

// YouTube Fetch
function getYTId(url) {
  const reg = /(?:youtube\.com\/.*(?:v=|\/embed\/|\/shorts\/)|youtu\.be\/)([\w-]{11})/;
  const match = url.match(reg);
  return match ? match[1] : null;
}

function buildYTThumbs(id) {
  const sizes = ['default','mqdefault','hqdefault','sddefault','maxresdefault'];
  return sizes.map(s => `https://img.youtube.com/vi/${id}/${s}.jpg`);
}

document.getElementById('btnFetchYT').addEventListener('click', () => {
  const url = document.getElementById('ytUrlInput').value.trim();
  const vid = getYTId(url);
  if (!vid) {
    alert('Invalid YouTube URL');
    return;
  }
  const thumbs = buildYTThumbs(vid);
  const container = document.getElementById('ytThumbContainer');
  container.innerHTML = '';
  thumbs.forEach(src => {
    const img = document.createElement('img');
    img.src = src;
    img.className = 'yt-thumb';
    img.title = src;
    img.style.width = '80px';
    img.style.height = '45px';
    img.style.margin = '4px';
    img.style.cursor = 'pointer';
    img.addEventListener('click', () => {
      const bgImg = new Image();
      bgImg.crossOrigin = "Anonymous"; // Crucial for canvas export with external images
      bgImg.onload = () => {
        bgImage = bgImg;
        bgMode = 'image';
        redraw();
      };
      bgImg.src = src;
    });
    container.appendChild(img);
  });
  container.classList.remove('hidden');
});


// Text addition
function addText(defaultText) {
  const el = {
    type: 'text',
    text: defaultText,
    x: canvas.width / 2,
    y: canvas.height / 2,
    fontSize: 72,
    fontFamily: 'Outfit',
    color: '#ffffff',
    align: 'center',
    rotation: 0,
    opacity: 100,
    stroke: false,
    strokeWidth: 3,
    strokeColor: '#000000'
  };
  elements.push(el);
  selectElement(el);
  redraw();
}

document.getElementById('btnAddTitle').addEventListener('click', () => addText('Title Here'));

document.getElementById('btnAddSubtitle').addEventListener('click', () => addText('Subtitle'));

// Sticker handling
function addEmoji(emoji) {
  const el = {
    type: 'emoji',
    emoji,
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 80,
    rotation: 0,
    opacity: 100
  };
  elements.push(el);
  selectElement(el);
  redraw();
}

document.querySelectorAll('.sticker-btn').forEach(btn => {
  btn.addEventListener('click', () => addEmoji(btn.dataset.emoji));
});

// History & Actions
let history = [];
let historyIndex = -1;

function saveState() {
  history = history.slice(0, historyIndex + 1);
  history.push({
    bgImage: bgImage ? bgImage.src : null,
    bgMode, solidColor, gradientColors: [...gradientColors], gradientAngle, overlayOpacity,
    elements: JSON.parse(JSON.stringify(elements))
  });
  historyIndex++;
}

document.getElementById('btnUndo').addEventListener('click', () => {
  if (historyIndex > 0) {
    historyIndex--;
    loadState(history[historyIndex]);
  }
});
document.getElementById('btnRedo').addEventListener('click', () => {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    loadState(history[historyIndex]);
  }
});

function loadState(state) {
  bgMode = state.bgMode;
  solidColor = state.solidColor;
  gradientColors = [...state.gradientColors];
  gradientAngle = state.gradientAngle;
  overlayOpacity = state.overlayOpacity;
  elements = JSON.parse(JSON.stringify(state.elements));
  if (state.bgImage) {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => { bgImage = img; redraw(); };
    img.src = state.bgImage;
  } else {
    bgImage = null;
    redraw();
  }
}

document.getElementById('btnClear').addEventListener('click', () => {
  elements = [];
  selectedEl = null;
  updatePropertiesPanel();
  saveState();
  redraw();
});

// Badges
document.getElementById('btnAddBadge').addEventListener('click', () => {
  addText('NEW VIDEO');
  const lastEl = elements[elements.length - 1];
  lastEl.fontSize = 40;
  lastEl.fontFamily = 'Impact';
  lastEl.color = '#FF416C';
  lastEl.stroke = true;
  lastEl.strokeColor = '#FFFFFF';
  lastEl.strokeWidth = 6;
  redraw();
  saveState();
});

// Shapes
function addShape(shapeType) {
  const el = {
    type: 'shape',
    shapeType,
    x: canvas.width / 2,
    y: canvas.height / 2,
    width: 200,
    height: 200,
    radius: 100,
    color: document.getElementById('shapeColor').value || '#FF416C',
    opacity: parseInt(document.getElementById('shapeOpacity').value) || 80,
    rotation: 0
  };
  elements.push(el);
  selectElement(el);
  redraw();
  saveState();
}

// Templates
function applyTemplate(tplId) {
  elements = [];
  selectedEl = null;
  bgMode = 'solid';

  if (tplId === 'gaming') {
    solidColor = '#0f0c29';
    addText('EPIC GAMEPLAY');
    elements[0].color = '#FFD700';
    elements[0].fontFamily = 'Impact';
    elements[0].fontSize = 100;
    elements[0].y = 150;
    addEmoji('🎮');
    elements[1].size = 150;
    elements[1].x = 800;
    elements[1].y = 400;
  } else if (tplId === 'tutorial') {
    solidColor = '#ffffff';
    bgMode = 'gradient';
    gradientColors = ['#4ca1af', '#c4e0e5'];
    addText('HOW TO DO IT');
    elements[0].color = '#2c3e50';
    elements[0].fontSize = 90;
    elements[0].y = 200;
    addEmoji('💡');
    elements[1].size = 120;
    elements[1].x = 640;
    elements[1].y = 450;
  } else if (tplId === 'vlog') {
    solidColor = '#ffafbd';
    addText('MY DAILY VLOG');
    elements[0].color = '#ffffff';
    elements[0].shadow = true;
    elements[0].y = 300;
  } else if (tplId === 'tech') {
    solidColor = '#000000';
    addText('TECH REVIEW');
    elements[0].color = '#00ff00';
    elements[0].fontFamily = 'Courier New';
    elements[0].y = 360;
  }
  updatePropertiesPanel();
  redraw();
  saveState();
}

document.querySelectorAll('.template-btn').forEach(btn => {
  btn.addEventListener('click', () => applyTemplate(btn.dataset.template));
});

if(document.getElementById('addRect')) document.getElementById('addRect').addEventListener('click', () => addShape('rect'));
if(document.getElementById('addCircle')) document.getElementById('addCircle').addEventListener('click', () => addShape('circle'));
if(document.getElementById('addTriangle')) document.getElementById('addTriangle').addEventListener('click', () => addShape('triangle'));
if(document.getElementById('addArrow')) document.getElementById('addArrow').addEventListener('click', () => addShape('arrow'));

// Selection & drag
let dragOffset = {x:0,y:0};
function selectElement(el) {
  selectedEl = el;
  updatePropertiesPanel();
}

function updatePropertiesPanel() {
  // hide all panels first
  document.querySelectorAll('.prop-panel').forEach(p=>p.classList.add('hidden'));
  if (!selectedEl) { document.getElementById('noSelectionMsg').style.display='flex'; return; }
  document.getElementById('noSelectionMsg').style.display='none';
  if (selectedEl.type === 'text') {
    const p = document.getElementById('textProperties');
    p.classList.remove('hidden');
    document.getElementById('propText').value = selectedEl.text;
    document.getElementById('propFont').value = selectedEl.fontFamily;
    document.getElementById('propFontSize').value = selectedEl.fontSize;
    document.getElementById('propFontSizeVal').textContent = selectedEl.fontSize;
    document.getElementById('propTextColor').value = selectedEl.color;
    document.getElementById('propTextColorHex').textContent = selectedEl.color;
    document.getElementById('propOpacity').value = selectedEl.opacity;
    document.getElementById('propOpacityVal').textContent = selectedEl.opacity;
    document.getElementById('propRotation').value = selectedEl.rotation;
    document.getElementById('propRotationVal').textContent = selectedEl.rotation;
    // stroke
    document.getElementById('propStrokeColor').value = selectedEl.strokeColor;
    document.getElementById('propStrokeColorHex').textContent = selectedEl.strokeColor;
    document.getElementById('propStrokeWidth').value = selectedEl.strokeWidth;
    document.getElementById('propStrokeWidthVal').textContent = selectedEl.strokeWidth;
    // active styles
    document.getElementById('btnBold').classList.toggle('active', selectedEl.bold);
    document.getElementById('btnItalic').classList.toggle('active', selectedEl.italic);
    document.getElementById('btnShadow').classList.toggle('active', selectedEl.shadow);
    document.getElementById('btnStroke').classList.toggle('active', selectedEl.stroke);
    // alignment
    document.getElementById('alignLeft').classList.toggle('active', selectedEl.align==='left');
    document.getElementById('alignCenter').classList.toggle('active', selectedEl.align==='center');
    document.getElementById('alignRight').classList.toggle('active', selectedEl.align==='right');
  } else if (selectedEl.type === 'emoji') {
    const p = document.getElementById('emojiProperties');
    p.classList.remove('hidden');
    document.getElementById('propEmojiSize').value = selectedEl.size;
    document.getElementById('propEmojiSizeVal').textContent = selectedEl.size;
    document.getElementById('propEmojiOpacity').value = selectedEl.opacity;
    document.getElementById('propEmojiOpacityVal').textContent = selectedEl.opacity;
    document.getElementById('propEmojiRotation').value = selectedEl.rotation;
    document.getElementById('propEmojiRotationVal').textContent = selectedEl.rotation;
  } else if (selectedEl.type === 'shape') {
    const p = document.getElementById('shapeProperties');
    p.classList.remove('hidden');
    document.getElementById('propShapeColor').value = selectedEl.color;
    document.getElementById('propShapeColorHex').textContent = selectedEl.color;
    document.getElementById('propShapeOpacity').value = selectedEl.opacity;
    document.getElementById('propShapeOpacityVal').textContent = selectedEl.opacity;
    document.getElementById('propShapeRotation').value = selectedEl.rotation;
    document.getElementById('propShapeRotationVal').textContent = selectedEl.rotation;
  }
}

// Mouse interaction on overlay (simple hit test)
overlay.addEventListener('mousedown', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  // reverse iterate for topmost
  for (let i = elements.length-1; i>=0; i--) {
    const el = elements[i];
    const dx = mx - el.x;
    const dy = my - el.y;
    const distance = Math.sqrt(dx*dx + dy*dy);
    if (el.type === 'emoji' && distance < el.size) {
      selectElement(el);
      dragOffset.x = dx; dragOffset.y = dy;
      startDrag(e);
      return;
    }
    if (el.type === 'shape') {
      const w = el.shapeType === 'circle' ? el.radius * 2 : el.width;
      const h = el.shapeType === 'circle' ? el.radius * 2 : el.height;
      if (mx >= el.x - w/2 && mx <= el.x + w/2 && my >= el.y - h/2 && my <= el.y + h/2) {
        selectElement(el);
        dragOffset.x = dx; dragOffset.y = dy;
        startDrag(e);
        return;
      }
    }
    if (el.type === 'image') {
      if (mx >= el.x - el.width/2 && mx <= el.x + el.width/2 && my >= el.y - el.height/2 && my <= el.y + el.height/2) {
        selectElement(el);
        dragOffset.x = dx; dragOffset.y = dy;
        startDrag(e);
        return;
      }
    }
    if (el.type === 'text') {
      const w = ctx.measureText(el.text).width;
      const h = el.fontSize;
      if (mx >= el.x - w/2 && mx <= el.x + w/2 && my >= el.y - h && my <= el.y) {
        selectElement(el);
        dragOffset.x = dx; dragOffset.y = dy;
        startDrag(e);
        return;
      }
    }
  }
  // clicked empty area
  selectedEl = null;
  updatePropertiesPanel();
});

let dragging = false;
function startDrag(e) {
  dragging = true;
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', endDrag);
}
function onDrag(e) {
  if (!dragging || !selectedEl) return;
  const rect = canvas.getBoundingClientRect();
  selectedEl.x = e.clientX - rect.left - dragOffset.x;
  selectedEl.y = e.clientY - rect.top - dragOffset.y;
  redraw();
}
function endDrag() {
  dragging = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', endDrag);
}

// Property panel bindings (text)
if (document.getElementById('propText')) {
  document.getElementById('propText').addEventListener('input', e => { if (selectedEl && selectedEl.type==='text') { selectedEl.text=e.target.value; redraw(); } });
  document.getElementById('propFont').addEventListener('change', e => { if (selectedEl && selectedEl.type==='text') { selectedEl.fontFamily=e.target.value; redraw(); } });
  document.getElementById('propFontSize').addEventListener('input', e => {
    const v = parseInt(e.target.value);
    if (selectedEl && selectedEl.type==='text') { selectedEl.fontSize=v; document.getElementById('propFontSizeVal').textContent=v; redraw(); }
  });
  document.getElementById('propTextColor').addEventListener('input', e => {
    if (selectedEl && selectedEl.type==='text') { selectedEl.color=e.target.value; document.getElementById('propTextColorHex').textContent=e.target.value; redraw(); }
  });
  document.getElementById('propOpacity').addEventListener('input', e => {
    const v=parseInt(e.target.value);
    if (selectedEl && selectedEl.type==='text') { selectedEl.opacity=v; document.getElementById('propOpacityVal').textContent=v; redraw(); }
  });
  document.getElementById('propRotation').addEventListener('input', e => {
    const v=parseInt(e.target.value);
    if (selectedEl && selectedEl.type==='text') { selectedEl.rotation=v; document.getElementById('propRotationVal').textContent=v; redraw(); }
  });
  document.getElementById('propStrokeColor').addEventListener('input', e => {
    if (selectedEl && selectedEl.type==='text') { selectedEl.strokeColor=e.target.value; document.getElementById('propStrokeColorHex').textContent=e.target.value; redraw(); }
  });
  document.getElementById('propStrokeWidth').addEventListener('input', e => {
    const v=parseInt(e.target.value);
    if (selectedEl && selectedEl.type==='text') { selectedEl.strokeWidth=v; document.getElementById('propStrokeWidthVal').textContent=v; redraw(); }
  });
  // style toggles
  document.getElementById('btnBold').addEventListener('click', () => { if (selectedEl && selectedEl.type==='text') { selectedEl.bold = !selectedEl.bold; document.getElementById('btnBold').classList.toggle('active'); redraw(); } });
  document.getElementById('btnItalic').addEventListener('click', () => { if (selectedEl && selectedEl.type==='text') { selectedEl.italic = !selectedEl.italic; document.getElementById('btnItalic').classList.toggle('active'); redraw(); } });
  document.getElementById('btnShadow').addEventListener('click', () => { if (selectedEl && selectedEl.type==='text') { selectedEl.shadow = !selectedEl.shadow; document.getElementById('btnShadow').classList.toggle('active'); redraw(); } });
  document.getElementById('btnStroke').addEventListener('click', () => { if (selectedEl && selectedEl.type==='text') { selectedEl.stroke = !selectedEl.stroke; document.getElementById('btnStroke').classList.toggle('active'); redraw(); } });
  // alignment
  ['alignLeft','alignCenter','alignRight'].forEach(id=>{
    document.getElementById(id).addEventListener('click',()=>{
      if(selectedEl && selectedEl.type==='text'){
        selectedEl.align=id.replace('align','').toLowerCase();
        updatePropertiesPanel();
        redraw();
      }
    });
  });
}

// Emoji properties bindings
if (document.getElementById('propEmojiSize')) {
  document.getElementById('propEmojiSize').addEventListener('input', e=>{ const v=parseInt(e.target.value); if(selectedEl && selectedEl.type==='emoji'){selectedEl.size=v; document.getElementById('propEmojiSizeVal').textContent=v; redraw(); } });
  document.getElementById('propEmojiOpacity').addEventListener('input', e=>{ const v=parseInt(e.target.value); if(selectedEl && selectedEl.type==='emoji'){selectedEl.opacity=v; document.getElementById('propEmojiOpacityVal').textContent=v; redraw(); } });
  document.getElementById('propEmojiRotation').addEventListener('input', e=>{ const v=parseInt(e.target.value); if(selectedEl && selectedEl.type==='emoji'){selectedEl.rotation=v; document.getElementById('propEmojiRotationVal').textContent=v; redraw(); } });
}

// Shape properties bindings
if (document.getElementById('propShapeColor')) {
  document.getElementById('propShapeColor').addEventListener('input', e=>{ if(selectedEl && selectedEl.type==='shape'){selectedEl.color=e.target.value; document.getElementById('propShapeColorHex').textContent=e.target.value; redraw(); } });
  document.getElementById('propShapeOpacity').addEventListener('input', e=>{ const v=parseInt(e.target.value); if(selectedEl && selectedEl.type==='shape'){selectedEl.opacity=v; document.getElementById('propShapeOpacityVal').textContent=v; redraw(); } });
  document.getElementById('propShapeRotation').addEventListener('input', e=>{ const v=parseInt(e.target.value); if(selectedEl && selectedEl.type==='shape'){selectedEl.rotation=v; document.getElementById('propShapeRotationVal').textContent=v; redraw(); } });
}

// Delete & duplicate actions
document.getElementById('btnDeleteSelected').addEventListener('click', ()=>{ if(selectedEl){ elements = elements.filter(el=>el!==selectedEl); selectedEl=null; updatePropertiesPanel(); redraw(); saveState(); } });
document.getElementById('btnDuplicateSelected').addEventListener('click', ()=>{ if(selectedEl){ const copy = JSON.parse(JSON.stringify(selectedEl)); copy.x+=20; copy.y+=20; elements.push(copy); selectElement(copy); redraw(); saveState(); } });

if(document.getElementById('btnDeleteEmoji')) document.getElementById('btnDeleteEmoji').addEventListener('click', ()=>{ if(selectedEl){ elements = elements.filter(el=>el!==selectedEl); selectedEl=null; updatePropertiesPanel(); redraw(); saveState(); } });
if(document.getElementById('btnDuplicateEmoji')) document.getElementById('btnDuplicateEmoji').addEventListener('click', ()=>{ if(selectedEl){ const copy = JSON.parse(JSON.stringify(selectedEl)); copy.x+=20; copy.y+=20; elements.push(copy); selectElement(copy); redraw(); saveState(); } });

if(document.getElementById('btnDeleteShape')) document.getElementById('btnDeleteShape').addEventListener('click', ()=>{ if(selectedEl){ elements = elements.filter(el=>el!==selectedEl); selectedEl=null; updatePropertiesPanel(); redraw(); saveState(); } });
if(document.getElementById('btnDuplicateShape')) document.getElementById('btnDuplicateShape').addEventListener('click', ()=>{ if(selectedEl){ const copy = JSON.parse(JSON.stringify(selectedEl)); copy.x+=20; copy.y+=20; elements.push(copy); selectElement(copy); redraw(); saveState(); } });

// Download
document.getElementById('btnDownload').addEventListener('click',()=>{
  const link=document.createElement('a');
  link.download='thumbnail.png';
  link.href=canvas.toDataURL('image/png');
  link.click();
});

// Zoom controls (simple scale of canvas element)
let scale=1;
function applyZoom(){
  canvas.style.transform=`scale(${scale})`;
  document.getElementById('zoomLevel').textContent=`${Math.round(scale*100)}%`;
}
// Help panel toggle
if(document.getElementById('btnHelp')) {
  document.getElementById('btnHelp').addEventListener('click',()=>{
    document.getElementById('helpPanel').style.display = 'flex';
  });
}
if(document.getElementById('btnCloseHelp')) {
  document.getElementById('btnCloseHelp').addEventListener('click',()=>{
    document.getElementById('helpPanel').style.display = 'none';
  });
}

// Zoom handlers (already defined above)
document.getElementById('btnZoomIn').addEventListener('click',()=>{scale+=0.1;applyZoom();});
document.getElementById('btnZoomOut').addEventListener('click',()=>{scale=Math.max(0.2,scale-0.1);applyZoom();});
document.getElementById('btnZoomFit').addEventListener('click',()=>{scale=1;applyZoom();});

// Face/Overlay image upload
if(document.getElementById('fabUploadFace')) {
  document.getElementById('fabUploadFace').addEventListener('click', () => {
    document.getElementById('faceUpload').click();
  });
}

if(document.getElementById('faceUpload')) {
  document.getElementById('faceUpload').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // Create image element
      let w = img.width;
      let h = img.height;
      if (w > 400) { h = Math.round(h * (400 / w)); w = 400; }
      
      const el = {
        type: 'image',
        img: img,
        src: url, // keep url for saving state if needed
        x: canvas.width / 2,
        y: canvas.height / 2,
        width: w,
        height: h,
        rotation: 0,
        opacity: 100
      };
      elements.push(el);
      selectElement(el);
      redraw();
      saveState();
    };
    img.src = url;
  });
}

// Initial draw
redraw();

