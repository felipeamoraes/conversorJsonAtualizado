// Global variables
let originalJsonData = null;
let correctedJsonData = null;
let originalEditor = null;
let fixedEditor = null;
let isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

// Configuration
const config = {
  fixCodigo: true,
  fixCpf: true,
  fixNumeroInscricaoEmpregador: true,
  fixNumeroInscricaoEstabelecimento: true
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  initTheme();
  initEditors();
  initEventListeners();
  setCurrentYear();
});

// Initialize CodeMirror editors
function initEditors() {
  originalEditor = CodeMirror(document.getElementById('originalEditorContainer'), {
    mode: {name: "javascript", json: true},
    theme: isDarkMode ? 'darcula' : 'eclipse',
    lineNumbers: true,
    readOnly: false,
    gutters: ["CodeMirror-lint-markers"],
    lint: true,
    viewportMargin: Infinity,
    lineWrapping: true,
    placeholder: "Carregue ou cole um JSON para visualizar aqui..."
  });

  fixedEditor = CodeMirror(document.getElementById('fixedEditorContainer'), {
    mode: {name: "javascript", json: true},
    theme: isDarkMode ? 'darcula' : 'eclipse',
    lineNumbers: true,
    readOnly: true,
    gutters: ["CodeMirror-lint-markers"],
    lint: true,
    viewportMargin: Infinity,
    lineWrapping: true,
    placeholder: "O JSON corrigido aparecerá aqui..."
  });

  // Add change event listener to originalEditor
  originalEditor.on('change', function() {
    try {
      const content = originalEditor.getValue();
      if (content) {
        const parsed = JSON.parse(content);
        originalJsonData = parsed;
        document.getElementById('correctBtn').disabled = false;
        showToast('JSON válido!', 'success');
      } else {
        document.getElementById('correctBtn').disabled = true;
      }
    } catch (err) {
      console.log('Invalid JSON:', err);
      document.getElementById('correctBtn').disabled = content.length > 0 ? false : true;
    }
  });
}

// Initialize event listeners
function initEventListeners() {
  // File input change
  document.getElementById('jsonFile').addEventListener('change', handleFileSelect);
  
  // Drag and drop
  const dropZone = document.getElementById('dropZone');
  dropZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.stopPropagation();
    this.classList.add('border-primary');
  });
  
  dropZone.addEventListener('dragleave', function(e) {
    e.preventDefault();
    e.stopPropagation();
    this.classList.remove('border-primary');
  });
  
  dropZone.addEventListener('drop', function(e) {
    e.preventDefault();
    e.stopPropagation();
    this.classList.remove('border-primary');
    
    if (e.dataTransfer.files.length) {
      document.getElementById('jsonFile').files = e.dataTransfer.files;
      handleFileSelect({target: {files: e.dataTransfer.files}});
    }
  });
  
  // Click on dropzone should trigger file input
  dropZone.addEventListener('click', function() {
    document.getElementById('jsonFile').click();
  });
  
  // Remove file button
  document.getElementById('removeFile').addEventListener('click', function() {
    resetFileInput();
  });
  
  // Correct JSON button
  document.getElementById('correctBtn').addEventListener('click', function() {
    correctJson();
  });
  
  // Copy buttons
  document.getElementById('copyOriginal').addEventListener('click', function() {
    copyToClipboard(originalEditor.getValue(), 'JSON original copiado!');
  });
  
  document.getElementById('copyFixed').addEventListener('click', function() {
    copyToClipboard(fixedEditor.getValue(), 'JSON corrigido copiado!');
  });
  
  // Theme toggle
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  
  // Configuration checkboxes
  document.getElementById('fixCodigo').addEventListener('change', function(e) {
    config.fixCodigo = e.target.checked;
    if (originalJsonData) correctJson();
  });
  
  document.getElementById('fixCpf').addEventListener('change', function(e) {
    config.fixCpf = e.target.checked;
    if (originalJsonData) correctJson();
  });
  
  document.getElementById('fixNumeroInscricaoEmpregador').addEventListener('change', function(e) {
    config.fixNumeroInscricaoEmpregador = e.target.checked;
    if (originalJsonData) correctJson();
  });
  
  document.getElementById('fixNumeroInscricaoEstabelecimento').addEventListener('change', function(e) {
    config.fixNumeroInscricaoEstabelecimento = e.target.checked;
    if (originalJsonData) correctJson();
  });
}

// Handle file selection
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  // Check if file is JSON
  if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
    showToast('Erro: Selecione um arquivo JSON válido.', 'danger');
    resetFileInput();
    return;
  }
  
  // Show file info
  document.getElementById('fileInfo').classList.remove('d-none');
  document.getElementById('fileName').textContent = file.name;
  
  // Show loading overlay
  toggleLoadingOverlay(true);
  
  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      originalJsonData = JSON.parse(event.target.result);
      originalEditor.setValue(JSON.stringify(originalJsonData, null, 2));
      document.getElementById('correctBtn').disabled = false;
      showToast('Arquivo JSON carregado com sucesso!', 'success');
    } catch (err) {
      showToast(`Erro ao processar o arquivo: ${err.message}`, 'danger');
      resetFileInput();
    } finally {
      toggleLoadingOverlay(false);
    }
  };
  
  reader.onerror = function() {
    showToast('Erro ao ler o arquivo.', 'danger');
    toggleLoadingOverlay(false);
    resetFileInput();
  };
  
  reader.readAsText(file);
}

// Reset file input and related UI
function resetFileInput() {
  document.getElementById('jsonFile').value = '';
  document.getElementById('fileInfo').classList.add('d-none');
  document.getElementById('fileName').textContent = '';
  originalEditor.setValue('');
  fixedEditor.setValue('');
  document.getElementById('correctBtn').disabled = true;
  document.getElementById('downloadLink').classList.add('d-none');
  originalJsonData = null;
  correctedJsonData = null;
}

