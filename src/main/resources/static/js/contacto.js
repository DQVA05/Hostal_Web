/* Casita de Tercera: bloque de contacto de la portada.
   - Validación en el navegador: correo obligatorio y mensaje de 10 a 1000 caracteres.
   - Contador de caracteres en vivo (el lector de pantalla lo oye al dejar de escribir).
   - Campo trampa para robots: si viene relleno, se muestra el éxito sin enviar nada.
   - Estado de éxito con foco en su título.
   NO envía datos: todavía no hay backend.
   TODO backend: enviar con fetch('/api/contacto', { method: 'POST' }) un JSON con
   { nombre, correo, mensaje, ofertas } y el token CSRF (Spring Security lo pone en el
   formulario como campo oculto _csrf); repetir allí todas las validaciones. */
(function () {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };
  const formulario = $('formulario-contacto');
  if (!formulario) {
    return;
  }

  const el = {
    nombre: $('contacto-nombre'),
    correo: $('contacto-correo'),
    correoError: $('contacto-correo-error'),
    mensaje: $('contacto-mensaje'),
    mensajeError: $('contacto-mensaje-error'),
    contador: $('contacto-contador'),
    anuncio: $('contacto-contador-anuncio'),
    ofertas: $('contacto-ofertas'),
    trampa: $('contacto-web'),
    estado: $('contacto-estado'),
    exito: $('contacto-exito'),
    exitoTitulo: $('contacto-exito-titulo'),
    exitoTexto: $('contacto-exito-texto'),
    otro: $('contacto-otro')
  };

  const MINIMO = 10;
  const MAXIMO = 1000;
  // La misma regla de correo que la página de reserva.
  const RE_CORREO = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

  /* Escribe (o borra) el error de un campo: icono + texto, aria-invalid y aria-describedby. */
  function mostrarError(campo, nodo, ayuda, texto) {
    nodo.textContent = '';
    if (texto) {
      const prefijo = document.createElement('span');
      prefijo.className = 'solo-lectores';
      prefijo.textContent = 'Error: ';
      nodo.appendChild(prefijo);
      nodo.appendChild(document.createTextNode(texto));
      campo.setAttribute('aria-invalid', 'true');
      campo.setAttribute('aria-describedby', ayuda + ' ' + nodo.id);
    } else {
      campo.removeAttribute('aria-invalid');
      campo.setAttribute('aria-describedby', ayuda);
    }
    nodo.hidden = !texto;
  }

  function errorCorreo() {
    const v = el.correo.value.trim();
    if (!v) { return 'Escriba su correo electrónico para poder responderle.'; }
    if (v.length > 254 || !RE_CORREO.test(v) || v.split('@')[0].length > 64) {
      return 'Revise el correo: debe tener la forma usuario@dominio.com.';
    }
    return '';
  }

  function errorMensaje() {
    const largo = el.mensaje.value.trim().length;
    if (!largo) { return 'Escriba su mensaje.'; }
    if (largo < MINIMO) { return 'El mensaje debe tener al menos ' + MINIMO + ' caracteres (ahora tiene ' + largo + ').'; }
    if (largo > MAXIMO) { return 'El mensaje no puede superar los ' + MAXIMO + ' caracteres.'; }
    return '';
  }

  const campos = [
    { input: el.correo, error: el.correoError, ayuda: 'contacto-correo-ayuda', validar: errorCorreo,
      limpiar: function () { el.correo.value = el.correo.value.trim(); } },
    { input: el.mensaje, error: el.mensajeError, ayuda: 'contacto-mensaje-ayuda contacto-contador', validar: errorMensaje,
      limpiar: function () {} }
  ];

  function validarCampo(c) {
    c.limpiar();
    const texto = c.validar();
    mostrarError(c.input, c.error, c.ayuda, texto);
    return !texto;
  }

  campos.forEach(function (c) {
    c.input.addEventListener('blur', function () {
      // Al salir de un campo vacío que aún no se ha intentado enviar, no se regaña.
      if (c.input.value.trim() || c.input.getAttribute('aria-invalid') === 'true') {
        validarCampo(c);
      }
    });
    c.input.addEventListener('input', function () {
      // Al corregir, el error desaparece en cuanto el dato es válido.
      if (c.input.getAttribute('aria-invalid') === 'true' && !c.validar()) {
        mostrarError(c.input, c.error, c.ayuda, '');
      }
    });
  });

  /* ---------- Contador en vivo ---------- */
  let esperaAnuncio = null;
  function actualizarContador() {
    const largo = el.mensaje.value.length;
    el.contador.textContent = largo + ' de ' + MAXIMO + ' caracteres';
    el.contador.classList.toggle('cerca-del-limite', largo >= MAXIMO - 100);
    // El anuncio para lectores de pantalla espera a que se deje de escribir.
    window.clearTimeout(esperaAnuncio);
    esperaAnuncio = window.setTimeout(function () {
      if (largo === 0) {
        el.anuncio.textContent = '';
      } else if (largo < MINIMO) {
        el.anuncio.textContent = 'Lleva ' + largo + ' caracteres. El mínimo es ' + MINIMO + '.';
      } else if (largo >= MAXIMO) {
        el.anuncio.textContent = 'Ha llegado al máximo de ' + MAXIMO + ' caracteres.';
      } else if (largo >= MAXIMO - 100) {
        el.anuncio.textContent = 'Quedan ' + (MAXIMO - largo) + ' caracteres.';
      } else {
        el.anuncio.textContent = '';
      }
    }, 900);
  }
  el.mensaje.addEventListener('input', actualizarContador);

  /* ---------- Envío ---------- */
  function mostrarExito() {
    const nombre = el.nombre.value.trim().replace(/\s+/g, ' ');
    el.exitoTitulo.textContent = nombre ? '¡Gracias por escribirnos, ' + nombre + '!' : '¡Gracias por escribirnos!';
    el.exitoTexto.textContent = 'Sus ideas nos ayudan a mejorar la casa.' +
      (el.ofertas.checked ? ' Ha pedido recibir ofertas futuras.' : '');
    formulario.hidden = true;
    el.exito.hidden = false;
    el.exitoTitulo.focus();
  }

  formulario.addEventListener('submit', function (evento) {
    evento.preventDefault(); // nunca se envía: todavía no hay backend
    el.estado.textContent = '';

    // Robot: el campo trampa viene relleno. Se finge el éxito y no se hace nada más.
    if (el.trampa && el.trampa.value) {
      mostrarExito();
      return;
    }

    const conError = campos.filter(function (c) { return !validarCampo(c); });
    if (conError.length) {
      el.estado.textContent = conError.length === 1 ? 'Hay 1 dato por revisar.' : 'Hay ' + conError.length + ' datos por revisar.';
      conError[0].input.focus();
      return;
    }

    // TODO backend: aquí se enviaría la solicitud (POST /api/contacto) y, si responde bien, se muestra el éxito.
    mostrarExito();
  });

  el.otro.addEventListener('click', function () {
    formulario.reset();
    campos.forEach(function (c) { mostrarError(c.input, c.error, c.ayuda, ''); });
    actualizarContador();
    el.estado.textContent = '';
    el.exito.hidden = true;
    formulario.hidden = false;
    el.correo.focus();
  });

  actualizarContador();
})();
