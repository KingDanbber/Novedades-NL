/**
 * Cloudinary direct upload (unsigned preset recommended)
 */

import * as store from './store.js';

export async function uploadImage(file) {
  const config = store.getConfig();
  const cloudName = config.cloudName || 'dzh0gjzet';
  const preset = config.cloudPreset;

  if (!preset) {
    throw new Error(
      'Configura un Upload Preset (unsigned) en Cloudinary y guárdalo en Configuración. ' +
      'Cloudinary Dashboard → Settings → Upload → Upload presets → Add upload preset → Signing mode: Unsigned.'
    );
  }

  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Selecciona un archivo de imagen válido');
  }

  // Max ~5MB for reasonable mobile
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('La imagen no debe superar 5 MB');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', preset);
  formData.append('folder', 'novedades-nl/products');

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Error al subir la imagen a Cloudinary');
  }

  const data = await res.json();
  return data.secure_url;
}
