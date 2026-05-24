import { contieneEntradaPeligrosa } from './entrada-segura';

describe('entrada-segura', () => {
  describe('contieneEntradaPeligrosa', () => {
    it('HU-27: detecta patrones script en la entrada', () => {
      // Arrange
      const seguro = 'Receta saludable';
      const script = '<script>alert(1)</script>';
      const scriptParcial = 'miScriptMalicioso';

      // Act
      const esSeguro = contieneEntradaPeligrosa(seguro);
      const esScript = contieneEntradaPeligrosa(script);
      const esScriptParcial = contieneEntradaPeligrosa(scriptParcial);

      // Assert
      expect(esSeguro).toBe(false);
      expect(esScript).toBe(true);
      expect(esScriptParcial).toBe(true);
    });

    it('HU-27: detecta patrones SQL y comentarios admin--', () => {
      // Arrange
      const unionSelect = 'union select password from users';
      const orInjection = "' or 1=1";
      const comentarioAdmin = 'admin--';

      // Act
      const esUnion = contieneEntradaPeligrosa(unionSelect);
      const esOr = contieneEntradaPeligrosa(orInjection);
      const esComentario = contieneEntradaPeligrosa(comentarioAdmin);

      // Assert
      expect(esUnion).toBe(true);
      expect(esOr).toBe(true);
      expect(esComentario).toBe(true);
    });

    it('HU-27: permite texto normal sin patrones peligrosos', () => {
      // Arrange
      const texto = 'Ensalada de quinoa con limón';

      // Act
      const peligroso = contieneEntradaPeligrosa(texto);

      // Assert
      expect(peligroso).toBe(false);
    });
  });
});
