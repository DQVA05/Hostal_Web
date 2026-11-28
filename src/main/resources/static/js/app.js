/* Casita de Tercera: código común a todas las páginas.
   - Botón de modo claro/oscuro (el tema inicial lo aplica el <head>, sin destello).
   - Esqueletos de carga de las fotos.
   - Barra fija «Reservar» del móvil (portada y «Sobre nosotros»).
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

  /* ---------- Barra fija «Reservar» (móvil) ----------
     Se oculta mientras se ve el pie o una llamada a la acción equivalente
     ([data-ocultar-barra]) y mientras hay un campo enfocado (teclado abierto),
     para no tapar nunca el contenido ni repetir la misma acción en pantalla. */
  const barra = document.querySelector('[data-barra-reservar]');
  if (barra) {
    const visibles = new Set();
    const actualizarBarra = function () {
      const activo = document.activeElement;
      const escribiendo = Boolean(activo && activo.matches && activo.matches('input, textarea, select'));
      barra.classList.toggle('oculta', visibles.size > 0 || escribiendo);
    };
    if ('IntersectionObserver' in window) {
      const observador = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (entrada) {
          if (entrada.isIntersecting) {
            visibles.add(entrada.target);
          } else {
            visibles.delete(entrada.target);
          }
        });
        actualizarBarra();
      });
      document.querySelectorAll('.pie, [data-ocultar-barra]').forEach(function (nodo) {
        observador.observe(nodo);
      });
    }
    document.addEventListener('focusin', actualizarBarra);
    document.addEventListener('focusout', function () { window.setTimeout(actualizarBarra, 0); });
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
