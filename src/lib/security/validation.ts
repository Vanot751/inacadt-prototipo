import {
  COMPLEJIDADES_VALIDAS,
  type ComplejidadPublicacion,
  type NuevaPublicacionInput,
} from '@/types/inacadt';

/**
 * Patrones sospechosos de inyección (OWASP A03: Injection - XSS y SQLi)
 */
const INJECTION_PATTERNS: RegExp[] = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript\s*:/gi,
  /vbscript\s*:/gi,
  /data\s*:\s*text\/html/gi,
  /\bon(load|error|click|mouseover|focus|blur|submit|change|keyup|keydown)\s*=/gi,
  /<iframe\b/gi,
  /<object\b/gi,
  /<embed\b/gi,
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|TRUNCATE)\b\s+.*(\b(FROM|INTO|TABLE|DATABASE|WHERE|ALL)\b|--|;))/i,
  /('|\bOR\b|\bAND\b)\s*['"]?\d+['"]?\s*=\s*['"]?\d+/i,
  /--\s*$/,
];

/**
 * Detecta si una cadena contiene vectores comunes de XSS o Inyección SQL
 */
export function containsInjectionPatterns(input: string): boolean {
  if (!input) return false;
  return INJECTION_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(input);
  });
}

/**
 * Sanitiza texto eliminando etiquetas HTML peligrosas, caracteres de control y espacios redundantes
 */
export function sanitizeText(input: string): string {
  if (!input) return '';
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .trim();
}

/**
 * Validación de formato de correo electrónico (RFC 5322 simplificado y seguro)
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export interface LoginValidationResult {
  valid: boolean;
  sanitizedEmail: string;
  errors: {
    email?: string;
    password?: string;
    general?: string;
  };
}

/**
 * Valida credenciales de acceso en cliente y servidor (OWASP Input Validation)
 */
export function validateLoginCredentials(
  email: string,
  password: string
): LoginValidationResult {
  const errors: LoginValidationResult['errors'] = {};
  const trimmedEmail = (email || '').trim().toLowerCase();

  if (containsInjectionPatterns(email) || containsInjectionPatterns(password)) {
    return {
      valid: false,
      sanitizedEmail: '',
      errors: {
        general:
          'Alerta de seguridad (OWASP): Se detectaron caracteres o patrones no permitidos en el formulario.',
      },
    };
  }

  if (!trimmedEmail) {
    errors.email = 'El correo institucional o académico es obligatorio.';
  } else if (trimmedEmail.length > 120) {
    errors.email = 'El correo no puede superar los 120 caracteres.';
  } else if (!EMAIL_REGEX.test(trimmedEmail)) {
    errors.email = 'Ingrese un formato de correo electrónico válido (ej: usuario@inacapmail.cl).';
  }

  if (!password) {
    errors.password = 'La contraseña es obligatoria.';
  } else if (password.length < 6) {
    errors.password = 'La contraseña debe tener al menos 6 caracteres.';
  } else if (password.length > 128) {
    errors.password = 'La contraseña excede la longitud máxima permitida.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    sanitizedEmail: trimmedEmail,
    errors,
  };
}

export interface PublicacionValidationResult {
  valid: boolean;
  sanitizedData?: NuevaPublicacionInput;
  errors: {
    titulo?: string;
    contenido?: string;
    categoria?: string;
    complejidad?: string;
    general?: string;
  };
}

/**
 * Valida la creación de una publicación en el muro (RF03 / OWASP)
 */
export function validatePublicacionInput(input: {
  titulo: string;
  contenido: string;
  categoria: string;
  complejidad: string;
}): PublicacionValidationResult {
  const errors: PublicacionValidationResult['errors'] = {};

  const rawValues = [
    input.titulo,
    input.contenido,
    input.categoria,
    input.complejidad,
  ];

  if (rawValues.some((val) => containsInjectionPatterns(val))) {
    return {
      valid: false,
      errors: {
        general:
          'Bloqueo de seguridad (OWASP): El contenido incluye etiquetas de script o patrones de inyección no permitidos.',
      },
    };
  }

  const titulo = sanitizeText(input.titulo);
  const contenido = sanitizeText(input.contenido);
  const categoria = sanitizeText(input.categoria);
  const complejidad = sanitizeText(input.complejidad) as ComplejidadPublicacion;

  if (!titulo) {
    errors.titulo = 'El título de la publicación es obligatorio.';
  } else if (titulo.length < 5) {
    errors.titulo = 'El título debe contener al menos 5 caracteres.';
  } else if (titulo.length > 120) {
    errors.titulo = 'El título no debe exceder los 120 caracteres.';
  }

  if (!contenido) {
    errors.contenido = 'La descripción o contenido del clasificado es obligatorio.';
  } else if (contenido.length < 15) {
    errors.contenido = 'El contenido debe detallar al menos 15 caracteres.';
  } else if (contenido.length > 1200) {
    errors.contenido = 'El contenido no debe exceder los 1200 caracteres.';
  }

  if (!categoria) {
    errors.categoria = 'Debe seleccionar o ingresar una categoría académica.';
  } else if (categoria.length > 80) {
    errors.categoria = 'La categoría no puede exceder los 80 caracteres.';
  }

  if (!COMPLEJIDADES_VALIDAS.includes(complejidad)) {
    errors.complejidad =
      'El nivel de complejidad debe ser Sencillo, Avanzado o Asistido.';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    sanitizedData: {
      titulo,
      contenido,
      categoria,
      complejidad,
    },
    errors: {},
  };
}

/**
 * Valida que el identificador de publicación sea seguro (UUID o ID numérico/alfanumérico limpio)
 */
export function isValidResourceId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  if (id.length > 64) return false;
  if (containsInjectionPatterns(id)) return false;
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

