import {
  errorEmailHistoriaUsuario,
  errorNombreApellidoHistoria,
  errorPasswordHistoria,
  errorPasswordSmtpApp,
  errorTerminosCondiciones,
  evaluarCriteriosPassword,
  cumpleCriteriosPassword,
  TEXTO_DESCARGO_RESPONSABILIDAD,
  TERMINOS_CONDICIONES_MAX,
} from './form-validators';

describe('form-validators', () => {
  describe('errorEmailHistoriaUsuario', () => {
    it('HU-01: rechaza correo vacío y dominios no permitidos', () => {
      // Arrange
      const vacio = '';
      const dominioInvalido = 'user@empersonal.com';

      // Act
      const errVacio = errorEmailHistoriaUsuario(vacio);
      const errDominio = errorEmailHistoriaUsuario(dominioInvalido);

      // Assert
      expect(errVacio).toBe('El correo no puede estar en blanco.');
      expect(errDominio).toContain('Solo se permiten dominios');
    });

    it('HU-01: acepta gmail.com y subdominios edu.pe', () => {
      // Arrange
      const gmail = 'alumno@gmail.com';
      const edu = 'estudiante@uni.edu.pe';

      // Act
      const errGmail = errorEmailHistoriaUsuario(gmail);
      const errEdu = errorEmailHistoriaUsuario(edu);

      // Assert
      expect(errGmail).toBeNull();
      expect(errEdu).toBeNull();
    });
  });

  describe('evaluarCriteriosPassword', () => {
    it('HU-01: evalúa criterios individuales de contraseña', () => {
      // Arrange
      const password = 'Abcdef1@';

      // Act
      const criterios = evaluarCriteriosPassword(password);

      // Assert
      expect(cumpleCriteriosPassword(criterios)).toBe(true);
      expect(criterios.longitud).toBe(true);
      expect(criterios.mayuscula).toBe(true);
      expect(criterios.minuscula).toBe(true);
      expect(criterios.numero).toBe(true);
      expect(criterios.especial).toBe(true);
    });
  });

  describe('errorPasswordHistoria', () => {
    it('HU-01: valida criterios, nombre/apellido y coincidencia', () => {
      // Arrange
      const debil = 'abc123';
      const valida = 'Abcdef1@';
      const nombre = 'juan';
      const apellido = 'perez';

      // Act
      const errDebil = errorPasswordHistoria(debil, debil, nombre, apellido);
      const errNombre = errorPasswordHistoria('Juan1234@', 'Juan1234@', nombre, apellido);
      const errCoincidencia = errorPasswordHistoria(valida, 'Otra123@', nombre, apellido);
      const errOk = errorPasswordHistoria(valida, valida, nombre, apellido);

      // Assert
      expect(errDebil).toContain('La contraseña requiere');
      expect(errNombre).toBe('La contraseña no puede contener tu nombre.');
      expect(errCoincidencia).toBe('Las contraseñas no coinciden.');
      expect(errOk).toBeNull();
    });
  });

  describe('errorNombreApellidoHistoria', () => {
    it('HU-05: rechaza nombres vacíos, con números o caracteres inválidos', () => {
      // Arrange
      const vacio = '';
      const conNumero = 'Juan2';
      const caracterInvalido = 'Juan@';

      // Act
      const errVacio = errorNombreApellidoHistoria(vacio, 'nombres');
      const errNumero = errorNombreApellidoHistoria(conNumero, 'apellidos');
      const errCaracter = errorNombreApellidoHistoria(caracterInvalido, 'nombres');

      // Assert
      expect(errVacio).toBe('Los nombres no pueden estar en blanco.');
      expect(errNumero).toBe('Los apellidos no pueden contener números.');
      expect(errCaracter).toContain('solo pueden contener letras');
    });

    it('HU-05: acepta nombres con tildes y espacios', () => {
      // Arrange
      const nombre = 'María José';

      // Act
      const err = errorNombreApellidoHistoria(nombre, 'nombres');

      // Assert
      expect(err).toBeNull();
    });
  });

  describe('TEXTO_DESCARGO_RESPONSABILIDAD', () => {
    it('HU-28: expone el texto legal de descargo de responsabilidad', () => {
      // Arrange & Act
      const texto = TEXTO_DESCARGO_RESPONSABILIDAD;

      // Assert
      expect(texto).toContain('teórico-simulada');
      expect(texto).toContain('Codex Alimentarius');
      expect(texto).toContain('CENAN');
    });
  });

  describe('errorPasswordSmtpApp', () => {
    it('HU-33: exige contraseña SMTP de aplicación con al menos 16 caracteres', () => {
      // Arrange
      const vacia = '';
      const corta = 'abcd1234';
      const valida = 'abcdefghijklmnop';

      // Act
      const errVacia = errorPasswordSmtpApp(vacia);
      const errCorta = errorPasswordSmtpApp(corta);
      const errOk = errorPasswordSmtpApp(valida);

      // Assert
      expect(errVacia).toBe('La contraseña de aplicación no puede estar vacía.');
      expect(errCorta).toBe('La contraseña de aplicación debe tener al menos 16 caracteres.');
      expect(errOk).toBeNull();
    });
  });

  describe('errorTerminosCondiciones', () => {
    it('HU-34: exige términos obligatorios y respeta el máximo de caracteres', () => {
      // Arrange
      const vacio = '';
      const largo = 'x'.repeat(TERMINOS_CONDICIONES_MAX + 1);
      const valido = 'Acepto los términos del servicio.';

      // Act
      const errVacio = errorTerminosCondiciones(vacio);
      const errLargo = errorTerminosCondiciones(largo);
      const errOk = errorTerminosCondiciones(valido);

      // Assert
      expect(errVacio).toBe('Los términos y condiciones son obligatorios.');
      expect(errLargo).toContain(String(TERMINOS_CONDICIONES_MAX));
      expect(errOk).toBeNull();
    });
  });
});
