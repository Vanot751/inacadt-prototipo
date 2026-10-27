const FORBIDDEN_INPUT_PATTERNS = ["--", "/*", "*/", ";", "<", ">", "\\", "{"];

export function hasForbiddenInput(value: string): boolean {
  return FORBIDDEN_INPUT_PATTERNS.some((pattern) => value.includes(pattern));
}

export function validateLoginForm(email: string, password: string): string | null {
  const trimmedEmail = email.trim();

  if (!trimmedEmail || !password) {
    return "Debes completar correo y contraseña.";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return "Ingresa un correo válido.";
  }

  if (password.length < 8 || password.length > 72) {
    return "La contraseña debe tener entre 8 y 72 caracteres.";
  }

  if (hasForbiddenInput(trimmedEmail) || hasForbiddenInput(password)) {
    return "Se detectaron caracteres no permitidos.";
  }

  return null;
}
