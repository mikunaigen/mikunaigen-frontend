export const DOMINIOS_EMAIL_PERMITIDOS = [
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  'yahoo.com',
  'icloud.com',
] as const;

export function filtrarSoloDigitos(event: Event, maxLen: number): string {
  const input = event.target as HTMLInputElement;
  let v = input.value.replace(/\D/g, '');
  if (v.length > maxLen) v = v.substring(0, maxLen);
  input.value = v;
  return v;
}

export function filtrarSoloLetrasYEspacios(event: Event, maxLen?: number): string {
  const input = event.target as HTMLInputElement;
  let v = input.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g, '');
  v = v.replace(/\s+/g, ' ');
  if (maxLen && v.length > maxLen) v = v.substring(0, maxLen);
  input.value = v;
  return v;
}

export function bloquearTeclasNoNumericas(event: KeyboardEvent): void {
  const nav = [
    'Backspace',
    'Delete',
    'Tab',
    'Escape',
    'Enter',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End',
  ];
  if (nav.includes(event.key)) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key.length === 1 && /\d/.test(event.key)) return;
  event.preventDefault();
}

export function errorEmailHistoriaUsuario(email: string): string | null {
  const e = email.trim();
  if (!e) return 'El correo no puede estar en blanco.';
  if (!e.includes('@')) return 'El correo debe incluir el símbolo @.';
  const dom = e.split('@')[1]?.toLowerCase().trim();
  const permitidos: string[] = [...DOMINIOS_EMAIL_PERMITIDOS];
  if (!dom || !permitidos.includes(dom)) {
    return 'Solo se permiten dominios: gmail.com, outlook.com, hotmail.com, yahoo.com o icloud.com.';
  }
  return null;
}

export function errorEmailSoloGmail(email: string): string | null {
  const e = email.trim();
  if (!e) return 'El correo no puede estar en blanco.';
  if (!e.includes('@')) return 'El correo debe incluir el símbolo @.';
  const dom = e.split('@')[1]?.toLowerCase().trim();
  if (dom !== 'gmail.com') return 'Debe ser una cuenta @gmail.com.';
  return null;
}

export function errorTelefono9(digits: string): string | null {
  if (!digits?.length) return 'El teléfono no puede estar en blanco.';
  if (digits.length !== 9) return 'El teléfono debe tener exactamente 9 dígitos numéricos.';
  if (!digits.startsWith('9')) return 'El teléfono debe empezar con 9.';
  return null;
}

export function errorDni8(digits: string): string | null {
  if (!digits?.length) return 'El DNI no puede estar en blanco.';
  if (digits.length !== 8) return 'El DNI debe tener exactamente 8 dígitos numéricos.';
  return null;
}

export function errorCodigo6(digits: string): string | null {
  const d = digits?.trim() ?? '';
  if (!d) return 'El código no puede estar en blanco.';
  if (d.length !== 6) return 'El código debe tener exactamente 6 dígitos numéricos.';
  return null;
}

export const PASSWORD_HU_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@!¡¿?#$%/&])[A-Za-z\d@!¡¿?#$%/&]{8,}$/;

export function errorPasswordHistoria(
  password: string,
  confirmacion: string,
  nombreMinusculas: string,
  apellidoMinusculas: string,
): string | null {
  if (!PASSWORD_HU_REGEX.test(password)) {
    return 'La clave requiere: 8+ caracteres, mayúscula, minúscula, número y símbolo (@ ! ¡ ¿ ? # $ % & /).';
  }
  if (nombreMinusculas && password.toLowerCase().includes(nombreMinusculas)) {
    return 'La clave no puede contener tu nombre.';
  }
  if (apellidoMinusculas && password.toLowerCase().includes(apellidoMinusculas)) {
    return 'La clave no puede contener tu apellido.';
  }
  if (password !== confirmacion) return 'Las contraseñas no coinciden.';
  return null;
}

export function extraerNombreApellidoDeFullName(fullName: string): {
  nombre: string;
  apellido: string;
} {
  const partes = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    nombre: (partes[0] || '').toLowerCase(),
    apellido: (partes[1] || '').toLowerCase(),
  };
}

export function errorPasswordSmtpApp(p: string): string | null {
  if (!p?.trim()) return 'La contraseña de aplicación no puede estar vacía.';
  if (p.length < 16) return 'La contraseña de aplicación debe tener al menos 16 caracteres.';
  return null;
}
