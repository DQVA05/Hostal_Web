/* Casita de Tercera · Panel (maqueta) · Acceso.
   Solo comprueba que los campos no estén vacíos y lleva a Inicio.
   NO hay credenciales en el código ni protección real: es una demostración.
   TODO backend: autenticación de verdad (Spring Security) antes de publicar el panel. */
(function () {
  'use strict';

  var A = window.Admin;
  A.iniciar(null); // tema y avisos; esta página no carga datos

  var form = document.getElementById('form-acceso');
  var usuario = document.getElementById('usuario');
  var clave = document.getElementById('clave');
  var usuarioError = document.getElementById('usuario-error');
  var claveError = document.getElementById('clave-error');
  var ver = document.getElementById('ver-clave');

  ver.addEventListener('click', function () {
    var mostrar = clave.type === 'password';
    clave.type = mostrar ? 'text' : 'password';
    ver.setAttribute('aria-pressed', mostrar ? 'true' : 'false');
    ver.querySelector('.icono').className = 'icono ' + (mostrar ? 'i-ojo-no' : 'i-ojo');
    ver.querySelector('span:last-child').textContent = mostrar ? 'Ocultar' : 'Mostrar';
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    A.errorCampo(usuario, usuarioError, usuario.value.trim() ? '' : 'Escriba su usuario.');
    A.errorCampo(clave, claveError, clave.value ? '' : 'Escriba su contraseña.');
    var primero = !usuario.value.trim() ? usuario : (!clave.value ? clave : null);
    if (primero) {
      primero.focus();
      return;
    }
    window.location.href = 'inicio.html';
  });

  [usuario, clave].forEach(function (campo) {
    campo.addEventListener('input', function () {
      A.errorCampo(campo, campo === usuario ? usuarioError : claveError, '');
    });
  });
})();
