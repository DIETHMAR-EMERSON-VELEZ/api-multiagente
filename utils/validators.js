/**
 * Validadores para la API
 */

const config = require('../config/constants');

/**
 * Valida que las fechas estén en formato YYYY-MM-DD
 */
const validateDateFormat = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return {
      valid: false,
      error: 'Formato de fecha inválido. Use YYYY-MM-DD'
    };
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return {
      valid: false,
      error: 'Fecha inválida'
    };
  }

  return { valid: true, date };
};

/**
 * Valida el rango de fechas
 */
const validateDateRange = (fromString, toString) => {
  const fromValidation = validateDateFormat(fromString);
  if (!fromValidation.valid) {
    return { valid: false, error: `Fecha 'from' inválida: ${fromValidation.error}` };
  }

  const toValidation = validateDateFormat(toString);
  if (!toValidation.valid) {
    return { valid: false, error: `Fecha 'to' inválida: ${toValidation.error}` };
  }

  const fromDate = fromValidation.date;
  const toDate = toValidation.date;

  if (fromDate > toDate) {
    return { valid: false, error: 'La fecha "from" debe ser anterior o igual a "to"' };
  }

  // Validar rango máximo de histórico
  const diffTime = Math.abs(toDate - fromDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > config.PAGINATION.MAX_HISTORICAL_DAYS) {
    return {
      valid: false,
      error: `Rango de fechas máximo permitido: ${config.PAGINATION.MAX_HISTORICAL_DAYS} días`
    };
  }

  return {
    valid: true,
    fromDate,
    toDate,
    daysDifference: diffDays
  };
};

/**
 * Valida parámetros de paginación
 */
const validatePagination = (pageStr, sizeStr) => {
  const page = parseInt(pageStr || 1);
  let size = parseInt(sizeStr || config.PAGINATION.DEFAULT_PAGE_SIZE);

  // Validar página
  if (isNaN(page) || page < 1) {
    return {
      valid: false,
      error: 'Parámetro "page" debe ser un número mayor a 0'
    };
  }

  // Validar tamaño
  if (isNaN(size) || size < 1) {
    return {
      valid: false,
      error: 'Parámetro "size" debe ser un número mayor a 0'
    };
  }

  // Limitar tamaño máximo
  if (size > config.PAGINATION.MAX_PAGE_SIZE) {
    size = config.PAGINATION.MAX_PAGE_SIZE;
  }

  return {
    valid: true,
    page,
    size,
    offset: (page - 1) * size
  };
};

/**
 * Valida que una fecha sea válida
 */
const isValidDate = (dateString) => {
  const validation = validateDateFormat(dateString);
  return validation.valid;
};

/**
 * Convierte string de fecha a objeto Date con time zone
 */
const parseDate = (dateString) => {
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Convierte string de fecha al final del día
 */
const parseDateEndOfDay = (dateString) => {
  const date = new Date(dateString);
  date.setHours(23, 59, 59, 999);
  return date;
};

/**
 * Valida estructura de query parameters
 */
const validateQueryParams = (query, requiredParams = []) => {
  const errors = [];

  requiredParams.forEach(param => {
    if (!query[param]) {
      errors.push(`Parámetro requerido: ${param}`);
    }
  });

  if (errors.length > 0) {
    return {
      valid: false,
      errors
    };
  }

  return { valid: true };
};

/**
 * Valida que el campo tenga un valor numérico válido
 */
const validateNumericField = (value, fieldName, options = {}) => {
  const num = parseFloat(value);

  if (isNaN(num)) {
    return {
      valid: false,
      error: `${fieldName} debe ser un número válido`
    };
  }

  if (options.min !== undefined && num < options.min) {
    return {
      valid: false,
      error: `${fieldName} debe ser mayor o igual a ${options.min}`
    };
  }

  if (options.max !== undefined && num > options.max) {
    return {
      valid: false,
      error: `${fieldName} no puede exceder ${options.max}`
    };
  }

  return { valid: true, value: num };
};

module.exports = {
  validateDateFormat,
  validateDateRange,
  validatePagination,
  validateQueryParams,
  validateNumericField,
  isValidDate,
  parseDate,
  parseDateEndOfDay
};
