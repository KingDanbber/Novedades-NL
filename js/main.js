import { initTheme, toggleTheme } from './modules/theme.js';
import { initNavigation, navigateTo, showToast } from './modules/ui.js';
import * as store from './modules/store.js';
import * as auth from './modules/auth.js';
import {
  renderDashboard,
  renderProducts,
  openProductForm,
  openRestockForm,
  renderClients,
  openClientForm,
  renderSales,
  openSaleForm,
  renderReports,
  renderConfig
} from './modules/pages.js';

// Init theme always
initTheme();

document.querySelector('[data-theme-toggle]')?.addEventListener('click', toggleTheme);

// Password show/hide toggles
document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-toggle-password');
    const input = document.getElementById(id);
    if (!input) return;
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    btn.setAttribute('aria-pressed', showing ? 'false' : 'true');
    btn.setAttribute('aria-label', showing ? 'Mostrar contraseña' : 'Ocultar contraseña');
    btn.setAttribute('title', showing ? 'Mostrar contraseña' : 'Ocultar contraseña');
    const eye = btn.querySelector('.icon-eye');
    const eyeOff = btn.querySelector('.icon-eye-off');
    if (eye && eyeOff) {
      if (showing) {
        eye.hidden = false;
        eyeOff.hidden = true;
      } else {
        eye.hidden = true;
        eyeOff.hidden = false;
      }
    }
  });
});


// ========== AUTH GATE ==========
const authScreen = document.getElementById('authScreen');
const appRoot = document.getElementById('appRoot');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const forgotForm = document.getElementById('forgotForm');

function showForm(which) {
  if (!loginForm || !registerForm || !forgotForm) return;
  loginForm.classList.toggle('is-visible', which === 'login');
  registerForm.classList.toggle('is-visible', which === 'register');
  forgotForm.classList.toggle('is-visible', which === 'forgot');
  const loginError = document.getElementById('loginError');
  const registerError = document.getElementById('registerError');
  const forgotError = document.getElementById('forgotError');
  const forgotSuccess = document.getElementById('forgotSuccess');
  if (loginError) loginError.style.display = 'none';
  if (registerError) registerError.style.display = 'none';
  if (forgotError) forgotError.style.display = 'none';
  if (forgotSuccess) forgotSuccess.style.display = 'none';
}

function showApp() {
  authScreen.classList.remove('is-visible');
  appRoot.classList.remove('is-hidden');
  const user = auth.getCurrentUser();
  const chip = document.getElementById('userChip');
  if (chip && user) chip.textContent = user.name;

  initNavigation();
  bindAppEvents();

  // Load from Supabase then render
  store.syncFromSupabase().then(() => {
    renderDashboard();
    const hash = location.hash.replace('#', '');
    if (hash && ['dashboard', 'productos', 'ventas', 'clientes', 'reportes', 'config'].includes(hash)) {
      navigateTo(hash);
    }
  }).catch(() => {
    renderDashboard();
  });
}

function showAuth() {
  authScreen.classList.add('is-visible');
  appRoot.classList.add('is-hidden');
  showForm('login');
}

if (auth.isLoggedIn()) {
  showApp();
} else {
  showAuth();
}

// Auth form toggles
document.getElementById('showRegister')?.addEventListener('click', () => showForm('register'));
document.getElementById('showForgot')?.addEventListener('click', () => showForm('forgot'));
document.getElementById('showLoginFromReg')?.addEventListener('click', () => showForm('login'));
document.getElementById('showLoginFromForgot')?.addEventListener('click', () => showForm('login'));

loginForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const result = auth.login({ email, password });
  const errEl = document.getElementById('loginError');
  if (!result.ok) {
    errEl.textContent = result.error;
    errEl.style.display = 'block';
    return;
  }
  showApp();
  showToast('Bienvenido/a, ' + result.user.name, 'success');
});

registerForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const result = auth.register({ email, password, name });
  const errEl = document.getElementById('registerError');
  if (!result.ok) {
    errEl.textContent = result.error;
    errEl.style.display = 'block';
    return;
  }
  showApp();
  showToast('Cuenta creada. Hola, ' + result.user.name, 'success');
});

forgotForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('forgotEmail').value;
  const result = auth.requestPasswordReset(email);
  const errEl = document.getElementById('forgotError');
  const okEl = document.getElementById('forgotSuccess');
  errEl.style.display = 'none';
  if (result.tempPassword) {
    okEl.innerHTML = 'Contraseña temporal (solo demo): <strong>' + result.tempPassword + '</strong><br>Úsala para iniciar sesión y luego cámbiala.';
    okEl.style.display = 'block';
  } else {
    okEl.textContent = result.message;
    okEl.style.display = 'block';
  }
});

document.getElementById('btnLogout')?.addEventListener('click', () => {
  if (confirm('¿Cerrar sesión?')) {
    auth.logout();
    location.reload();
  }
});

// ========== APP EVENTS ==========
function refreshPage(page) {
  switch (page) {
    case 'dashboard': renderDashboard(); break;
    case 'productos': renderProducts(); break;
    case 'clientes': renderClients(); break;
    case 'ventas': renderSales(); break;
    case 'reportes': renderReports(); break;
    case 'config': renderConfig(); break;
  }
}

window.addEventListener('pagechange', (e) => refreshPage(e.detail.page));

function bindAppEvents() {
  document.getElementById('btnAddProduct')?.addEventListener('click', () => openProductForm());
  document.getElementById('btnRestock')?.addEventListener('click', () => openRestockForm());
  document.getElementById('productSearch')?.addEventListener('input', () => renderProducts());
  document.getElementById('productCategoryFilter')?.addEventListener('change', () => renderProducts());

  document.getElementById('btnAddClient')?.addEventListener('click', () => openClientForm());
  document.getElementById('clientSearch')?.addEventListener('input', () => renderClients());

  document.getElementById('btnAddSale')?.addEventListener('click', () => openSaleForm());
  document.getElementById('saleSearch')?.addEventListener('input', () => renderSales());
  document.getElementById('saleStatusFilter')?.addEventListener('change', () => renderSales());

  document.getElementById('reportMonth')?.addEventListener('change', () => renderReports());

  document.getElementById('supabaseForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    store.setConfig({
      supabaseUrl: document.getElementById('supabaseUrl').value.trim(),
      supabaseKey: document.getElementById('supabaseKey').value.trim()
    });
    showToast('Configuración Supabase guardada', 'success');
    store.syncFromSupabase().then(() => {
      showToast('Datos sincronizados desde Supabase', 'success');
      refreshPage(document.querySelector('.page.is-active')?.dataset.page || 'dashboard');
    }).catch((err) => {
      showToast('Error al sincronizar: ' + (err.message || err), 'error');
    });
    renderConfig();
  });

  document.getElementById('cloudinaryForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    store.setConfig({
      cloudName: document.getElementById('cloudName').value.trim(),
      cloudPreset: document.getElementById('cloudPreset').value.trim()
    });
    showToast('Configuración Cloudinary guardada', 'success');
  });

  document.getElementById('btnLoadDemo')?.addEventListener('click', () => {
    if (confirm('¿Cargar datos de demostración? Se sobrescribirán productos, clientes y ventas actuales.')) {
      store.loadDemoData();
      showToast('Datos demo cargados', 'success');
      refreshPage(document.querySelector('.page.is-active')?.dataset.page || 'dashboard');
    }
  });

  document.getElementById('btnClearData')?.addEventListener('click', () => {
    if (confirm('¿Borrar TODOS los datos locales? Esta acción no se puede deshacer.')) {
      store.clearAllData();
      showToast('Datos eliminados', 'success');
      refreshPage(document.querySelector('.page.is-active')?.dataset.page || 'dashboard');
    }
  });
}
