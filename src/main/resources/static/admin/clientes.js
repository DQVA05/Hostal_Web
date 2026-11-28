/* Casita de Tercera · Panel (maqueta) · Clientes.
   Búsqueda por nombre, correo o teléfono. Ficha: contacto, permiso para ofertas,
   reservas, pagos, incidencias y notas. Avisa si dos clientes comparten teléfono.
   Cuenta las personas que dejaron sus datos (clientes distintos por correo).
   Parámetros: ?id=C00 muestra un cliente, ?buscar=texto rellena la búsqueda.
   TODO backend: GET /api/clientes?buscar=…, GET /api/clientes/{id}. */
(function () {
  'use strict';

  var A = window.Admin;
  var F = A.fecha;
  var D = A.dinero;
  var h = A.h;

  A.iniciar(function (datos) {
    var el = {
      form: document.getElementById('form-buscar'),
      buscar: document.getElementById('buscar'),
      duplicados: document.getElementById('avisos-duplicados'),
      cuentas: document.getElementById('cuentas'),
      resultado: document.getElementById('resultado'),
      lista: document.getElementById('lista')
    };
    var soloId = A.parametro('id');

    /* Teléfonos compartidos: se comparan solo los dígitos. */
    var porTelefono = new Map();
    datos.clientes.forEach(function (c) {
      var t = A.soloDigitos(c.telefono);
      if (!t) { return; }
      if (!porTelefono.has(t)) { porTelefono.set(t, []); }
      porTelefono.get(t).push(c);
    });
    var gruposDuplicados = Array.from(porTelefono.values()).filter(function (g) { return g.length > 1; });

    function companeros(c) {
      var g = porTelefono.get(A.soloDigitos(c.telefono)) || [];
      return g.filter(function (x) { return x.id !== c.id; });
    }

    /* Avisos y cuentas. */
    if (gruposDuplicados.length) {
      el.duplicados.appendChild(h('div', { class: 'nota nota-aviso subseccion' }, [A.icono('alerta'), h('div', null, [
        h('p', { class: 'item-titulo', text: 'Hay clientes con el mismo teléfono' }),
        h('ul', null, gruposDuplicados.map(function (g) {
          return h('li', { text: g.map(function (c) { return c.nombre; }).join(' y ') + ' (' + g[0].telefono + ')' });
        })),
        h('p', { text: 'Puede ser la misma persona con dos fichas. Revíselo antes de llamar o de enviar ofertas.' })
      ])]));
    }

    var correos = new Set(datos.clientes.map(function (c) { return String(c.email || '').trim().toLowerCase(); })
      .filter(Boolean));
    var sinCorreo = datos.clientes.filter(function (c) { return !String(c.email || '').trim(); }).length;
    var conOfertas = datos.clientes.filter(function (c) { return c.ofertas; }).length;
    function cifra(etiqueta, valor, nota, clase) {
      return h('div', { class: 'cifra' + (clase ? ' ' + clase : '') }, [
        h('span', { class: 'cifra-etiqueta', text: etiqueta }),
        h('span', { class: 'cifra-valor', text: valor }),
        nota ? h('span', { class: 'cifra-nota', text: nota }) : null
      ]);
    }
    [
      cifra('Personas que dejaron sus datos', String(correos.size),
        'Clientes distintos contados por su correo (sin repetir). Hay ' + datos.clientes.length + ' fichas; ' +
        sinCorreo + ' sin correo.', 'cifra-ancha'),
      cifra('Aceptan ofertas', String(conOfertas), 'Dieron permiso para recibirlas'),
      cifra('Fichas en total', String(datos.clientes.length))
    ].forEach(function (c) { el.cuentas.appendChild(c); });

    /* ---------- Búsqueda ---------- */
    function coincide(c, consulta) {
      if (!consulta) { return true; }
      var texto = A.normalizar(consulta);
      var digitos = A.soloDigitos(consulta);
      if (A.normalizar(c.nombre).indexOf(texto) > -1) { return true; }
      if (c.email && c.email.toLowerCase().indexOf(texto) > -1) { return true; }
      return digitos.length >= 3 && A.soloDigitos(c.telefono).indexOf(digitos) > -1;
    }

    function pintar() {
      var consulta = el.buscar.value.trim();
      var lista = datos.clientes.filter(function (c) {
        return soloId ? c.id === soloId : coincide(c, consulta);
      }).sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es', { numeric: true }); });

      A.vaciar(el.lista);
      if (!datos.clientes.length) {
        el.resultado.textContent = '';
        el.lista.appendChild(A.vacio('clientes', 'Todavía no hay clientes.',
          'Las fichas se crean solas cuando alguien reserva en la web, o cuando usted anota una reserva nueva.',
          A.enlaceBoton('Anotar una reserva', 'sumar', 'reservas.html?nueva=1', 'boton-principal')));
        return;
      }
      if (soloId) {
        el.resultado.textContent = lista.length ? 'Mostrando un cliente.' : 'No se encontró ese cliente.';
        el.lista.appendChild(h('div', { style: 'margin-bottom: 0.75rem' },
          A.boton('Ver todos los clientes', 'clientes', 'boton-secundario boton-bloque', function () {
            soloId = null;
            pintar();
            el.buscar.focus();
          })));
      } else if (!lista.length) {
        el.resultado.textContent = 'Ningún cliente coincide con «' + consulta + '».';
        el.lista.appendChild(A.vacio('buscar', 'No hay resultados.',
          'Revise cómo lo escribió, o pruebe con el teléfono o el correo.',
          A.boton('Borrar la búsqueda', 'cerrar', 'boton-secundario', function () {
            el.buscar.value = '';
            pintar();
            el.buscar.focus();
          })));
        return;
      } else {
        el.resultado.textContent = consulta
          ? lista.length + (lista.length === 1 ? ' cliente coincide' : ' clientes coinciden') + ' con «' + consulta + '».'
          : 'Mostrando los ' + lista.length + ' clientes, por orden alfabético.';
      }
      var ul = h('ul', { class: 'lista-items' });
      lista.forEach(function (c) { ul.appendChild(ficha(c)); });
      el.lista.appendChild(ul);
    }

    function fila(dt, dd) {
      return h('div', null, [h('dt', { text: dt }), h('dd', null, dd)]);
    }

    function ficha(c) {
      var reservas = datos.reservas.filter(function (r) { return r.clienteId === c.id; })
        .sort(function (a, b) { return a.entrada < b.entrada ? 1 : -1; });
      var pagos = [];
      reservas.forEach(function (r) {
        r.pagos.forEach(function (p) { pagos.push({ reserva: r, pago: p, usd: D.aUSD(p.monto, p.moneda, p.tasa) }); });
      });
      pagos.sort(function (a, b) { return a.pago.fecha < b.pago.fecha ? 1 : -1; });
      var totalPagado = D.r2(pagos.reduce(function (s, p) { return s + p.usd; }, 0));
      var otros = companeros(c);

      var li = h('li', { class: 'item' });
      li.appendChild(h('div', { class: 'item-cabecera' }, [
        h('h3', { class: 'item-titulo', text: c.nombre }),
        c.ofertas ? A.insignia('completada', 'check', 'Acepta ofertas') : A.insignia('cancelada', 'cerrar', 'Sin ofertas')
      ]));
      li.appendChild(h('dl', { class: 'datos' }, [
        fila('Teléfono', c.telefono || '—'),
        fila('Correo', c.email || 'No dejó correo'),
        fila('Cliente desde', c.alta ? F.numerica(F.deISO(c.alta)) : '—'),
        fila('Reservas', String(reservas.length)),
        fila('Total pagado', D.usd(totalPagado))
      ]));
      if (otros.length) {
        li.appendChild(h('p', { class: 'nota nota-aviso', style: 'margin-top: 0.5rem' }, [A.icono('alerta'),
          h('span', { text: 'Este teléfono también lo tiene: ' + otros.map(function (o) { return o.nombre; }).join(', ') + '.' })]));
      }

      // Historial plegable (se abre tocando, sin gestos).
      var historial = h('details', { class: 'seccion', style: 'margin-top: 0.75rem' });
      historial.appendChild(h('summary', { class: 'boton boton-secundario boton-bloque' }, [
        A.icono('reservas'), h('span', { text: 'Ver reservas, pagos, incidencias y notas' })
      ]));
      var cuerpo = h('div', { class: 'pila', style: 'margin-top: 0.75rem' });

      cuerpo.appendChild(h('h4', { class: 'item-titulo', text: 'Reservas' }));
      if (!reservas.length) {
        cuerpo.appendChild(h('p', { class: 'texto-suave', text: 'Sin reservas todavía.' }));
      } else {
        var ulR = h('ul', { class: 'datos' });
        reservas.forEach(function (r) {
          ulR.appendChild(h('li', null, [
            h('a', { href: A.enlaceReserva(r.id), text: r.id + ' · ' + F.corta(F.deISO(r.entrada)) + ' – ' + F.corta(F.deISO(r.salida)) }),
            A.insigniaEstado(r.estado)
          ]));
        });
        cuerpo.appendChild(ulR);
      }

      cuerpo.appendChild(h('h4', { class: 'item-titulo', text: 'Pagos' }));
      if (!pagos.length) {
        cuerpo.appendChild(h('p', { class: 'texto-suave', text: 'Sin pagos anotados.' }));
      } else {
        var ulP = h('ul', { class: 'datos' });
        pagos.forEach(function (p) {
          ulP.appendChild(h('li', null, [
            h('span', { text: F.corta(F.deISO(p.pago.fecha)) + ' · ' + p.reserva.id + ' · ' +
              (A.catalogo.CONCEPTOS[p.pago.concepto] || 'Pago') }),
            h('strong', { text: D.monto(p.pago.monto, p.pago.moneda) + (p.pago.moneda !== 'USD' ? ' = ' + D.usd(p.usd) : '') })
          ]));
        });
        cuerpo.appendChild(ulP);
      }

      cuerpo.appendChild(h('h4', { class: 'item-titulo', text: 'Incidencias' }));
      if (!c.incidencias.length) {
        cuerpo.appendChild(h('p', { class: 'texto-suave', text: 'Sin incidencias.' }));
      } else {
        var ulI = h('ul', { class: 'pila' });
        c.incidencias.forEach(function (i) {
          ulI.appendChild(h('li', { class: 'nota nota-aviso' }, [A.icono('alerta'),
            h('span', { text: F.numerica(F.deISO(i.fecha)) + ': ' + i.texto })]));
        });
        cuerpo.appendChild(ulI);
      }

      cuerpo.appendChild(h('h4', { class: 'item-titulo', text: 'Notas' }));
      cuerpo.appendChild(h('p', { class: c.notas ? null : 'texto-suave', text: c.notas || 'Sin notas.' }));
      historial.appendChild(cuerpo);
      li.appendChild(historial);

      var acciones = h('div', { class: 'item-acciones' }, [
        A.enlaceBoton('Nueva reserva', 'sumar', 'reservas.html?nueva=1&cliente=' + encodeURIComponent(c.id)),
        c.telefono ? A.enlaceBoton('Llamar', 'telefono', 'tel:' + c.telefono.replace(/[^\d+]/g, '')) : null,
        c.email ? A.enlaceBoton('Escribir correo', 'correo', 'mailto:' + c.email) : null
      ]);
      li.appendChild(acciones);
      return li;
    }

    el.buscar.addEventListener('input', function () { soloId = null; pintar(); });
    el.form.addEventListener('submit', function (e) {
      e.preventDefault();
      soloId = null;
      pintar();
      el.resultado.focus();
    });
    el.resultado.setAttribute('tabindex', '-1');

    var buscarParam = A.parametro('buscar');
    if (buscarParam) { el.buscar.value = buscarParam; }
    pintar();
  });
})();
