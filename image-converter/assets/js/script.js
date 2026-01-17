document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const uploadArea = document.getElementById('upload-area');
  const fileInput = document.getElementById('file-input');
  const editorArea = document.getElementById('editor-area');
  const imagePreview = document.getElementById('image-preview');
  const fileInfo = document.getElementById('file-info');
  const qualitySlider = document.getElementById('quality-slider');
  const qualityValue = document.getElementById('quality-value');
  const convertBtn = document.getElementById('convert-btn');
  const resetBtn = document.getElementById('reset-btn');
  const formatRadios = document.getElementsByName('format');

  let originalFile = null;

  // Event Listeners for Upload Area
  uploadArea.addEventListener('click', () => fileInput.click());

  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  // Handle File Selection
  function handleFile(file) {
    if (!file.type.match('image.*')) {
      alert('画像ファイルを選択してください (JPG, PNG)');
      return;
    }

    originalFile = file;

    // Setup Editor
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      fileInfo.textContent = `元のファイル: ${file.name} (${formatBytes(file.size)})`;
      uploadArea.classList.add('hidden');
      editorArea.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }

  // Quality Slider Update
  qualitySlider.addEventListener('input', (e) => {
    qualityValue.textContent = e.target.value;
  });

  // Reset Button
  resetBtn.addEventListener('click', () => {
    originalFile = null;
    fileInput.value = '';
    imagePreview.src = '';
    uploadArea.classList.remove('hidden');
    editorArea.classList.add('hidden');
  });

  // Convert Button
  convertBtn.addEventListener('click', () => {
    if (!originalFile) return;

    const format = document.querySelector('input[name="format"]:checked').value;
    const quality = parseInt(qualitySlider.value) / 100;

    convertImage(imagePreview, format, quality);
  });

  // Image Conversion Logic
  function convertImage(imgElement, format, quality) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas dimensions
    canvas.width = imgElement.naturalWidth;
    canvas.height = imgElement.naturalHeight;

    // Draw image
    ctx.drawImage(imgElement, 0, 0);

    // Convert to blob
    canvas.toBlob((blob) => {
      if (!blob) {
        alert('変換に失敗しました。');
        return;
      }
      downloadFile(blob, format);
    }, format, quality);
  }

  // Download Helper
  function downloadFile(blob, format) {
    const ext = format === 'image/webp' ? 'webp' : 'avif';
    const fileName = originalFile.name.replace(/\.[^/.]+$/, "") + `.${ext}`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Utility: Format Bytes
  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
});
