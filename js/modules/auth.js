/**
 * Auth module - local demo + ready for Supabase Auth
 * Solo 2 usuarios: tú y tu mamá
 */

const USERS_KEY = 'novedades-nl-users';
const SESSION_KEY = 'novedades-nl-session';

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [];
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function simpleHash(str) {
  // Demo only - not secure. In production use Supabase Auth.
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return 'h' + Math.abs(h).toString(36);
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || !session.email) return null;
    return session;
  } catch (_) {
    return null;
  }
}

export function isLoggedIn() {
  return !!getSession();
}

export function getCurrentUser() {
  return getSession();
}

export function register({ email, password, name }) {
  const users = loadUsers();
  const normalized = email.trim().toLowerCase();
  if (users.some(u => u.email === normalized)) {
    return { ok: false, error: 'Este correo ya está registrado' };
  }
  if (password.length < 6) {
    return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres' };
  }
  if (!name || name.trim().length < 2) {
    return { ok: false, error: 'Escribe tu nombre (mínimo 2 caracteres)' };
  }

  const user = {
    id: 'user-' + Date.now(),
    email: normalized,
    passwordHash: simpleHash(password),
    name: name.trim(),
    createdAt: new Date().toISOString()
  };
  users.push(user);
  saveUsers(users);

  // Auto login
  const session = { id: user.id, email: user.email, name: user.name };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return { ok: true, user: session };
}

export function login({ email, password }) {
  const users = loadUsers();
  const normalized = email.trim().toLowerCase();
  const user = users.find(u => u.email === normalized);
  if (!user) {
    return { ok: false, error: 'Correo o contraseña incorrectos' };
  }
  if (user.passwordHash !== simpleHash(password)) {
    return { ok: false, error: 'Correo o contraseña incorrectos' };
  }
  const session = { id: user.id, email: user.email, name: user.name };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return { ok: true, user: session };
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function updateProfile({ name }) {
  const session = getSession();
  if (!session) return { ok: false, error: 'No hay sesión' };
  const users = loadUsers();
  const idx = users.findIndex(u => u.id === session.id);
  if (idx === -1) return { ok: false, error: 'Usuario no encontrado' };
  if (!name || name.trim().length < 2) {
    return { ok: false, error: 'Nombre inválido' };
  }
  users[idx].name = name.trim();
  saveUsers(users);
  const newSession = { ...session, name: name.trim() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
  return { ok: true, user: newSession };
}

/**
 * "Olvidé contraseña" - demo: genera una temporal y la muestra
 * En producción con Supabase: supabase.auth.resetPasswordForEmail(email)
 */
export function requestPasswordReset(email) {
  const users = loadUsers();
  const normalized = email.trim().toLowerCase();
  const user = users.find(u => u.email === normalized);
  if (!user) {
    // No revelar si existe o no
    return { ok: true, message: 'Si el correo existe, recibirás instrucciones.' };
  }
  // Demo: generar temporal
  const temp = 'Temp' + Math.random().toString(36).slice(2, 8);
  user.passwordHash = simpleHash(temp);
  saveUsers(users);
  return {
    ok: true,
    message: 'Contraseña temporal generada (solo demo).',
    tempPassword: temp
  };
}

export function changePassword({ currentPassword, newPassword }) {
  const session = getSession();
  if (!session) return { ok: false, error: 'No hay sesión' };
  const users = loadUsers();
  const user = users.find(u => u.id === session.id);
  if (!user) return { ok: false, error: 'Usuario no encontrado' };
  if (user.passwordHash !== simpleHash(currentPassword)) {
    return { ok: false, error: 'Contraseña actual incorrecta' };
  }
  if (newPassword.length < 6) {
    return { ok: false, error: 'La nueva contraseña debe tener al menos 6 caracteres' };
  }
  user.passwordHash = simpleHash(newPassword);
  saveUsers(users);
  return { ok: true };
}
