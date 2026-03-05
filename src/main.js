document.addEventListener('DOMContentLoaded', () => {
  // Cache all DOM references once at startup to avoid repeated lookups.
  const dropArea = document.getElementById('drop-area');
  const preview = document.getElementById('preview');
  const sideMenu = document.getElementById('side-menu');
  const enlargeBtn = document.getElementById('enlarge-btn');
  const shrinkBtn = document.getElementById('shrink-btn');
  const upBtn = document.getElementById('up-btn');
  const downBtn = document.getElementById('down-btn');
  const leftBtn = document.getElementById('left-btn');
  const rightBtn = document.getElementById('right-btn');
  const resetBtn = document.getElementById('reset-btn');
  const flipBtn = document.getElementById('flip-btn');
  const rotateBtn = document.getElementById('rotate-btn');
  const restoreBtn = document.getElementById('restore-btn');
  const redoBtn = document.getElementById('redo-btn');
  const showBtn = document.getElementById('show-btn');
  const menuBtn = document.getElementById('menu-btn');
  const closeMenuBtn = document.getElementById('close-menu-btn');
  const helpBtn = document.getElementById('help-btn');
  const helpMenu = document.getElementById('help-menu');
  const closeHelpBtn = document.getElementById('close-help-btn');
  const menuBtn2 = document.getElementById('menu-btn-2');
  const sideMenu2 = document.getElementById('side-menu-2');
  const closeMenu2Btn = document.getElementById('close-menu-2-btn');
  const menuBtn3 = document.getElementById('menu-btn-3');
  const sideMenu3 = document.getElementById('side-menu-3');
  const closeMenu3Btn = document.getElementById('close-menu-3-btn');
  const invertBtn = document.getElementById('invert-btn');
  const grayscaleBtn = document.getElementById('grayscale-btn');
  const brightnessBtn = document.getElementById('brightness-btn');
  const beigeBtn = document.getElementById('beige-btn');
  const heightBtn = document.getElementById('height-btn');
  const normalBtn = document.getElementById('normal-btn');
  const sobelBtn = document.getElementById('sobel-btn');
  const polarizationBtn = document.getElementById('polarization-btn');
  const acrylicBtn = document.getElementById('acrylic-btn');
  const medianBtn = document.getElementById('median-btn');
  const redSlider = document.getElementById('red-slider');
  const greenSlider = document.getElementById('green-slider');
  const blueSlider = document.getElementById('blue-slider');
  const alphaSlider = document.getElementById('alpha-slider');
  const brightnessSlider = document.getElementById('brightness-slider');
  const redResetBtn = document.getElementById('red-reset-btn');
  const greenResetBtn = document.getElementById('green-reset-btn');
  const blueResetBtn = document.getElementById('blue-reset-btn');
  const alphaResetBtn = document.getElementById('alpha-reset-btn');
  const brightnessResetBtn = document.getElementById('brightness-reset-btn');
  const redValue = document.getElementById('red-value');
  const greenValue = document.getElementById('green-value');
  const blueValue = document.getElementById('blue-value');
  const alphaValue = document.getElementById('alpha-value');
  const brightnessValue = document.getElementById('brightness-value');
  const workspaceStage = document.querySelector('.workspace-stage');
  const rulerTop = document.getElementById('ruler-top');
  const rulerLeft = document.getElementById('ruler-left');
  const scaleReadout = document.getElementById('scale-readout');
  const undoProgressFill = document.getElementById('undo-progress-fill');
  const redoProgressFill = document.getElementById('redo-progress-fill');
  const undoProgressText = document.getElementById('undo-progress-text');
  const redoProgressText = document.getElementById('redo-progress-text');

  const downloadBtn = document.getElementById('download-btn');
  const quitBtn = document.getElementById('quit-btn');

  // Validate minimum required controls so runtime errors fail fast and clearly.
  if (!dropArea || !preview) {
    console.error('Required editor elements are missing (#drop-area or #preview).');
    return;
  }

  // Upload safety limits to prevent huge files from freezing the UI.
  const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB
  const MAX_TOTAL_PIXELS = 40000000; // 40 MP
  const ALLOWED_IMAGE_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/bmp'
  ]);
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = Array.from(ALLOWED_IMAGE_TYPES).join(',');
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  preview.draggable = false;
  dropArea.tabIndex = 0;
  dropArea.setAttribute('role', 'button');
  dropArea.setAttribute('aria-label', 'Upload image');

  // Per-channel buffers for non-destructive slider-based channel edits.
  let channelData = {
    red: null,
    green: null,
    blue: null,
    alpha: null,
    width: 0,
    height: 0
  };

  // Multi-step history stacks for undo/redo
  const MAX_HISTORY_STEPS = 200;
  let undoStack = [];
  let redoStack = [];
  let hasChanges = false; // legacy flag kept for compatibility

  // Flag to prevent re-extracting channels when updating display
  let isApplyingRGBA = false;

  let isFlipped = false;
  let offsetX = 0;
  let offsetY = 0;
  let width = 0;
  let height = 0;
  let originalWidth = 0;
  let originalHeight = 0;
  let initialWidth = 0;
  let initialHeight = 0;
  let rotation = 0;
  const moveStep = 2;
  const sizeStep = 10;
  const FIT_PADDING = 8;
  const RULER_SIZE = 26;
  const RULER_TARGET_MAJOR_SPACING = 90;
  const RULER_UNITS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let activeKeys = {};
  let animationFrameId = null;
  let activePreviewObjectUrl = null;
  let sliderHistoryArmed = true;
  let transformHistoryArmed = true;
  let isFreshUploadLoad = false;
  const DEFAULT_CHANNEL_VALUES = {
    red: '255',
    green: '255',
    blue: '255',
    alpha: '255',
    brightness: '100'
  };

  /**
   * Returns true if an image is currently active in the workspace.
   * Keeps display-state checks consistent in one place.
   * @returns {boolean}
   */
  function isImageLoaded() {
    return preview.style.display === 'block';
  }

  function resetChannelControls(applyToImage = false) {
    redSlider.value = DEFAULT_CHANNEL_VALUES.red;
    greenSlider.value = DEFAULT_CHANNEL_VALUES.green;
    blueSlider.value = DEFAULT_CHANNEL_VALUES.blue;
    alphaSlider.value = DEFAULT_CHANNEL_VALUES.alpha;
    brightnessSlider.value = DEFAULT_CHANNEL_VALUES.brightness;
    redValue.value = DEFAULT_CHANNEL_VALUES.red;
    greenValue.value = DEFAULT_CHANNEL_VALUES.green;
    blueValue.value = DEFAULT_CHANNEL_VALUES.blue;
    alphaValue.value = DEFAULT_CHANNEL_VALUES.alpha;
    brightnessValue.value = DEFAULT_CHANNEL_VALUES.brightness;

    if (applyToImage && isImageLoaded()) {
      applyRGBAMultipliers(preview);
    }
  }

  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.add('dragover');
  });

  dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('dragover');
  });

  function handleImageFile(file) {
    // Basic file gatekeeping before creating object URLs.
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      alert('Please drop a valid image file (PNG, JPG, WEBP, GIF, or BMP).');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      alert('Image file is too large. Please use an image smaller than 20 MB.');
      return;
    }
    if (activePreviewObjectUrl) {
      URL.revokeObjectURL(activePreviewObjectUrl);
      activePreviewObjectUrl = null;
    }
    const objectUrl = URL.createObjectURL(file);
    activePreviewObjectUrl = objectUrl;
    isFreshUploadLoad = true;
    preview.onerror = function() {
      if (activePreviewObjectUrl) {
        URL.revokeObjectURL(activePreviewObjectUrl);
        activePreviewObjectUrl = null;
      }
      alert('Unable to load that image file.');
    };
    preview.onload = function() {
      if (activePreviewObjectUrl) {
        URL.revokeObjectURL(activePreviewObjectUrl);
        activePreviewObjectUrl = null;
      }
      // Skip channel extraction if we're just applying RGBA modifications
      if (isApplyingRGBA) {
        isApplyingRGBA = false;
        return;
      }

      originalWidth = preview.naturalWidth;
      originalHeight = preview.naturalHeight;
      const totalPixels = originalWidth * originalHeight;
      if (totalPixels > MAX_TOTAL_PIXELS) {
        preview.style.display = 'none';
        dropArea.style.display = 'flex';
        alert('Image dimensions are too large. Please use an image under 40 megapixels.');
        return;
      }

      // Capture original image data.
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = originalWidth;
      canvas.height = originalHeight;
      ctx.drawImage(preview, 0, 0);
      const imageData = ctx.getImageData(0, 0, originalWidth, originalHeight);
      const data = imageData.data;
      const pixelCount = originalWidth * originalHeight;

      channelData.red = new Uint8ClampedArray(pixelCount);
      channelData.green = new Uint8ClampedArray(pixelCount);
      channelData.blue = new Uint8ClampedArray(pixelCount);
      channelData.alpha = new Uint8ClampedArray(pixelCount);
      channelData.width = originalWidth;
      channelData.height = originalHeight;

      // Separate channels
      for (let i = 0; i < pixelCount; i++) {
        const idx = i * 4;
        channelData.red[i] = data[idx];
        channelData.green[i] = data[idx + 1];
        channelData.blue[i] = data[idx + 2];
        channelData.alpha[i] = data[idx + 3];
      }

      // Reset channel controls to neutral values for each new upload.
      resetChannelControls(false);

      // Scale image to fit the current canvas workspace while maintaining aspect ratio
      const bounds = getCanvasBounds();
      let scaleFactor = Math.min(bounds.width / originalWidth, bounds.height / originalHeight);
      if (!Number.isFinite(scaleFactor) || scaleFactor <= 0) {
        alert('Invalid image dimensions.');
        return;
      }
      width = originalWidth * scaleFactor;
      height = originalHeight * scaleFactor;
      initialWidth = width;
      initialHeight = height;

      if (isFreshUploadLoad) {
        dropArea.style.display = 'none';
        showBtn.style.display = 'none';
        menuBtn.style.display = 'block';
        isFlipped = false;
        offsetX = 0;
        offsetY = 0;
        rotation = 0;
        clearHistory();
        stopAnimationLoop();
        startAnimationLoop();
        isFreshUploadLoad = false;
      }

      updateImageTransform();
    };
    preview.style.display = 'block';
    preview.src = objectUrl;
  }

  dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageFile(files[0]);
    }
  });

  dropArea.addEventListener('click', () => {
    fileInput.value = '';
    fileInput.click();
  });

  dropArea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.value = '';
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleImageFile(files[0]);
    }
  });

  function getCanvasBounds() {
    const fallback = {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
      width: window.innerWidth,
      height: window.innerHeight
    };

    if (!workspaceStage) return fallback;

    const stageRect = workspaceStage.getBoundingClientRect();
    const left = stageRect.left + RULER_SIZE + FIT_PADDING;
    const top = stageRect.top + RULER_SIZE + FIT_PADDING;
    const right = stageRect.right - FIT_PADDING;
    const bottom = stageRect.bottom - FIT_PADDING;
    const width = Math.max(0, right - left);
    const height = Math.max(0, bottom - top);

    return { left, top, right, bottom, width, height };
  }

  function pickMajorUnit(pixelsPerUnit) {
    for (const unit of RULER_UNITS) {
      if ((unit * pixelsPerUnit) >= RULER_TARGET_MAJOR_SPACING) {
        return unit;
      }
    }
    return RULER_UNITS[RULER_UNITS.length - 1];
  }

  function buildRulerTicks(container, config) {
    const {
      isVertical,
      axisStartPx,
      axisLengthPx,
      originPx,
      pixelsPerUnit,
      majorUnit,
      minorUnit
    } = config;

    if (!container || axisLengthPx <= 0 || pixelsPerUnit <= 0) return;

    container.innerHTML = '';
    const minUnit = (axisStartPx - originPx) / pixelsPerUnit;
    const maxUnit = ((axisStartPx + axisLengthPx) - originPx) / pixelsPerUnit;
    const firstMinorIndex = Math.floor(minUnit / minorUnit);
    const lastMinorIndex = Math.ceil(maxUnit / minorUnit);
    const maxTicks = 500;

    for (let i = firstMinorIndex; i <= lastMinorIndex && (i - firstMinorIndex) <= maxTicks; i++) {
      const value = i * minorUnit;
      const pixelPos = (originPx + (value * pixelsPerUnit)) - axisStartPx;
      if (pixelPos < -1 || pixelPos > axisLengthPx + 1) continue;

      const majorIndex = Math.round(value / majorUnit);
      const isMajor = Math.abs(value - (majorIndex * majorUnit)) < 0.0001;

      const tick = document.createElement('span');
      tick.className = 'ruler-tick';
      if (isVertical) {
        tick.style.top = `${pixelPos}px`;
        tick.style.width = isMajor ? '13px' : '8px';
      } else {
        tick.style.left = `${pixelPos}px`;
        tick.style.height = isMajor ? '13px' : '8px';
      }
      container.appendChild(tick);

      if (isMajor) {
        const label = document.createElement('span');
        label.className = 'ruler-label';
        label.textContent = `${Math.round(value)}`;
        if (isVertical) {
          label.style.top = `${pixelPos + 1}px`;
        } else {
          label.style.left = `${pixelPos + 1}px`;
        }
        container.appendChild(label);
      }
    }
  }

  function updateRulers() {
    if (!workspaceStage || !rulerTop || !rulerLeft || !scaleReadout) return;

    const stageRect = workspaceStage.getBoundingClientRect();
    const horizontalLength = Math.max(0, stageRect.width - RULER_SIZE);
    const verticalLength = Math.max(0, stageRect.height - RULER_SIZE);

    if (horizontalLength <= 0 || verticalLength <= 0) return;

    let pixelsPerUnit = 1;
    let originX = stageRect.left + RULER_SIZE;
    let originY = stageRect.top + RULER_SIZE;
    let readout = 'No image loaded';

    if (originalWidth > 0 && originalHeight > 0 && width > 0 && height > 0) {
      pixelsPerUnit = width / originalWidth;
      if (!Number.isFinite(pixelsPerUnit) || pixelsPerUnit <= 0) {
        pixelsPerUnit = 1;
      }

      const stageCenterX = stageRect.left + (stageRect.width / 2);
      const stageCenterY = stageRect.top + (stageRect.height / 2);
      originX = stageCenterX + offsetX - (width / 2);
      originY = stageCenterY + offsetY - (height / 2);

      const zoomPercent = Math.round((width / originalWidth) * 100);
      readout = `${originalWidth}x${originalHeight}px | ${Math.round(width)}x${Math.round(height)}px | ${zoomPercent}%`;
    }

    const majorUnit = pickMajorUnit(pixelsPerUnit);
    const minorUnit = Math.max(majorUnit / 5, 1);

    buildRulerTicks(rulerTop, {
      isVertical: false,
      axisStartPx: stageRect.left + RULER_SIZE,
      axisLengthPx: horizontalLength,
      originPx: originX,
      pixelsPerUnit,
      majorUnit,
      minorUnit
    });

    buildRulerTicks(rulerLeft, {
      isVertical: true,
      axisStartPx: stageRect.top + RULER_SIZE,
      axisLengthPx: verticalLength,
      originPx: originY,
      pixelsPerUnit,
      majorUnit,
      minorUnit
    });

    scaleReadout.textContent = readout;
  }

  function updateImageTransform() {
    // Compose translation, flip, and rotation into a single CSS transform.
    const scaleX = isFlipped ? -1 : 1;
    preview.style.width = width + 'px';
    preview.style.height = height + 'px';
    const transformString = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scaleX(${scaleX}) rotate(${rotation}deg)`;
    preview.style.transform = transformString;
    updateRulers();
  }

  function startAnimationLoop() {
    if (animationFrameId !== null) return;
    function loop() {
      let updated = false;
      
      if (activeKeys['ArrowUp']) {
        offsetY -= moveStep;
        updated = true;
      }
      if (activeKeys['ArrowDown']) {
        offsetY += moveStep;
        updated = true;
      }
      if (activeKeys['ArrowLeft']) {
        offsetX -= moveStep;
        updated = true;
      }
      if (activeKeys['ArrowRight']) {
        offsetX += moveStep;
        updated = true;
      }
      if (activeKeys['Enlarge']) {
        width += sizeStep;
        height += sizeStep;
        updated = true;
      }
      if (activeKeys['Shrink']) {
        if (width > sizeStep && height > sizeStep) {
          width -= sizeStep;
          height -= sizeStep;
        }
        updated = true;
      }
      
      if (updated) {
        updateImageTransform();
      }
      
      animationFrameId = requestAnimationFrame(loop);
    }
    
    loop();
  }

  function stopAnimationLoop() {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  /**
   * Turns a press-and-hold button into an entry in the keyboard action map.
   * @param {HTMLElement|null} button
   * @param {string} actionKey
   */
  function bindHoldKeyButton(button, actionKey) {
    if (!button) return;
    button.addEventListener('mousedown', () => {
      captureTransformHistoryIfNeeded();
      activeKeys[actionKey] = true;
    });
    button.addEventListener('mouseup', () => {
      activeKeys[actionKey] = false;
      armTransformHistory();
    });
    button.addEventListener('mouseleave', () => {
      activeKeys[actionKey] = false;
      armTransformHistory();
    });
  }

  function captureTransformHistoryIfNeeded() {
    if (isImageLoaded() && transformHistoryArmed) {
      saveImageState(preview);
      transformHistoryArmed = false;
    }
  }

  function armTransformHistory() {
    transformHistoryArmed = true;
  }

  bindHoldKeyButton(enlargeBtn, 'Enlarge');
  bindHoldKeyButton(shrinkBtn, 'Shrink');
  bindHoldKeyButton(upBtn, 'ArrowUp');
  bindHoldKeyButton(downBtn, 'ArrowDown');
  bindHoldKeyButton(leftBtn, 'ArrowLeft');
  bindHoldKeyButton(rightBtn, 'ArrowRight');

  /**
   * Execute an image operation only when an image is loaded.
   * Optionally saves undo state before applying the operation.
   * @param {() => void} operation
   * @param {{saveHistory?: boolean}} [options]
   */
  function runImageOperation(operation, options = {}) {
    if (!isImageLoaded()) return;
    if (options.saveHistory) {
      saveImageState(preview);
    }
    operation();
  }

  resetBtn.addEventListener('click', () => {
    runImageOperation(() => {
      offsetX = 0;
      offsetY = 0;
      width = initialWidth;
      height = initialHeight;
      rotation = 0;
      updateImageTransform();
    }, { saveHistory: true });
  });
  
  flipBtn.addEventListener('click', () => {
    runImageOperation(() => {
      isFlipped = !isFlipped;
      updateImageTransform();
    }, { saveHistory: true });
  });
  
  rotateBtn.addEventListener('click', () => {
    runImageOperation(() => {
      rotation += 90;
      if (rotation >= 360) rotation = 0;
      updateImageTransform();
    }, { saveHistory: true });
  });
  
  restoreBtn.addEventListener('click', () => {
    restoreImageState(preview);
  });

  if (redoBtn) {
    redoBtn.addEventListener('click', () => {
      redoImageState(preview);
    });
  }

  /**
   * Attach a click filter/action with consistent guard + undo behavior.
   * @param {HTMLElement|null} button
   * @param {(image: HTMLImageElement) => void} handler
   */
  function bindFilterButton(button, handler) {
    if (!button) return;
    button.addEventListener('click', () => {
      runImageOperation(() => handler(preview), { saveHistory: true });
    });
  }

  bindFilterButton(invertBtn, invertImageColors);
  bindFilterButton(grayscaleBtn, grayscaleImage);
  bindFilterButton(brightnessBtn, reduceBrightnessByPosition);
  bindFilterButton(beigeBtn, beigeImage);
  bindFilterButton(heightBtn, heightImage);
  bindFilterButton(normalBtn, normalImage);
  bindFilterButton(sobelBtn, applySobelFilter);
  bindFilterButton(polarizationBtn, applyPolarization);
  bindFilterButton(acrylicBtn, applyAcrylicFilter);
  bindFilterButton(medianBtn, applyMedianFilter);

  /**
   * Toggle a panel between hidden and shown states.
   * @param {HTMLElement|null} panel
   * @param {string} [shownDisplay='flex']
   */
  function togglePanel(panel, shownDisplay = 'flex') {
    if (!panel) return;
    panel.style.display = panel.style.display === 'none' ? shownDisplay : 'none';
  }

  function syncMenuButtonStates() {
    if (menuBtn && sideMenu) {
      menuBtn.classList.toggle('is-open', sideMenu.style.display !== 'none');
    }
    if (menuBtn2 && sideMenu2) {
      menuBtn2.classList.toggle('is-open', sideMenu2.style.display !== 'none');
    }
    if (menuBtn3 && sideMenu3) {
      menuBtn3.classList.toggle('is-open', sideMenu3.style.display !== 'none');
    }
  }

  menuBtn.addEventListener('click', () => {
    togglePanel(sideMenu, 'flex');
    updateSideMenuPositions();
    syncMenuButtonStates();
  });

  closeMenuBtn.addEventListener('click', () => {
    sideMenu.style.display = 'none';
    updateSideMenuPositions();
    syncMenuButtonStates();
  });

  showBtn.addEventListener('click', () => {
    sideMenu.style.display = 'flex';
    showBtn.style.display = 'none';
    updateSideMenuPositions();
    syncMenuButtonStates();
  });

  helpBtn.addEventListener('click', () => {
    togglePanel(helpMenu, 'block');
  });

  closeHelpBtn.addEventListener('click', () => {
    helpMenu.style.display = 'none';
  });

  // Filters menu toggle (second menu)
  if (menuBtn2 && sideMenu2) {
    menuBtn2.addEventListener('click', () => {
      togglePanel(sideMenu2, 'flex');
      updateSideMenuPositions();
      syncMenuButtonStates();
    });
  }

  if (closeMenu2Btn) {
    closeMenu2Btn.addEventListener('click', () => {
      sideMenu2.style.display = 'none';
      updateSideMenuPositions();
      syncMenuButtonStates();
    });
  }

  // Channels menu toggle (third menu)
  if (menuBtn3 && sideMenu3) {
    menuBtn3.addEventListener('click', () => {
      togglePanel(sideMenu3, 'flex');
      updateSideMenuPositions();
      syncMenuButtonStates();
    });
  }

  if (closeMenu3Btn) {
    closeMenu3Btn.addEventListener('click', () => {
      sideMenu3.style.display = 'none';
      updateSideMenuPositions();
      syncMenuButtonStates();
    });
  }

  downloadBtn.addEventListener('click', () => {
    if (isImageLoaded()) {
      downloadImage(preview, 'modified-image.png');
    }
  });

  quitBtn.addEventListener('click', () => {
    reloadPage();
  });

  function endDrag(pointerId = null) {
    if (!isDragging) return;
    isDragging = false;
    if (pointerId !== null && preview.hasPointerCapture && preview.hasPointerCapture(pointerId)) {
      preview.releasePointerCapture(pointerId);
    }
    preview.style.cursor = isImageLoaded() ? 'grab' : 'default';
  }

  preview.addEventListener('dragstart', (e) => {
    e.preventDefault();
  });

  preview.addEventListener('pointerdown', (e) => {
    if (!isImageLoaded() || e.button !== 0) return;
    e.preventDefault();
    captureTransformHistoryIfNeeded();
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragOffsetX = offsetX;
    dragOffsetY = offsetY;
    if (preview.setPointerCapture) {
      preview.setPointerCapture(e.pointerId);
    }
    preview.style.cursor = 'grabbing';
  });

  preview.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;
    offsetX = dragOffsetX + deltaX;
    offsetY = dragOffsetY + deltaY;
    updateImageTransform();
  });

  preview.addEventListener('pointerup', (e) => {
    endDrag(e.pointerId);
  });

  preview.addEventListener('pointercancel', (e) => {
    endDrag(e.pointerId);
  });

  preview.addEventListener('pointerenter', () => {
    if (isImageLoaded() && !isDragging) {
      preview.style.cursor = 'grab';
    }
  });

  preview.addEventListener('pointerleave', () => {
    if (!isDragging) {
      preview.style.cursor = 'default';
    }
  });

  document.addEventListener('pointerup', () => {
    endDrag();
  });

  document.addEventListener('keydown', (e) => {
    if (isImageLoaded()) {
      const key = e.key.toLowerCase();
      const isUndo = e.altKey && !e.shiftKey && key === 'z';
      const isRedo = (e.altKey && e.shiftKey && key === 'z') || (e.altKey && key === 'y');

      if (isUndo) {
        e.preventDefault();
        restoreImageState(preview);
        return;
      }

      if (isRedo) {
        e.preventDefault();
        redoImageState(preview);
        return;
      }

      switch(e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (!activeKeys.ArrowUp) captureTransformHistoryIfNeeded();
          activeKeys['ArrowUp'] = true;
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (!activeKeys.ArrowDown) captureTransformHistoryIfNeeded();
          activeKeys['ArrowDown'] = true;
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (!activeKeys.ArrowLeft) captureTransformHistoryIfNeeded();
          activeKeys['ArrowLeft'] = true;
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (!activeKeys.ArrowRight) captureTransformHistoryIfNeeded();
          activeKeys['ArrowRight'] = true;
          break;
        case '+':
        case '=':
          e.preventDefault();
          if (!activeKeys.Enlarge) captureTransformHistoryIfNeeded();
          activeKeys['Enlarge'] = true;
          break;
        case '-':
        case '_':
          e.preventDefault();
          if (!activeKeys.Shrink) captureTransformHistoryIfNeeded();
          activeKeys['Shrink'] = true;
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          saveImageState(preview);
          isFlipped = !isFlipped;
          updateImageTransform();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          saveImageState(preview);
          rotation += 90;
          if (rotation >= 360) rotation = 0;
          updateImageTransform();
          break;
      }
    }
  });

  document.addEventListener('keyup', (e) => {
    switch(e.key) {
      case 'ArrowUp':
        activeKeys['ArrowUp'] = false;
        armTransformHistory();
        break;
      case 'ArrowDown':
        activeKeys['ArrowDown'] = false;
        armTransformHistory();
        break;
      case 'ArrowLeft':
        activeKeys['ArrowLeft'] = false;
        armTransformHistory();
        break;
      case 'ArrowRight':
        activeKeys['ArrowRight'] = false;
        armTransformHistory();
        break;
      case '+':
      case '=':
        activeKeys['Enlarge'] = false;
        armTransformHistory();
        break;
      case '-':
      case '_':
        activeKeys['Shrink'] = false;
        armTransformHistory();
        break;
    }
  });

  if (workspaceStage) {
    workspaceStage.addEventListener('wheel', (e) => {
      if (isImageLoaded()) {
        e.preventDefault();
        saveImageState(preview);
        if (e.deltaY < 0) {
          width += sizeStep;
          height += sizeStep;
        } else if (width > sizeStep && height > sizeStep) {
          width -= sizeStep;
          height -= sizeStep;
        }
        updateImageTransform();
      }
    }, { passive: false });
  }

  /**
   * Position side menus so each sits 10px below the previous one.
   * Computes positions dynamically using the menus' rendered heights.
   */
  function updateSideMenuPositions() {
    try {
      const gap = 10; // 10px gap between stacked menus
      const primaryTop = 20; // primary menu top offset in px

      if (sideMenu) {
        sideMenu.style.top = primaryTop + 'px';
      }

      let currentBottom = (sideMenu && sideMenu.offsetHeight) ? (primaryTop + sideMenu.offsetHeight) : (primaryTop + 0);

      if (sideMenu2) {
        // place sideMenu2 10px below sideMenu
        sideMenu2.style.top = (currentBottom + gap) + 'px';
        currentBottom = currentBottom + gap + sideMenu2.offsetHeight;
      }

      if (sideMenu3) {
        sideMenu3.style.top = (currentBottom + gap) + 'px';
      }
    } catch (err) {
      // silent fail if elements aren't available yet
      // console.warn('updateSideMenuPositions failed', err);
    }
  }

  // Recompute positions on resize to keep 10px spacing
  window.addEventListener('resize', () => {
    updateSideMenuPositions();
    if (isImageLoaded()) {
      updateImageTransform();
    } else {
      updateRulers();
    }
  });

  // Initial positioning
  updateSideMenuPositions();
  syncMenuButtonStates();
  updateRulers();
  /**
   * Modify image pixels by calling a user-provided callback per pixel.
   * @param {HTMLImageElement} imageElement - Source image element.
   * @param {function(number, number, number, number, number, number):{r:number,g:number,b:number,a?:number}} modifyPixelFunction
   *   Callback(row, col, r, g, b, a) -> modified {r,g,b[,a]}.
   * @returns {HTMLCanvasElement} Canvas containing modified image.
   * Side effects: none (does not modify DOM); caller should set image src from returned canvas.
   */
  function modifyImagePixels(imageElement, modifyPixelFunction) {
    const dims = getImageDimensions(imageElement);
    if (!dims) {
      const fallbackCanvas = document.createElement('canvas');
      return fallbackCanvas;
    }

    // Render source image into an offscreen canvas for per-pixel edits.
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const { width, height } = dims;
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(imageElement, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Iterate row/column so filters can reason in 2D if needed.
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        // Pixel layout is RGBA in a flat Uint8ClampedArray.
        const pixelIndex = (row * width + col) * 4;
        const r = data[pixelIndex];
        const g = data[pixelIndex + 1];
        const b = data[pixelIndex + 2];
        const a = data[pixelIndex + 3];
        const modifiedPixel = modifyPixelFunction(row, col, r, g, b, a);
        data[pixelIndex] = Math.round(modifiedPixel.r);
        data[pixelIndex + 1] = Math.round(modifiedPixel.g);
        data[pixelIndex + 2] = Math.round(modifiedPixel.b);
        if (modifiedPixel.a !== undefined) {
          data[pixelIndex + 3] = Math.round(modifiedPixel.a);
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  /**
   * Invert colors of `imageElement` (per-channel 255 - value).
   * @param {HTMLImageElement} imageElement
   * Side effects: updates `imageElement.src` with modified image.
   */
  function invertImageColors(imageElement) {
    hasChanges = true;
    const modifiedCanvas = modifyImagePixels(imageElement, (row, col, r, g, b, a) => {
      return {
        r: 255 - r,
        g: 255 - g,
        b: 255 - b,
        a: a
      };
    });
    
    // Convert canvas back to image
    imageElement.src = modifiedCanvas.toDataURL();
  }

  /**
   * Convert image to grayscale using luminosity method.
   * @param {HTMLImageElement} imageElement
   * Side effects: updates `imageElement.src` with modified image.
   */
  function grayscaleImage(imageElement) {
    hasChanges = true;
    const modifiedCanvas = modifyImagePixels(imageElement, (row, col, r, g, b, a) => {
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      return {
        r: gray,
        g: gray,
        b: gray,
        a: a
      };
    });
    
    imageElement.src = modifiedCanvas.toDataURL();
  }

  /**
   * Apply a vignette-like darkening from image edges toward center.
   * @param {HTMLImageElement} imageElement
   * Side effects: updates `imageElement.src` with modified image.
   */
  function reduceBrightnessByPosition(imageElement) {
    hasChanges = true;
    const modifiedCanvas = modifyImagePixels(imageElement, (row, col, r, g, b, a) => {
      const width = imageElement.naturalWidth || imageElement.width;
      const height = imageElement.naturalHeight || imageElement.height;
      
      // Calculate distance from nearest edge (top, bottom, left, right)
      const distanceToNearestEdge = Math.min(row, col, height - 1 - row, width - 1 - col);
      const maxDistance = Math.min(width / 2, height / 2);
      
      // Distance factor: 1 at edges, 0 at center
      const distanceFactor = Math.max(0, 1 - (distanceToNearestEdge / maxDistance));
      
      return {
        r: Math.round(r * (1 - distanceFactor * 0.5)),
        g: Math.round(g * (1 - distanceFactor * 0.5)),
        b: Math.round(b * (1 - distanceFactor * 0.5)),
        a: a
      };
    });
    
    imageElement.src = modifiedCanvas.toDataURL();
  }

  /**
   * Apply a beige color overlay/mix to the image.
   * @param {HTMLImageElement} imageElement
   * Side effects: updates `imageElement.src` with modified image.
   */
  function beigeImage(imageElement) {
    hasChanges = true;
    const beige = { r: 232, g: 218, b: 188 };
    const strength = 0.3; // 0 = no effect, 1 = full beige

    const modifiedCanvas = modifyImagePixels(
      imageElement,
      (row, col, r, g, b, a) => {
        return {
          r: r * (1 - strength) + beige.r * strength,
          g: g * (1 - strength) + beige.g * strength,
          b: b * (1 - strength) + beige.b * strength,
          a: a
        };
      }
    );

    imageElement.src = modifiedCanvas.toDataURL();
  }

  /**
   * Compute a height map (grayscale normalized) from an image.
   * @param {HTMLImageElement} imageElement
   * @returns {{heightMap:Float32Array, width:number, height:number}}
   */
  function computeHeightMap(imageElement) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = imageElement.naturalWidth || imageElement.width;
    canvas.height = imageElement.naturalHeight || imageElement.height;

    ctx.drawImage(imageElement, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const heightMap = new Float32Array(canvas.width * canvas.height);

    for (let i = 0; i < heightMap.length; i++) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      heightMap[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    }

    return {
      heightMap,
      width: canvas.width,
      height: canvas.height
    };
  }

  /**
   * Render the height map as a grayscale image.
   * @param {HTMLImageElement} imageElement
   * Side effects: updates `imageElement.src` with modified image.
   */
  function heightImage(imageElement) {
    hasChanges = true;
    const { heightMap, width, height } = computeHeightMap(imageElement);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let i = 0; i < heightMap.length; i++) {
      const v = heightMap[i] * 255;
      const idx = i * 4;

      data[idx]     = v;
      data[idx + 1] = v;
      data[idx + 2] = v;
      data[idx + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
    imageElement.src = canvas.toDataURL();
  }

  /**
   * Compute normals from a height map and render as RGB normal map.
   * @param {HTMLImageElement} imageElement
   * @param {number} [strength=1] - Normal strength multiplier.
   * Side effects: updates `imageElement.src` with modified image.
   */
  function normalImage(imageElement, strength = 1) {
    hasChanges = true;
    const { heightMap, width, height } = computeHeightMap(imageElement);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;

    // Draw the original image to get alpha values
    ctx.drawImage(imageElement, 0, 0, width, height);
    const originalImageData = ctx.getImageData(0, 0, width, height);
    const originalData = originalImageData.data;

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {

        const i = y * width + x;

        const hL = heightMap[y * width + Math.max(x - 1, 0)];
        const hR = heightMap[y * width + Math.min(x + 1, width - 1)];
        const hU = heightMap[Math.max(y - 1, 0) * width + x];
        const hD = heightMap[Math.min(y + 1, height - 1) * width + x];

        const dx = (hR - hL) * strength;
        const dy = (hD - hU) * strength;

        let nx = -dx;
        let ny = -dy;
        let nz = 1;

        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        nx /= len;
        ny /= len;
        nz /= len;

        const idx = i * 4;
        data[idx]     = (nx * 0.5 + 0.5) * 255;
        data[idx + 1] = (ny * 0.5 + 0.5) * 255;
        data[idx + 2] = (nz * 0.5 + 0.5) * 255;
        data[idx + 3] = originalData[idx + 3]; // Preserve original alpha
      }
    }

    ctx.putImageData(imageData, 0, 0);
    imageElement.src = canvas.toDataURL();
  }

  /**
   * Rebuild an image from separated RGBA channels using slider multipliers.
   * Uses `channelData` global arrays. Expects `channelData` to be populated.
   * @param {HTMLImageElement} imageElement
   * Side effects: updates `imageElement.src` and sets `isApplyingRGBA=true`.
   */
  function applyRGBAMultipliers(imageElement) {
    // Delegate to unified channel+brightness applier so RGBA sliders and
    // brightness slider compose correctly.
    const rValue = redSlider.value;
    const gValue = greenSlider.value;
    const bValue = blueSlider.value;
    const aValue = alphaSlider.value;
    const brightnessValue = brightnessSlider ? brightnessSlider.value : 100;
    applyChannelBrightness(imageElement, rValue, gValue, bValue, aValue, brightnessValue);
  }

  /**
   * Attach input listeners to RGBA and brightness sliders to update values
   * and reapply effects in real time.
   */
  function setupSliderListeners() {
    const sliderList = [redSlider, greenSlider, blueSlider, alphaSlider, brightnessSlider];
    const sliderValuePairs = [
      {
        slider: redSlider,
        valueInput: redValue,
        resetButton: redResetBtn,
        defaultValue: DEFAULT_CHANNEL_VALUES.red,
        apply: () => applyRGBAMultipliers(preview)
      },
      {
        slider: greenSlider,
        valueInput: greenValue,
        resetButton: greenResetBtn,
        defaultValue: DEFAULT_CHANNEL_VALUES.green,
        apply: () => applyRGBAMultipliers(preview)
      },
      {
        slider: blueSlider,
        valueInput: blueValue,
        resetButton: blueResetBtn,
        defaultValue: DEFAULT_CHANNEL_VALUES.blue,
        apply: () => applyRGBAMultipliers(preview)
      },
      {
        slider: alphaSlider,
        valueInput: alphaValue,
        resetButton: alphaResetBtn,
        defaultValue: DEFAULT_CHANNEL_VALUES.alpha,
        apply: () => applyRGBAMultipliers(preview)
      },
      {
        slider: brightnessSlider,
        valueInput: brightnessValue,
        resetButton: brightnessResetBtn,
        defaultValue: DEFAULT_CHANNEL_VALUES.brightness,
        apply: () => applyBrightness(preview, brightnessSlider.value)
      }
    ];

    function captureSliderHistoryIfNeeded() {
      if (isImageLoaded() && sliderHistoryArmed) {
        saveImageState(preview);
        sliderHistoryArmed = false;
      }
    }

    function armSliderHistory() {
      sliderHistoryArmed = true;
    }

    function clampToControlRange(control, rawValue) {
      const min = Number(control.min);
      const max = Number(control.max);
      const parsed = Number.parseInt(rawValue, 10);
      if (!Number.isFinite(parsed)) return control.value;
      return String(Math.min(max, Math.max(min, parsed)));
    }

    function applyValueInputChange(pair, allowEmpty = false) {
      if (allowEmpty && pair.valueInput.value.trim() === '') return;
      const nextValue = clampToControlRange(pair.slider, pair.valueInput.value);
      pair.slider.value = nextValue;
      pair.valueInput.value = nextValue;
      if (isImageLoaded()) {
        captureSliderHistoryIfNeeded();
        pair.apply();
      }
    }

    for (const slider of sliderList) {
      slider.addEventListener('pointerdown', armSliderHistory);
      slider.addEventListener('change', armSliderHistory);
      slider.addEventListener('blur', armSliderHistory);
    }

    for (const pair of sliderValuePairs) {
      pair.slider.addEventListener('input', () => {
        pair.valueInput.value = pair.slider.value;
        if (isImageLoaded()) {
          captureSliderHistoryIfNeeded();
          pair.apply();
        }
      });
      pair.valueInput.addEventListener('focus', armSliderHistory);
      pair.valueInput.addEventListener('pointerdown', armSliderHistory);
      pair.valueInput.addEventListener('input', () => applyValueInputChange(pair, true));
      pair.valueInput.addEventListener('change', () => {
        applyValueInputChange(pair);
        armSliderHistory();
      });
      pair.valueInput.addEventListener('blur', () => {
        applyValueInputChange(pair);
        armSliderHistory();
      });
      if (pair.resetButton) {
        pair.resetButton.addEventListener('click', () => {
          if (pair.slider.value === pair.defaultValue) return;
          if (isImageLoaded()) {
            saveImageState(preview);
          }
          pair.slider.value = pair.defaultValue;
          pair.valueInput.value = pair.defaultValue;
          if (isImageLoaded()) {
            pair.apply();
          }
          sliderHistoryArmed = true;
        });
      }
    }
  }

  /**
   * Get reliable image dimensions (prefers naturalWidth/naturalHeight).
   * @param {HTMLImageElement} imageElement
   * @returns {{width:number,height:number}|null} null if invalid dimensions.
   */
  function getImageDimensions(imageElement) {
    let width = imageElement.naturalWidth || imageElement.width;
    let height = imageElement.naturalHeight || imageElement.height;
    
    if (width === 0 || height === 0 || !width || !height) {
      width = imageElement.offsetWidth || imageElement.width;
      height = imageElement.offsetHeight || imageElement.height;
    }
    
    if (width <= 0 || height <= 0) {
      console.warn('Invalid image dimensions:', width, height);
      return null;
    }
    
    return { width, height };
  }

  function updateHistoryControls() {
    if (restoreBtn) restoreBtn.disabled = undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
    updateHistoryProgress();
  }

  function updateHistoryProgress() {
    const undoUsed = undoStack.length;
    const redoUsed = redoStack.length;
    const undoFree = Math.max(0, MAX_HISTORY_STEPS - undoUsed);
    const redoFree = Math.max(0, MAX_HISTORY_STEPS - redoUsed);
    const undoWidth = Math.max(0, Math.min(100, (undoUsed / MAX_HISTORY_STEPS) * 100));
    const redoWidth = Math.max(0, Math.min(100, (redoUsed / MAX_HISTORY_STEPS) * 100));

    if (undoProgressFill) undoProgressFill.style.width = `${undoWidth}%`;
    if (redoProgressFill) redoProgressFill.style.width = `${redoWidth}%`;
    if (undoProgressText) undoProgressText.textContent = `Used ${undoUsed} / Free ${undoFree}`;
    if (redoProgressText) redoProgressText.textContent = `Used ${redoUsed} / Free ${redoFree}`;
  }

  function clearHistory() {
    undoStack = [];
    redoStack = [];
    armTransformHistory();
    updateHistoryControls();
  }

  function createImageSnapshot(imageElement) {
    const dims = getImageDimensions(imageElement);
    if (!dims) return null;

    const imageWidth = dims.width;
    const imageHeight = dims.height;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = imageWidth;
    canvas.height = imageHeight;
    ctx.drawImage(imageElement, 0, 0, imageWidth, imageHeight);

    return {
      width: imageWidth,
      height: imageHeight,
      dataUrl: canvas.toDataURL('image/png'),
      transform: {
        offsetX,
        offsetY,
        width,
        height,
        rotation,
        isFlipped
      }
    };
  }

  function applyHistorySnapshot(imageElement, snapshot) {
    if (!snapshot) return;

    const applyTransformSnapshot = () => {
      const transform = snapshot.transform;
      if (!transform) return;
      if (Number.isFinite(transform.offsetX)) offsetX = transform.offsetX;
      if (Number.isFinite(transform.offsetY)) offsetY = transform.offsetY;
      if (Number.isFinite(transform.width)) width = transform.width;
      if (Number.isFinite(transform.height)) height = transform.height;
      if (Number.isFinite(transform.rotation)) rotation = transform.rotation;
      isFlipped = Boolean(transform.isFlipped);
      updateImageTransform();
    };

    if (!snapshot.dataUrl || imageElement.src === snapshot.dataUrl) {
      applyTransformSnapshot();
      return;
    }

    imageElement.addEventListener('load', applyTransformSnapshot, { once: true });
    imageElement.src = snapshot.dataUrl;
  }

  /**
   * Capture the current image state to the undo stack and reset redo stack.
   * This should be called immediately before applying a destructive edit.
   */
  function saveImageState(imageElement) {
    const snapshot = createImageSnapshot(imageElement);
    if (!snapshot) return;

    undoStack.push(snapshot);
    if (undoStack.length > MAX_HISTORY_STEPS) {
      undoStack.shift();
    }
    redoStack = [];
    hasChanges = true;
    updateHistoryControls();
  }

  function restoreImageState(imageElement) {
    if (undoStack.length === 0) return;

    const currentSnapshot = createImageSnapshot(imageElement);
    const previousSnapshot = undoStack.pop();
    if (currentSnapshot) {
      redoStack.push(currentSnapshot);
      if (redoStack.length > MAX_HISTORY_STEPS) {
        redoStack.shift();
      }
    }
    applyHistorySnapshot(imageElement, previousSnapshot);
    updateHistoryControls();
  }

  function redoImageState(imageElement) {
    if (redoStack.length === 0) return;

    const currentSnapshot = createImageSnapshot(imageElement);
    const redoSnapshot = redoStack.pop();
    if (currentSnapshot) {
      undoStack.push(currentSnapshot);
      if (undoStack.length > MAX_HISTORY_STEPS) {
        undoStack.shift();
      }
    }
    applyHistorySnapshot(imageElement, redoSnapshot);
    updateHistoryControls();
  }

  /**
   * Reload the page to reset the app to its initial state.
   */
  function reloadPage() {
    location.reload();
  }

  /**
   * Apply Sobel edge detection to `imageElement` and update its src.
   * @param {HTMLImageElement} imageElement
   * Side effects: updates `imageElement.src` and sets `hasChanges=true`.
   */
  function applySobelFilter(imageElement) {
    hasChanges = true;
    const dims = getImageDimensions(imageElement);
    if (!dims) return;
    
    const { width, height } = dims;
    
    // Create canvas with exact image dimensions
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(imageElement, 0, 0, width, height);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const outputData = ctx.createImageData(width, height);
    const output = outputData.data;
    
    // Convert to grayscale
    const grayscale = new Uint8ClampedArray(width * height);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      grayscale[j] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }
    
    // Pre-computed Sobel kernel values
    const sobelKernels = {
      xKernel: [-1, 0, 1, -2, 0, 2, -1, 0, 1],
      yKernel: [-1, -2, -1, 0, 0, 0, 1, 2, 1]
    };
    
    let maxMagnitude = 0;
    const magnitudes = new Float32Array(width * height);
    
    // Apply Sobel operator - single pass
    for (let y = 1; y < height - 1; y++) {
      const yOffset = y * width;
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        const centerOffset = yOffset + x;
        
        // Apply kernels using pre-computed flattened arrays
        let kernelIdx = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const rowOffset = (yOffset + dy * width);
          for (let dx = -1; dx <= 1; dx++) {
            const pixel = grayscale[rowOffset + x + dx];
            gx += pixel * sobelKernels.xKernel[kernelIdx];
            gy += pixel * sobelKernels.yKernel[kernelIdx];
            kernelIdx++;
          }
        }
        
        const magnitude = Math.hypot(gx, gy);
        magnitudes[centerOffset] = magnitude;
        if (magnitude > maxMagnitude) maxMagnitude = magnitude;
      }
    }
    
    // Apply results to output with normalization
    const normFactor = maxMagnitude > 0 ? 255 / maxMagnitude : 0;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const value = Math.round(magnitudes[y * width + x] * normFactor);
        output[idx] = output[idx + 1] = output[idx + 2] = value;
        output[idx + 3] = data[idx + 3]; // Preserve original alpha
      }
    }
    
    // Fill borders with original values
    for (let i = 0; i < width * 4; i += 4) {
      output[i] = output[i + 1] = output[i + 2] = 0;
      output[i + 3] = data[i + 3]; // Preserve original alpha
      output[((height - 1) * width * 4) + i] = 0;
      output[((height - 1) * width * 4) + i + 1] = 0;
      output[((height - 1) * width * 4) + i + 2] = 0;
      output[((height - 1) * width * 4) + i + 3] = data[((height - 1) * width * 4) + i + 3]; // Preserve original alpha
    }
    for (let y = 1; y < height - 1; y++) {
      const idx = y * width * 4;
      output[idx] = output[idx + 1] = output[idx + 2] = 0;
      output[idx + 3] = data[idx + 3]; // Preserve original alpha
      output[idx + (width - 1) * 4] = 0;
      output[idx + (width - 1) * 4 + 1] = 0;
      output[idx + (width - 1) * 4 + 2] = 0;
      output[idx + (width - 1) * 4 + 3] = data[idx + (width - 1) * 4 + 3]; // Preserve original alpha
    }
    
    ctx.putImageData(outputData, 0, 0);
    imageElement.src = canvas.toDataURL();
  }

  /**
   * Reconstruct the image from stored channel data scaled by `brightnessValue`.
   * @param {HTMLImageElement} imageElement
   * @param {number} brightnessValue - percent (100 = original)
   * Side effects: updates `imageElement.src` and sets `isApplyingRGBA=true`.
   */
  function applyBrightness(imageElement, brightnessValue) {
    // Keep backward compatibility: delegate to unified applier.
    const rValue = redSlider ? redSlider.value : 255;
    const gValue = greenSlider ? greenSlider.value : 255;
    const bValue = blueSlider ? blueSlider.value : 255;
    const aValue = alphaSlider ? alphaSlider.value : 255;
    applyChannelBrightness(imageElement, rValue, gValue, bValue, aValue, brightnessValue);
  }

  /**
   * Apply RGBA multipliers and brightness together using the separated
   * channel buffers stored in `channelData`.
   * @param {HTMLImageElement} imageElement
   * @param {number|string} rValue - 0-255 slider value for red
   * @param {number|string} gValue - 0-255 slider value for green
   * @param {number|string} bValue - 0-255 slider value for blue
   * @param {number|string} aValue - 0-255 slider value for alpha
   * @param {number|string} brightnessValue - percent (100 = original)
   */
  function applyChannelBrightness(imageElement, rValue, gValue, bValue, aValue, brightnessValue) {
    if (!channelData.red) return;
    hasChanges = true;

    const rv = Number(rValue) / 255;
    const gv = Number(gValue) / 255;
    const bv = Number(bValue) / 255;
    const av = Number(aValue) / 255;
    const brightnessFactor = Number(brightnessValue) / 100;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = channelData.width;
    canvas.height = channelData.height;

    const imageData = ctx.createImageData(channelData.width, channelData.height);
    const data = imageData.data;
    const pixelCount = channelData.width * channelData.height;

    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4;
      // Apply channel multiplier then brightness factor, clamp to [0,255]
      data[idx]     = Math.min(255, Math.round(channelData.red[i]   * rv * brightnessFactor));
      data[idx + 1] = Math.min(255, Math.round(channelData.green[i] * gv * brightnessFactor));
      data[idx + 2] = Math.min(255, Math.round(channelData.blue[i]  * bv * brightnessFactor));
      data[idx + 3] = Math.min(255, Math.round(channelData.alpha[i] * av));
    }

    ctx.putImageData(imageData, 0, 0);
    isApplyingRGBA = true;
    imageElement.src = canvas.toDataURL();
  }

  /**
   * Create a PNG of the image in its current displayed state (size + flip + rotation)
   * and trigger a download.
   * @param {HTMLImageElement} imageElement
   * @param {string} filename
   */
  function downloadImage(imageElement, filename = 'image.png') {
    try {
      const originalWidth = imageElement.naturalWidth;
      const originalHeight = imageElement.naturalHeight;

      if (!originalWidth || !originalHeight) {
        console.error("Image not fully loaded or invalid.");
        return;
      }

      // Determine canvas dimensions based on rotation
      let canvasWidth = originalWidth;
      let canvasHeight = originalHeight;
      
      // For 90 and 270 degree rotations, swap dimensions
      if (rotation === 90 || rotation === 270) {
        canvasWidth = originalHeight;
        canvasHeight = originalWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const ctx = canvas.getContext('2d');

      // Save context state
      ctx.save();

      // Move to canvas center
      ctx.translate(canvasWidth / 2, canvasHeight / 2);

      // Apply rotation in radians
      ctx.rotate((rotation * Math.PI) / 180);

      // Apply horizontal flip if active
      if (isFlipped) {
        ctx.scale(-1, 1);
      }

      // Draw full-resolution image centered
      ctx.drawImage(imageElement, -originalWidth / 2, -originalHeight / 2, originalWidth, originalHeight);

      // Restore context state
      ctx.restore();

      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Failed to convert canvas to blob for download');
          return;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, 'image/png');

    } catch (err) {
      console.error('downloadImage error:', err);
    }
  }

  /**
   * Apply posterization (color banding) to an image.
   * @param {HTMLImageElement} imageElement
   * @param {number} [levels=4] number of color levels per channel
   * Side effects: updates `imageElement.src`.
   */
  function applyPolarization(imageElement, levels = 4) {
    hasChanges = true;
    const dims = getImageDimensions(imageElement);
    if (!dims) return;
    
    levels = Math.max(2, Math.min(256, Math.round(levels)));
    const { width, height } = dims;
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(imageElement, 0, 0, width, height);
    
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const colorStep = Math.floor(256 / levels);
    
    // Apply posterization in single pass
    for (let i = 0; i < data.length; i += 4) {
      const r = Math.floor(data[i] / colorStep) * colorStep;
      const g = Math.floor(data[i + 1] / colorStep) * colorStep;
      const b = Math.floor(data[i + 2] / colorStep) * colorStep;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      // data[i + 3] unchanged (alpha)
    }
    
    ctx.putImageData(imageData, 0, 0);
    imageElement.src = canvas.toDataURL();
  }

  /**
   * Apply a paint-like acrylic effect using a box blur + posterization.
   * @param {HTMLImageElement} imageElement
   * @param {number} [brushSize=5]
   * @param {number} [colorReduction=4]
   * Side effects: updates `imageElement.src`.
   */
  function applyAcrylicFilter(imageElement, brushSize = 5, colorReduction = 4) {
    hasChanges = true;
    const dims = getImageDimensions(imageElement);
    if (!dims) return;
    
    brushSize = Math.max(1, Math.min(15, Math.round(brushSize)));
    colorReduction = Math.max(2, Math.min(32, Math.round(colorReduction)));
    
    const { width, height } = dims;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(imageElement, 0, 0, width, height);
    
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const blurred = new Uint8ClampedArray(data);
    
    const colorStep = Math.floor(256 / colorReduction);
    const radius = brushSize;
    
    // Apply optimized box blur with posterization
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        let sumR = 0, sumG = 0, sumB = 0;
        let count = 0;
        
        // Box blur - only process pixels within radius
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            sumR += data[idx];
            sumG += data[idx + 1];
            sumB += data[idx + 2];
            count++;
          }
        }
        
        // Average and posterize
        const avgR = sumR / count;
        const avgG = sumG / count;
        const avgB = sumB / count;
        
        const idx = (y * width + x) * 4;
        blurred[idx] = Math.floor(avgR / colorStep) * colorStep;
        blurred[idx + 1] = Math.floor(avgG / colorStep) * colorStep;
        blurred[idx + 2] = Math.floor(avgB / colorStep) * colorStep;
        blurred[idx + 3] = data[idx + 3];
      }
    }
    
    // Copy blurred data back in one pass.
    data.set(blurred);
    
    ctx.putImageData(imageData, 0, 0);
    imageElement.src = canvas.toDataURL();
  }

  /**
   * Apply a median filter for noise reduction.
   * @param {HTMLImageElement} imageElement
   * @param {number} [radius=2] neighborhood radius
   * Side effects: updates `imageElement.src`.
   */
  function applyMedianFilter(imageElement, radius = 2) {
    hasChanges = true;
    const dims = getImageDimensions(imageElement);
    if (!dims) return;
    
    radius = Math.max(1, Math.min(10, Math.round(radius)));
    const { width, height } = dims;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(imageElement, 0, 0, width, height);
    
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const filtered = new Uint8ClampedArray(data);
    
    // Helper function to find median of an array
    const getMedian = (arr) => {
      arr.sort((a, b) => a - b);
      const mid = Math.floor(arr.length / 2);
      return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
    };
    
    // Apply median filter
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const pixelsR = [];
        const pixelsG = [];
        const pixelsB = [];
        
        // Collect pixels in the radius neighborhood
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            pixelsR.push(data[idx]);
            pixelsG.push(data[idx + 1]);
            pixelsB.push(data[idx + 2]);
          }
        }
        
        // Calculate median for each channel
        const medianR = Math.round(getMedian(pixelsR));
        const medianG = Math.round(getMedian(pixelsG));
        const medianB = Math.round(getMedian(pixelsB));
        
        // Set the filtered pixel
        const idx = (y * width + x) * 4;
        filtered[idx] = medianR;
        filtered[idx + 1] = medianG;
        filtered[idx + 2] = medianB;
        filtered[idx + 3] = data[idx + 3]; // Preserve alpha
      }
    }
    
    // Handle borders by copying nearby pixels
    for (let i = 0; i < width * radius * 4; i++) {
      filtered[i] = data[i];
    }
    for (let i = (height - radius) * width * 4; i < height * width * 4; i++) {
      filtered[i] = data[i];
    }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < radius; x++) {
        const idx = (y * width + x) * 4;
        filtered[idx] = data[idx];
        filtered[idx + 1] = data[idx + 1];
        filtered[idx + 2] = data[idx + 2];
        filtered[idx + 3] = data[idx + 3];
        
        const rightIdx = (y * width + (width - 1 - x)) * 4;
        filtered[rightIdx] = data[rightIdx];
        filtered[rightIdx + 1] = data[rightIdx + 1];
        filtered[rightIdx + 2] = data[rightIdx + 2];
        filtered[rightIdx + 3] = data[rightIdx + 3];
      }
    }
    
    // Copy filtered data back in one pass.
    data.set(filtered);
    
    ctx.putImageData(imageData, 0, 0);
    imageElement.src = canvas.toDataURL();
  }

  // Call setup once the script loads
  setupSliderListeners();
  updateHistoryControls();
});