// Correct JSON function
function correctJson() {
  if (!originalJsonData) {
    try {
      const content = originalEditor.getValue();
      if (content) {
        originalJsonData = JSON.parse(content);
      } else {
        showToast('Carregue ou cole um JSON primeiro.', 'info');
        return;
      }
    } catch (err) {
      showToast(`JSON inválido: ${err.message}`, 'danger');
      return;
    }
  }
  
  toggleLoadingOverlay(true);
  
  // Use setTimeout to give UI time to update before processing
  setTimeout(() => {
    try {
      // Clone the original data to avoid modifying it
      const clonedData = JSON.parse(JSON.stringify(originalJsonData));
      
      if (Array.isArray(clonedData)) {
        correctedJsonData = clonedData.map(item => correctItem(item));
      } else {
        correctedJsonData = correctItem(clonedData);
      }
      
      const jsonString = JSON.stringify(correctedJsonData, null, 2);
      fixedEditor.setValue(jsonString);
      
      // Create download link
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.getElementById('downloadLink');
      downloadLink.href = url;
      downloadLink.download = 'json_corrigido.json';
      downloadLink.classList.remove('d-none');
      
      showToast('JSON corrigido com sucesso!', 'success');
      
      // Highlight differences
      highlightChanges();
    } catch (err) {
      showToast(`Erro ao corrigir JSON: ${err.message}`, 'danger');
    } finally {
      toggleLoadingOverlay(false);
    }
  }, 100);
}

// Apply corrections to a single item based on configuration
function correctItem(item) {
  // Deep clone to avoid reference issues
  let result = JSON.parse(JSON.stringify(item));
  
  if (config.fixCodigo && result.ifConcessora?.codigo !== undefined) {
    result.ifConcessora.codigo = result.ifConcessora.codigo.toString().padStart(3, '0');
  }

  if (config.fixCpf && result.cpf !== undefined) {
    result.cpf = result.cpf.toString().padStart(11, '0');
  }

  if (config.fixNumeroInscricaoEmpregador && result.numeroInscricaoEmpregador !== undefined) {
    result.numeroInscricaoEmpregador = result.numeroInscricaoEmpregador.toString();
  }

  if (config.fixNumeroInscricaoEstabelecimento && result.numeroInscricaoEstabelecimento !== undefined) {
    result.numeroInscricaoEstabelecimento = result.numeroInscricaoEstabelecimento.toString();
  }

  return result;
}

// Show toast notification
function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast show toast-animate`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  
  // Create toast content
  const toastHeader = document.createElement('div');
  toastHeader.className = `toast-header bg-${type} text-white`;
  
  // Add icon based on type
  let iconClass = 'fas fa-info-circle';
  if (type === 'success') iconClass = 'fas fa-check-circle';
  if (type === 'danger') iconClass = 'fas fa-exclamation-circle';
  if (type === 'warning') iconClass = 'fas fa-exclamation-triangle';
  
  toastHeader.innerHTML = `
    <i class="${iconClass} me-2"></i>
    <strong class="me-auto">Notificação</strong>
    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
  `;
  
  const toastBody = document.createElement('div');
  toastBody.className = 'toast-body';
  toastBody.textContent = message;
  
  toast.appendChild(toastHeader);
  toast.appendChild(toastBody);
  toastContainer.appendChild(toast);
  
  // Auto remove after 4 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, 4000);
  
  // Add close button functionality
  toast.querySelector('.btn-close').addEventListener('click', function() {
    toast.remove();
  });
}

// Copy text to clipboard
function copyToClipboard(text, successMessage) {
  if (!text) {
    showToast('Não há conteúdo para copiar.', 'info');
    return;
  }
  
  navigator.clipboard.writeText(text)
    .then(() => {
      showToast(successMessage, 'success');
    })
    .catch(err => {
      showToast(`Erro ao copiar: ${err}`, 'danger');
    });
}

// Toggle dark/light theme
function toggleTheme() {
  isDarkMode = !isDarkMode;
  applyTheme();
}

// Initialize theme based on user preference
function initTheme() {
  // Default to dark mode
  isDarkMode = true;
  applyTheme();
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (e.matches !== isDarkMode) {
      isDarkMode = e.matches;
      applyTheme();
    }
  });
}

// Apply theme to the application
function applyTheme() {
  const appContainer = document.getElementById('app-container');
  const theme = isDarkMode ? 'darcula' : 'eclipse';
  
  if (isDarkMode) {
    appContainer.setAttribute('data-bs-theme', 'dark');
  } else {
    appContainer.setAttribute('data-bs-theme', 'light');
  }
  
  // Update CodeMirror themes if editors are initialized
  if (originalEditor) {
    originalEditor.setOption('theme', theme);
  }
  
  if (fixedEditor) {
    fixedEditor.setOption('theme', theme);
  }
}

// Toggle loading overlay
function toggleLoadingOverlay(show) {
  const overlay = document.getElementById('loadingOverlay');
  if (show) {
    overlay.classList.remove('d-none');
    overlay.classList.add('d-flex');
  } else {
    overlay.classList.add('d-none');
    overlay.classList.remove('d-flex');
  }
}

// Highlight changes between original and corrected JSON
function highlightChanges() {
  const editorElement = document.getElementById('fixedEditorContainer');
  editorElement.classList.add('highlight-change');
  setTimeout(() => {
    editorElement.classList.remove('highlight-change');
  }, 1500);
}

// Set current year in footer
function setCurrentYear() {
  document.getElementById('currentYear').textContent = new Date().getFullYear();
}