/**
 * Utilitários para sanitização de strings vindas do banco de dados
 * Especialmente útil para remover caracteres especiais que podem causar problemas em PDFs
 */

class StringSanitizer {
  
  /**
   * Remove caracteres especiais, de controle e não imprimíveis de uma string
   * @param {string} str - String a ser sanitizada
   * @returns {string} - String sanitizada
   */
  static sanitizeString(str) {
    if (!str || typeof str !== 'string') return str;
    
    return str
      // Remover caracteres de controle e não imprimíveis (0x00-0x1F, 0x7F-0x9F)
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      // Normalizar acentos e caracteres especiais para versões ASCII quando necessário
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Remover outros caracteres especiais problemáticos para PDF
      // Mantém: letras, números, espaços, hífen, vírgula, ponto, exclamação, interrogação, 
      // parênteses, barra, arroba, hashtag, cifrão, porcentagem, e-comercial, asterisco, 
      // mais, igual, dois pontos, ponto e vírgula
      .replace(/[^\w\s\-.,!?()/@#$%&*+=:;]/g, '')
      // Limpar espaços extras
      .trim()
      .replace(/\s+/g, ' ');
  }

  /**
   * Sanitiza recursivamente todas as strings em um objeto ou array
   * @param {any} obj - Objeto, array ou valor a ser sanitizado
   * @returns {any} - Dados sanitizados
   */
  static sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') {
      // Se for string, sanitizar
      if (typeof obj === 'string') {
        return this.sanitizeString(obj);
      }
      return obj;
    }
    
    // Se for array
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }
    
    // Se for objeto
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Sanitiza apenas campos específicos de um objeto
   * @param {object} obj - Objeto a ser sanitizado
   * @param {string[]} fields - Array com nomes dos campos a sanitizar
   * @returns {object} - Objeto com campos especificados sanitizados
   */
  static sanitizeFields(obj, fields) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    
    const result = { ...obj };
    
    fields.forEach(field => {
      if (result[field] && typeof result[field] === 'string') {
        result[field] = this.sanitizeString(result[field]);
      }
    });
    
    return result;
  }

  /**
   * Remove apenas caracteres de controle, mantendo acentos e caracteres especiais
   * Útil quando queremos preservar a formatação original mas remover problemas técnicos
   * @param {string} str - String a ser limpa
   * @returns {string} - String limpa
   */
  static removeControlChars(str) {
    if (!str || typeof str !== 'string') return str;
    
    return str
      // Remover apenas caracteres de controle
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      // Limpar espaços extras
      .trim()
      .replace(/\s+/g, ' ');
  }

  /**
   * Sanitiza especificamente para uso em nomes de arquivos
   * @param {string} str - String a ser sanitizada
   * @returns {string} - String adequada para nome de arquivo
   */
  static sanitizeFileName(str) {
    if (!str || typeof str !== 'string') return str;
    
    return str
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Remover caracteres não permitidos em nomes de arquivo
      .replace(/[<>:"/\\|?*]/g, '')
      .trim()
      .replace(/\s+/g, '_');
  }
}

module.exports = StringSanitizer;