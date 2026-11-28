/* Casita de Tercera: código común a todas las páginas.
   - Botón de modo claro/oscuro (el tema inicial lo aplica el <head>, sin destello).
   - Esqueletos de carga de las fotos.
   JavaScript nativo, sin dependencias ni peticiones al servidor. */
(function () {
  'use strict';

  /* ---------- Tema ---------- */
  const raiz = document.documentElement;

  function temaActual() {
    const elegido = raiz.getAttribute('data-tema');
    if (elegido === 'claro' || elegido === 'oscuro') {
      return elegido;
    }
    const oscuroSistema = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return oscuroSistema ? 'oscuro' : 'claro';
  }

  document.querySelectorAll('[data-boton-tema]').forEach(function (boton) {
    boton.addEventListener('click', function () {
      // El texto visible del botón ("Modo oscuro" / "Modo claro") lo cambia la hoja de estilos.
      const nuevo = temaActual() === 'oscuro' ? 'claro' : 'oscuro';
      raiz.setAttribute('data-tema', nuevo);
      try {
        window.localStorage.setItem('tema', nuevo);
      } catch (e) {
        // Sin almacenamiento (modo privado, cuota llena…): el cambio vale solo para esta visita.
      }
    });
  });

  /* ---------- Fotos: esqueleto mientras cargan ----------
     El marco ya tiene la proporción final. Mientras la foto carga se muestra el brillo
     (.cargando + aria-busy); al cargar se retira; si falla, se sustituye por un
     marcador estático con el mismo texto alternativo, sin icono roto. */
  function marcarCargada(marco) {
    marco.classList.remove('cargando');
    marco.removeAttribute('aria-busy');
  }

  function marcarFallida(marco, img) {
    const marcador = document.createElement('div');
    marcador.className = 'foto-marcador';
    marcador.setAttribute('role', 'img');
    marcador.setAttribute('aria-label', img.alt || 'Fotografía no disponible');
    const texto = document.createElement('span');
    texto.setAttribute('aria-hidden', 'true');
    texto.textContent = 'Fotografía no disponible';
    marcador.appendChild(texto);
    img.remove();
    marco.appendChild(marcador);
    marcarCargada(marco);
  }

  document.querySelectorAll('.foto-marco img').forEach(function (img) {
    const marco = img.closest('.foto-marco');
    if (img.complete) {
      // Ya terminó antes de que corriera este script (o falló).
      if (img.naturalWidth === 0) {
        marcarFallida(marco, img);
      }
      return;
    }
    marco.classList.add('cargando');
    marco.setAttribute('aria-busy', 'true');
    img.addEventListener('load', function () { marcarCargada(marco); }, { once: true });
    img.addEventListener('error', function () { marcarFallida(marco, img); }, { once: true });
  });
})();
