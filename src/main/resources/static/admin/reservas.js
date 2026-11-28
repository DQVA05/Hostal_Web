/* Casita de Tercera · Panel (maqueta) · Reservas.
   - Filtro por estado, ordenadas por fecha de entrada.
   - Detalle: cliente, fechas, bloques, habitaciones, huéspedes, total, pagado,
     saldo, moneda, tasa y extras vendidos.
   - Cambio de estado con confirmación; cancelar libera las fechas.
   - Pendientes: plazo de 48 h (provisional).
   - Alta manual (teléfono/WhatsApp) que rechaza fechas ocupadas o desactivadas.
   Parámetros: ?id=R-0000 abre el detalle, ?nueva=1 abre el alta, ?cliente=C00 elige
   el cliente, ?filtro=pendiente|confirmada|completada|cancelada.
   Nada se guarda. TODO backend: GET/POST /api/reservas, PATCH /api/reservas/{id}/estado,
   POST /api/reservas/{id}/pagos. */
(function () {
  'use strict';

  var A = window.Admin;
  var F = A.fecha;
  var D = A.dinero;
  var h = A.h;
  var POR_PAGINA = 30;
  var FILTROS = [
    ['todas', 'Todas'],
    ['pendiente', 'Pendientes'],
    ['confirmada', 'Confirmadas'],
    ['completada', 'Completadas'],
    ['cancelada', 'Canceladas']
  ];

  A.iniciar(function (datos) {
    var $ = function (id) { return document.getElementById(id); };
    var el = {
      nueva: $('boton-nueva'),
      filtros: $('filtros'),
      lista: $('lista'),
      detalle: $('dialogo-detalle'),
      detalleTitulo: $('detalle-titulo'),
      detalleCuerpo: $('detalle-cuerpo'),
      detalleCerrar: $('detalle-cerrar'),
      dNueva: $('dialogo-nueva'),
      fNueva: $('form-nueva'),
      grupoExistente: $('grupo-existente'),
      grupoNuevo: $('grupo-nuevo'),
      cliente: $('nueva-cliente'),
      clienteError: $('nueva-cliente-error'),
      nombre: $('nueva-nombre'),
      nombreError: $('nueva-nombre-error'),
      telefono: $('nueva-telefono'),
      telefonoError: $('nueva-telefono-error'),
      email: $('nueva-email'),
      emailError: $('nueva-email-error'),
      ofertas: $('nueva-ofertas'),
      entrada: $('nueva-entrada'),
      entradaError: $('nueva-entrada-error'),
      salida: $('nueva-salida'),
      salidaError: $('nueva-salida-error'),
      fechasError: $('nueva-fechas-error'),
      habitaciones: $('nueva-habitaciones'),
      huespedes: $('nueva-huespedes'),
      precio: $('nueva-precio'),
      tasaCampo: $('nueva-tasa-campo'),
      tasaEtiqueta: $('nueva-tasa-etiqueta'),
      tasa: $('nueva-tasa'),
      tasaError: $('nueva-tasa-error'),
      deposito: $('nueva-deposito'),
      depositoError: $('nueva-deposito-error'),
      estadoAyuda: $('nueva-estado-ayuda'),
      nota: $('nueva-nota'),
      nuevaCancelar: $('nueva-cancelar'),
      dPago: $('dialogo-pago'),
      fPago: $('form-pago'),
      pagoResumen: $('pago-resumen'),
      pagoMonto: $('pago-monto'),
      pagoMontoError: $('pago-monto-error'),
      pagoTasaCampo: $('pago-tasa-campo'),
      pagoTasaEtiqueta: $('pago-tasa-etiqueta'),
      pagoTasa: $('pago-tasa'),
      pagoTasaError: $('pago-tasa-error'),
      pagoEquivalente: $('pago-equivalente'),
      pagoFecha: $('pago-fecha'),
      pagoFechaError: $('pago-fecha-error'),
      pagoCancelar: $('pago-cancelar')
    };

    var filtro = 'todas';
    var paramFiltro = A.parametro('filtro');
    FILTROS.forEach(function (f) { if (f[0] === paramFiltro) { filtro = paramFiltro; } });
    var mostrar = POR_PAGINA;
    var abierta = null;          // id de la reserva en el detalle
    var depositoEditado = false; // el dueño cambió el depósito a mano
    var reservaPago = null;      // reserva a la que se anota un pago

    function radio(form, nombre) {
      var r = form.querySelector('input[name="' + nombre + '"]:checked');
      return r ? r.value : '';
    }

    function marcar(form, nombre, valor) {
      form.querySelectorAll('input[name="' + nombre + '"]').forEach(function (r) { r.checked = r.value === valor; });
    }

    function textoDinero(usd, moneda, tasa) {
      var texto = D.usd(usd);
      if (moneda && moneda !== 'USD' && tasa) { texto += ' (≈ ' + D.monto(D.deUSD(usd, moneda, tasa), moneda) + ')'; }
      return texto;
    }

    function fila(dt, dd, clase) {
      return h('div', { class: clase || null }, [h('dt', { text: dt }), h('dd', { text: dd })]);
    }

    /* ---------- Filtros y lista ---------- */
    function pintarFiltros() {
      A.vaciar(el.filtros);
      FILTROS.forEach(function (f) {
        var n = f[0] === 'todas' ? datos.reservas.length
          : datos.reservas.filter(function (r) { return r.estado === f[0]; }).length;
        var b = h('button', { type: 'button', class: 'filtro', 'aria-pressed': filtro === f[0] ? 'true' : 'false' }, [
          A.icono('check'),
          h('span', { text: f[1] }),
          h('span', { class: 'filtro-cuenta', text: '(' + n + ')' })
        ]);
        b.addEventListener('click', function () {
          filtro = f[0];
          mostrar = POR_PAGINA;
          pintarFiltros();
          pintarLista();
          el.filtros.querySelector('[aria-pressed="true"]').focus();
        });
        el.filtros.appendChild(b);
      });
    }

    function porEntrada(asc) {
      return function (a, b) {
        if (a.entrada === b.entrada) { return 0; }
        return (a.entrada < b.entrada ? -1 : 1) * (asc ? 1 : -1);
      };
    }

    function pintarLista() {
      A.vaciar(el.lista);
      if (!datos.reservas.length) {
        el.lista.appendChild(A.vacio('reservas', 'Todavía no hay reservas.',
          'Las reservas de la web aparecerán aquí. Para anotar una que le hicieron por teléfono o WhatsApp, pulse «Nueva reserva».',
          A.boton('Nueva reserva', 'sumar', 'boton-principal', function () { abrirNueva(); })));
        return;
      }
      var hoyISO = F.aISO(F.hoy());
      if (filtro === 'todas') {
        var proximas = datos.reservas.filter(function (r) { return r.salida > hoyISO; }).sort(porEntrada(true));
        var anteriores = datos.reservas.filter(function (r) { return r.salida <= hoyISO; }).sort(porEntrada(false));
        el.lista.appendChild(grupo('Próximas y en curso', 'De la entrada más cercana a la más lejana.', proximas,
          'No hay reservas próximas.', proximas.length));
        el.lista.appendChild(grupo('Anteriores', 'De la más reciente a la más antigua.', anteriores,
          'No hay reservas anteriores.', mostrar));
        return;
      }
      var asc = filtro === 'pendiente' || filtro === 'confirmada';
      var lista = datos.reservas.filter(function (r) { return r.estado === filtro; }).sort(porEntrada(asc));
      var nombre = FILTROS.filter(function (f) { return f[0] === filtro; })[0][1].toLowerCase();
      el.lista.appendChild(grupo(null, asc ? 'Ordenadas por entrada: la más cercana primero.'
        : 'Ordenadas por entrada: la más reciente primero.', lista, 'No hay reservas ' + nombre + '.', mostrar));
    }

    function grupo(titulo, ayuda, lista, textoVacio, limite) {
      var cont = h('div', { class: titulo ? 'seccion' : null });
      if (titulo) { cont.appendChild(h('h3', { text: titulo + ' (' + lista.length + ')' })); }
      cont.appendChild(h('p', { class: 'ayuda', style: 'margin-bottom: 0.75rem', text: ayuda }));
      if (!lista.length) {
        cont.appendChild(h('p', { class: 'vacio', text: textoVacio }));
        return cont;
      }
      var ul = h('ul', { class: 'lista-items' });
      lista.slice(0, limite).forEach(function (r) { ul.appendChild(tarjeta(r)); });
      cont.appendChild(ul);
      if (lista.length > limite) {
        cont.appendChild(h('div', { class: 'seccion' }, A.boton('Ver ' + Math.min(POR_PAGINA, lista.length - limite) +
          ' reservas más', 'siguiente', 'boton-secundario boton-bloque', function () {
          mostrar += POR_PAGINA;
          pintarLista();
        })));
      }
      return cont;
    }

    function tarjeta(r) {
      var saldo = A.calc.saldo(r);
      var bloques = A.calc.bloques(r);
      var li = h('li', { class: 'item' }, [
        h('div', { class: 'item-cabecera' }, [
          h('span', { class: 'item-titulo', text: A.calc.nombreCliente(datos, r.clienteId) }),
          A.insigniaEstado(r.estado)
        ]),
        h('p', { class: 'item-linea', text: 'Entrada ' + F.corta(F.deISO(r.entrada)) + ' · Salida ' + F.corta(F.deISO(r.salida)) }),
        h('p', { class: 'item-linea texto-suave', text: r.id + ' · ' + bloques + (bloques === 1 ? ' bloque' : ' bloques') +
          ' de 24 h · ' + r.habitaciones + ' habitaciones · ' + r.huespedes + (r.huespedes === 1 ? ' huésped' : ' huéspedes') }),
        r.estado !== 'cancelada' ? h('p', { class: 'item-linea' }, [
          'Total ' + D.usd(A.calc.total(r)) + ' · ',
          h('span', { class: saldo > 0 ? 'negativo' : 'positivo', text: saldo > 0 ? 'Falta ' + D.usd(saldo) : 'Pagada' })
        ]) : null
      ]);
      if (r.estado === 'pendiente') {
        var vencida = A.calc.vencida(datos, r);
        li.appendChild(h('p', { class: 'item-linea' + (vencida ? ' negativo' : '') }, [
          A.icono('reloj', 'icono-peq'), ' ',
          (vencida ? 'Plazo vencido el ' : 'Plazo hasta el ') + F.momento(A.calc.vence(datos, r)) + ' (provisional)'
        ]));
      }
      li.appendChild(h('div', { class: 'item-acciones' },
        A.boton('Ver detalle', 'ver', 'boton-secundario', function () { abrirDetalle(r.id); })));
      return li;
    }

    /* ---------- Detalle ---------- */
    function abrirDetalle(id) {
      if (!A.calc.reserva(datos, id)) {
        A.aviso('No se encontró la reserva ' + id + '.', { icono: 'alerta' });
        return;
      }
      abierta = id;
      pintarDetalle();
      if (!el.detalle.open) { A.abrirDialogo(el.detalle); }
      el.detalleTitulo.focus();
    }

    function pintarDetalle() {
      var r = A.calc.reserva(datos, abierta);
      if (!r) { return; }
      var c = A.calc.cliente(datos, r.clienteId);
      var total = A.calc.total(r);
      var pagado = A.calc.pagado(r);
      var saldo = A.calc.saldo(r);
      var bloques = A.calc.bloques(r);
      var diaHoy = F.hoy();
      el.detalleTitulo.textContent = 'Reserva ' + r.id;
      el.detalleTitulo.setAttribute('tabindex', '-1');
      var cuerpo = A.vaciar(el.detalleCuerpo);

      cuerpo.appendChild(h('div', { class: 'item-cabecera' }, [
        h('p', { class: 'item-titulo', text: c ? c.nombre : 'Cliente sin ficha' }),
        A.insigniaEstado(r.estado)
      ]));

      if (r.estado === 'pendiente') {
        var vencida = A.calc.vencida(datos, r);
        cuerpo.appendChild(h('p', { class: 'nota nota-aviso seccion', style: 'margin-top: 0.75rem' }, [A.icono('reloj'), h('span', {
          text: (vencida ? 'El plazo para pagar el depósito venció el ' : 'Tiene hasta el ') +
            F.momento(A.calc.vence(datos, r)) + ' para pagar el depósito (plazo provisional de ' +
            datos.negocio.horasCaducidadPendiente + ' h).' +
            (vencida ? ' Confírmela si ya pagó, o cancélela para liberar las fechas.' : '')
        })]));
      } else if (r.estado === 'cancelada') {
        cuerpo.appendChild(h('p', { class: 'nota', style: 'margin-top: 0.75rem' }, [A.icono('info'),
          h('span', { text: 'Reserva cancelada: sus fechas están libres en el calendario.' })]));
      }

      cuerpo.appendChild(h('h3', { class: 'seccion', style: 'margin-top: 1rem', text: 'Estancia' }));
      cuerpo.appendChild(h('dl', { class: 'datos' }, [
        fila('Teléfono', c ? c.telefono : '—'),
        fila('Correo', c && c.email ? c.email : 'No dejó correo'),
        fila('Entrada', F.mediaConAnio(F.deISO(r.entrada)) + ', ' + datos.negocio.horaCambio),
        fila('Salida', F.mediaConAnio(F.deISO(r.salida)) + ', ' + datos.negocio.horaCambio),
        fila('Bloques de 24 h', String(bloques)),
        fila('Habitaciones', String(r.habitaciones)),
        fila('Huéspedes', String(r.huespedes)),
        fila('Reservó por', A.catalogo.ORIGENES[r.origen] || r.origen),
        fila('Fecha de la reserva', F.momento(F.deMomento(r.creada)))
      ]));

      cuerpo.appendChild(h('h3', { class: 'seccion', style: 'margin-top: 1rem', text: 'Dinero' }));
      var porcentaje = total ? Math.round(r.deposito / total * 100) : 0;
      cuerpo.appendChild(h('dl', { class: 'datos' }, [
        fila('Precio por bloque', D.usd(r.precioPorBloque)),
        fila('Total', textoDinero(total, r.moneda, r.tasa)),
        fila('Depósito acordado', D.usd(r.deposito) + ' (' + porcentaje + ' %)'),
        fila('Pagado', D.usd(pagado)),
        fila('Moneda', r.moneda),
        r.moneda !== 'USD' ? fila('Tasa de cambio', D.textoTasa(r.moneda, r.tasa)) : null,
        h('div', { class: 'total' }, [
          h('dt', { text: 'Falta por cobrar' }),
          h('dd', { class: saldo > 0 && r.estado !== 'cancelada' ? 'negativo' : 'positivo',
            text: r.estado === 'cancelada' ? 'Nada (cancelada)' : (saldo > 0 ? textoDinero(saldo, r.moneda, r.tasa) : 'Nada') })
        ])
      ]));

      cuerpo.appendChild(h('h3', { class: 'seccion', style: 'margin-top: 1rem', text: 'Pagos recibidos' }));
      if (!r.pagos.length) {
        cuerpo.appendChild(h('p', { class: 'texto-suave', text: 'Todavía no hay pagos anotados.' }));
      } else {
        var ulPagos = h('ul', { class: 'datos' });
        r.pagos.forEach(function (p) {
          var usd = D.aUSD(p.monto, p.moneda, p.tasa);
          ulPagos.appendChild(h('li', null, [
            h('span', { text: F.corta(F.deISO(p.fecha)) + ' · ' + (A.catalogo.CONCEPTOS[p.concepto] || 'Pago') }),
            h('strong', { text: D.monto(p.monto, p.moneda) + (p.moneda !== 'USD' ? ' = ' + D.usd(usd) : '') })
          ]));
        });
        cuerpo.appendChild(ulPagos);
      }

      var extras = datos.movimientos.filter(function (m) {
        return m.reservaId === r.id && (m.tipo === 'ingreso' || m.tipo === 'propina');
      });
      cuerpo.appendChild(h('h3', { class: 'seccion', style: 'margin-top: 1rem', text: 'Extras vendidos' }));
      if (!extras.length) {
        cuerpo.appendChild(h('p', { class: 'texto-suave', text: 'No hay extras anotados (comida, transporte, pasadía o propinas).' }));
      } else {
        var ulExtras = h('ul', { class: 'datos' });
        var sumaExtras = 0;
        extras.forEach(function (m) {
          var usd = D.aUSD(m.monto, m.moneda, m.tasa);
          sumaExtras += usd;
          ulExtras.appendChild(h('li', null, [
            h('span', { text: A.catalogo.nombreCategoria(m.tipo, m.categoria) + ' · ' + F.corta(F.deISO(m.fecha)) }),
            h('strong', { text: D.monto(m.monto, m.moneda) + (m.moneda !== 'USD' ? ' = ' + D.usd(usd) : '') })
          ]));
        });
        ulExtras.appendChild(h('li', { class: 'total' }, [h('span', { text: 'Total de extras' }),
          h('strong', { text: D.usd(D.r2(sumaExtras)) })]));
        cuerpo.appendChild(ulExtras);
      }
      if (r.estado !== 'cancelada') {
        cuerpo.appendChild(h('div', { class: 'item-acciones' }, A.enlaceBoton('Anotar un extra (comida, transporte…)', 'sumar',
          'dinero.html?nuevo=ingreso&reserva=' + encodeURIComponent(r.id))));
      }

      if (r.nota) {
        cuerpo.appendChild(h('p', { class: 'nota seccion', style: 'margin-top: 1rem' }, [A.icono('editar'),
          h('span', { text: 'Nota: ' + r.nota })]));
      }

      // Acciones: una principal según el estado; cancelar va aparte.
      var acciones = h('div', { class: 'botones-columna seccion', style: 'margin-top: 1.5rem' });
      if (r.estado === 'pendiente') {
        acciones.appendChild(A.boton('Confirmar reserva', 'check', 'boton-principal boton-grande',
          function () { cambiarEstado(r, 'confirmada'); }));
        acciones.appendChild(A.boton('Anotar pago', 'pago', 'boton-secundario', function () { abrirPago(r); }));
      } else if (r.estado === 'confirmada') {
        var debe = saldo > 0;
        acciones.appendChild(A.boton('Anotar pago', 'pago', debe ? 'boton-principal boton-grande' : 'boton-secundario',
          function () { abrirPago(r); }));
        if (F.deISO(r.entrada) <= diaHoy) {
          acciones.appendChild(A.boton('Marcar como completada', 'bandera', debe ? 'boton-secundario' : 'boton-principal boton-grande',
            function () { cambiarEstado(r, 'completada'); }));
        } else {
          acciones.appendChild(h('p', { class: 'campo-ayuda', text: 'Podrá marcarla como completada cuando el grupo haya llegado.' }));
        }
      } else if (r.estado === 'completada' && saldo > 0) {
        acciones.appendChild(A.boton('Anotar pago', 'pago', 'boton-principal boton-grande', function () { abrirPago(r); }));
      }
      var p = F.partes(F.deISO(r.entrada));
      acciones.appendChild(A.enlaceBoton('Ver en el calendario', 'calendario',
        'calendario.html?mes=' + F.claveDeMes({ anio: p.anio, mes: p.mes })));
      if (c) {
        acciones.appendChild(A.enlaceBoton('Ver la ficha del cliente', 'usuario',
          'clientes.html?id=' + encodeURIComponent(c.id)));
      }
      cuerpo.appendChild(acciones);

      if (r.estado === 'pendiente' || r.estado === 'confirmada') {
        cuerpo.appendChild(h('div', { class: 'zona-peligro' }, [
          A.boton('Cancelar reserva', 'cancelar', 'boton-peligro boton-bloque', function () { cambiarEstado(r, 'cancelada'); }),
          h('p', { class: 'campo-ayuda', text: 'Las fechas quedarán libres para otras reservas.' })
        ]));
      }
    }

    function repintar() {
      pintarFiltros();
      pintarLista();
      if (abierta && el.detalle.open) {
        pintarDetalle();
        el.detalleTitulo.focus();
      }
    }

    function cambiarEstado(r, nuevo) {
      var saldo = A.calc.saldo(r);
      var pagado = A.calc.pagado(r);
      var fechas = 'del ' + F.media(F.deISO(r.entrada)) + ' al ' + F.media(F.deISO(r.salida));
      var textos = {
        confirmada: {
          titulo: '¿Confirmar la reserva ' + r.id + '?',
          texto: 'Las fechas (' + fechas + ') quedarán reservadas. ' +
            (pagado < r.deposito ? 'Todavía no hay depósito anotado: si ya lo recibió, anótelo después con «Anotar pago».' : ''),
          aceptar: 'Sí, confirmar',
          icono: 'check',
          hecho: 'Reserva ' + r.id + ' confirmada.'
        },
        completada: {
          titulo: '¿Marcar la reserva ' + r.id + ' como completada?',
          texto: 'Indica que el grupo ya terminó su estancia.' +
            (saldo > 0 ? ' Atención: todavía falta cobrar ' + D.usd(saldo) + '.' : ''),
          aceptar: 'Sí, está completada',
          icono: 'bandera',
          hecho: 'Reserva ' + r.id + ' marcada como completada.'
        },
        cancelada: {
          titulo: '¿Cancelar la reserva ' + r.id + '?',
          texto: 'Las fechas ' + fechas + ' quedarán libres para otras reservas.' +
            (pagado > 0 ? ' Lo que ya cobró (' + D.usd(pagado) + ') sigue anotado en «Dinero».' : ''),
          aceptar: 'Sí, cancelar la reserva',
          volver: 'No, mantener la reserva',
          icono: 'cancelar',
          peligro: true,
          hecho: 'Reserva ' + r.id + ' cancelada. Sus fechas quedan libres.'
        }
      }[nuevo];
      A.confirmar(textos).then(function (ok) {
        if (!ok) { return; }
        var anterior = r.estado;
        r.estado = nuevo;
        repintar();
        A.aviso(textos.hecho, {
          icono: nuevo === 'cancelada' ? 'cancelar' : 'check',
          deshacer: function () {
            if (anterior !== 'cancelada' && nuevo === 'cancelada' &&
              A.calc.conflictos(datos, F.deISO(r.entrada), F.deISO(r.salida), r.id).length) {
              A.aviso('No se puede deshacer: esas fechas ya están ocupadas o desactivadas.', { icono: 'alerta' });
              return false;
            }
            r.estado = anterior;
            repintar();
            return true;
          }
        });
      });
    }

    /* ---------- Nueva reserva ---------- */
    function rellenarClientes(elegido) {
      A.vaciar(el.cliente);
      el.cliente.appendChild(h('option', { value: '', text: 'Elija un cliente' }));
      datos.clientes.slice().sort(function (a, b) {
        return a.nombre.localeCompare(b.nombre, 'es', { numeric: true });
      }).forEach(function (c) {
        el.cliente.appendChild(h('option', { value: c.id, text: c.nombre + ' · ' + c.telefono }));
      });
      el.cliente.value = elegido || '';
    }

    function rellenarHabitaciones() {
      A.vaciar(el.habitaciones);
      Object.keys(datos.negocio.precioPorBloque).forEach(function (n) {
        el.habitaciones.appendChild(h('label', { class: 'opcion' }, [
          h('input', { type: 'radio', name: 'habitaciones', value: n }),
          h('span', { text: n + ' habitaciones · ' + D.usd(datos.negocio.precioPorBloque[n]) + ' cada 24 h' })
        ]));
      });
      A.vaciar(el.huespedes);
      for (var i = 1; i <= datos.negocio.maxHuespedes; i++) {
        el.huespedes.appendChild(h('option', { value: String(i), text: i + (i === 1 ? ' huésped' : ' huéspedes') }));
      }
    }

    function primerDiaLibre(desde) {
      var d = desde;
      while (A.calc.conflictos(datos, d, d + 1).length && d < desde + 365) { d += 1; }
      return d;
    }

    function calculoNueva() {
      var entrada = F.deISO(el.entrada.value);
      var salida = F.deISO(el.salida.value);
      var hab = radio(el.fNueva, 'habitaciones');
      if (isNaN(entrada) || isNaN(salida) || salida <= entrada || !hab) { return null; }
      var bloques = salida - entrada;
      var precio = A.calc.precio(datos, Number(hab));
      return { entrada: entrada, salida: salida, bloques: bloques, precio: precio, total: precio * bloques, habitaciones: Number(hab) };
    }

    function actualizarNueva() {
      var calc = calculoNueva();
      var moneda = radio(el.fNueva, 'nueva-moneda') || 'USD';
      var tasa = moneda === 'USD' ? 1 : D.leer(el.tasa.value);
      A.vaciar(el.precio);
      el.precio.appendChild(A.icono('dinero'));
      if (!calc) {
        el.precio.appendChild(h('p', { text: 'Elija las fechas y las habitaciones para ver el precio.' }));
      } else {
        el.precio.appendChild(h('div', null, [
          h('p', { class: 'item-titulo', text: 'Total: ' + D.usd(calc.total) +
            (moneda !== 'USD' && tasa > 0 ? ' (≈ ' + D.monto(D.deUSD(calc.total, moneda, tasa), moneda) + ')' : '') }),
          h('p', { class: 'texto-suave', text: calc.bloques + (calc.bloques === 1 ? ' bloque' : ' bloques') + ' de 24 h × ' +
            D.usd(calc.precio) + '. Los extras se cobran aparte.' })
        ]));
        if (!depositoEditado) {
          el.deposito.value = String(D.r2(calc.total * datos.negocio.porcentajeDeposito / 100)).replace('.', ',');
        }
      }
      var pagado = radio(el.fNueva, 'pagado') === 'si';
      el.estadoAyuda.textContent = pagado
        ? 'La reserva quedará confirmada y el depósito se anotará como cobrado hoy.'
        : 'La reserva quedará pendiente. Tiene ' + datos.negocio.horasCaducidadPendiente + ' h (plazo provisional) para pagar el depósito.';
    }

    function comprobarFechas() {
      A.errorCampo(el.salida, el.fechasError, '');
      var calc = calculoNueva();
      if (!calc) { return true; }
      var conflictos = A.calc.conflictos(datos, calc.entrada, calc.salida);
      if (!conflictos.length) { return true; }
      var motivos = { pendiente: 'reserva pendiente', reservado: 'reservado', desactivado: 'desactivado' };
      var lista = conflictos.slice(0, 3).map(function (c) {
        return F.corta(c.dia) + ' (' + motivos[c.motivo] + (c.reserva ? ' ' + c.reserva.id : '') + ')';
      }).join(', ');
      A.errorCampo(el.salida, el.fechasError, 'Esas fechas no están libres: ' + lista +
        (conflictos.length > 3 ? ' y ' + (conflictos.length - 3) + ' días más' : '') + '. Elija otras fechas.');
      return false;
    }

    function actualizarMonedaNueva(ponerTasa) {
      var moneda = radio(el.fNueva, 'nueva-moneda') || 'USD';
      el.tasaCampo.hidden = moneda === 'USD';
      if (moneda !== 'USD') {
        el.tasaEtiqueta.textContent = D.preguntaTasa(moneda);
        if (ponerTasa) { el.tasa.value = String(datos.tasasVigentes[moneda]).replace('.', ','); }
      }
      actualizarNueva();
    }

    function tipoCliente() {
      var nuevo = radio(el.fNueva, 'tipo-cliente') === 'nuevo';
      el.grupoNuevo.hidden = !nuevo;
      el.grupoExistente.hidden = nuevo;
    }

    function limpiarErroresNueva() {
      [[el.cliente, el.clienteError], [el.nombre, el.nombreError], [el.telefono, el.telefonoError],
        [el.email, el.emailError], [el.entrada, el.entradaError], [el.salida, el.salidaError],
        [el.salida, el.fechasError], [el.tasa, el.tasaError], [el.deposito, el.depositoError]]
        .forEach(function (p) { A.errorCampo(p[0], p[1], ''); });
    }

    function abrirNueva(clienteInicial) {
      el.fNueva.reset();
      limpiarErroresNueva();
      depositoEditado = false;
      rellenarClientes(clienteInicial || '');
      marcar(el.fNueva, 'tipo-cliente', 'existente');
      tipoCliente();
      var diaHoy = F.hoy();
      var libre = primerDiaLibre(diaHoy);
      el.entrada.min = F.aISO(diaHoy);
      el.salida.min = F.aISO(diaHoy + 1);
      el.entrada.value = F.aISO(libre);
      el.salida.value = F.aISO(libre + 1);
      marcar(el.fNueva, 'habitaciones', '2');
      el.huespedes.value = '2';
      marcar(el.fNueva, 'nueva-moneda', 'USD');
      marcar(el.fNueva, 'pagado', 'no');
      marcar(el.fNueva, 'origen', 'telefono');
      actualizarMonedaNueva(true);
      comprobarFechas();
      A.abrirDialogo(el.dNueva);
      (clienteInicial ? el.entrada : el.fNueva.querySelector('input[name="tipo-cliente"]')).focus();
    }

    function validarNueva() {
      limpiarErroresNueva();
      var primero = null;
      function error(campo, nodo, texto) {
        A.errorCampo(campo, nodo, texto);
        if (!primero) { primero = campo; }
      }
      var esNuevo = radio(el.fNueva, 'tipo-cliente') === 'nuevo';
      if (!esNuevo && !el.cliente.value) { error(el.cliente, el.clienteError, 'Elija el cliente, o marque «Cliente nuevo».'); }
      if (esNuevo) {
        if (!el.nombre.value.trim()) { error(el.nombre, el.nombreError, 'Escriba el nombre del cliente.'); }
        if (A.soloDigitos(el.telefono.value).length < 8) {
          error(el.telefono, el.telefonoError, 'Escriba el teléfono completo (al menos 8 números).');
        }
        var email = el.email.value.trim();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          error(el.email, el.emailError, 'El correo no parece correcto. Revíselo o déjelo vacío.');
        }
      }
      var diaHoy = F.hoy();
      var entrada = F.deISO(el.entrada.value);
      var salida = F.deISO(el.salida.value);
      if (isNaN(entrada)) { error(el.entrada, el.entradaError, 'Elija el día de entrada.'); }
      else if (entrada < diaHoy) { error(el.entrada, el.entradaError, 'La entrada no puede ser un día que ya pasó.'); }
      if (isNaN(salida)) { error(el.salida, el.salidaError, 'Elija el día de salida.'); }
      else if (!isNaN(entrada) && salida <= entrada) {
        error(el.salida, el.salidaError, 'La salida tiene que ser después de la entrada (al menos un día).');
      }
      if (!primero && !comprobarFechas()) { primero = el.salida; }
      var moneda = radio(el.fNueva, 'nueva-moneda') || 'USD';
      var tasa = 1;
      if (moneda !== 'USD') {
        tasa = D.leer(el.tasa.value);
        if (!(tasa > 0)) { error(el.tasa, el.tasaError, 'Escriba la tasa de cambio.'); }
      }
      var calc = calculoNueva();
      var deposito = D.leer(el.deposito.value);
      if (!(deposito >= 0)) { error(el.deposito, el.depositoError, 'Escriba el depósito en dólares, por ejemplo 150.'); }
      else if (calc && deposito > calc.total) {
        error(el.deposito, el.depositoError, 'El depósito no puede ser mayor que el total (' + D.usd(calc.total) + ').');
      }
      var huespedes = Number(el.huespedes.value);
      if (primero || !calc) {
        if (primero) { primero.focus(); }
        return null;
      }
      return {
        esNuevo: esNuevo,
        calc: calc,
        huespedes: Math.min(Math.max(huespedes, 1), datos.negocio.maxHuespedes),
        moneda: moneda,
        tasa: tasa,
        deposito: D.r2(deposito),
        pagado: radio(el.fNueva, 'pagado') === 'si',
        origen: radio(el.fNueva, 'origen') || 'telefono'
      };
    }

    function guardarNueva(v) {
      var antesReservas = datos.reservas.slice();
      var antesClientes = datos.clientes.slice();
      var clienteId = el.cliente.value;
      if (v.esNuevo) {
        clienteId = A.calc.siguienteId(datos.clientes, 'C');
        datos.clientes = datos.clientes.concat([{
          id: clienteId,
          nombre: el.nombre.value.trim(),
          email: el.email.value.trim(),
          telefono: el.telefono.value.trim(),
          ofertas: el.ofertas.checked,
          notas: '',
          incidencias: [],
          alta: F.aISO(F.hoy())
        }]);
      }
      var id = A.calc.siguienteId(datos.reservas, 'R-');
      var r = {
        id: id,
        clienteId: clienteId,
        entrada: F.aISO(v.calc.entrada),
        salida: F.aISO(v.calc.salida),
        habitaciones: v.calc.habitaciones,
        huespedes: v.huespedes,
        estado: v.pagado ? 'confirmada' : 'pendiente',
        creada: F.ahoraISO(),
        origen: v.origen,
        precioPorBloque: v.calc.precio,
        deposito: v.deposito,
        moneda: v.moneda,
        tasa: v.tasa,
        pagos: v.pagado && v.deposito > 0 ? [{
          fecha: F.aISO(F.hoy()), monto: D.deUSD(v.deposito, v.moneda, v.tasa), moneda: v.moneda, tasa: v.tasa, concepto: 'deposito'
        }] : [],
        nota: el.nota.value.trim()
      };
      datos.reservas = datos.reservas.concat([r]);
      A.cerrarDialogo(el.dNueva);
      if (filtro !== 'todas' && filtro !== r.estado) { filtro = 'todas'; }
      repintar();
      A.aviso('Reserva ' + id + ' guardada (' + A.catalogo.ESTADOS[r.estado].nombre.toLowerCase() + '): ' +
        F.corta(v.calc.entrada) + ' – ' + F.corta(v.calc.salida) + ', ' + D.usd(v.calc.total) + '.', {
        deshacer: function () {
          datos.reservas = antesReservas;
          datos.clientes = antesClientes;
          if (abierta === id && el.detalle.open) { A.cerrarDialogo(el.detalle); abierta = null; }
          repintar();
        }
      });
    }

    /* ---------- Anotar pago ---------- */
    function sugerenciaPago(r, concepto) {
      var pagado = A.calc.pagado(r);
      return concepto === 'deposito' ? Math.max(0, D.r2(r.deposito - pagado)) : A.calc.saldo(r);
    }

    var montoTocado = false;
    function ponerMontoSugerido() {
      if (montoTocado || !reservaPago) { return; }
      var moneda = radio(el.fPago, 'pago-moneda') || 'USD';
      var tasa = moneda === 'USD' ? 1 : D.leer(el.pagoTasa.value);
      var usd = sugerenciaPago(reservaPago, radio(el.fPago, 'concepto'));
      el.pagoMonto.value = usd > 0 && tasa > 0 ? String(D.deUSD(usd, moneda, tasa)).replace('.', ',') : '';
    }

    function actualizarPago(ponerTasa) {
      var moneda = radio(el.fPago, 'pago-moneda') || 'USD';
      el.pagoTasaCampo.hidden = moneda === 'USD';
      if (moneda !== 'USD') {
        el.pagoTasaEtiqueta.textContent = D.preguntaTasa(moneda);
        if (ponerTasa) { el.pagoTasa.value = String(datos.tasasVigentes[moneda]).replace('.', ','); }
      }
      ponerMontoSugerido();
      equivalentePago();
    }

    function equivalentePago() {
      var moneda = radio(el.fPago, 'pago-moneda') || 'USD';
      var monto = D.leer(el.pagoMonto.value);
      var tasa = moneda === 'USD' ? 1 : D.leer(el.pagoTasa.value);
      el.pagoEquivalente.textContent = monto > 0 && tasa > 0
        ? (moneda === 'USD' ? 'Se anotará: ' + D.usd(monto) : 'Equivale a ' + D.usd(D.aUSD(monto, moneda, tasa)) + '.')
        : 'Escriba la cantidad recibida.';
    }

    function abrirPago(r) {
      reservaPago = r;
      montoTocado = false;
      el.fPago.reset();
      [[el.pagoMonto, el.pagoMontoError], [el.pagoTasa, el.pagoTasaError], [el.pagoFecha, el.pagoFechaError]]
        .forEach(function (p) { A.errorCampo(p[0], p[1], ''); });
      var saldo = A.calc.saldo(r);
      el.pagoResumen.textContent = 'Reserva ' + r.id + ' · ' + A.calc.nombreCliente(datos, r.clienteId) +
        '. Falta por cobrar: ' + textoDinero(saldo, r.moneda, r.tasa) + '.';
      marcar(el.fPago, 'concepto', A.calc.pagado(r) < r.deposito ? 'deposito' : 'resto');
      marcar(el.fPago, 'pago-moneda', r.moneda);
      el.pagoFecha.max = F.aISO(F.hoy());
      el.pagoFecha.value = F.aISO(F.hoy());
      actualizarPago(true);
      A.abrirDialogo(el.dPago);
      el.pagoMonto.focus();
    }

    function guardarPago() {
      var r = reservaPago;
      var errores = [];
      [[el.pagoMonto, el.pagoMontoError], [el.pagoTasa, el.pagoTasaError], [el.pagoFecha, el.pagoFechaError]]
        .forEach(function (p) { A.errorCampo(p[0], p[1], ''); });
      var moneda = radio(el.fPago, 'pago-moneda') || 'USD';
      var tasa = moneda === 'USD' ? 1 : D.leer(el.pagoTasa.value);
      var monto = D.leer(el.pagoMonto.value);
      if (moneda !== 'USD' && !(tasa > 0)) {
        A.errorCampo(el.pagoTasa, el.pagoTasaError, 'Escriba la tasa de cambio.');
        errores.push(el.pagoTasa);
      }
      if (!(monto > 0)) {
        A.errorCampo(el.pagoMonto, el.pagoMontoError, 'Escriba la cantidad recibida, por ejemplo 150.');
        errores.unshift(el.pagoMonto);
      } else if (tasa > 0 && D.aUSD(monto, moneda, tasa) > A.calc.saldo(r) + 0.01) {
        A.errorCampo(el.pagoMonto, el.pagoMontoError, 'Es más de lo que falta por cobrar (' + D.usd(A.calc.saldo(r)) +
          '). Los extras se anotan en «Dinero».');
        errores.unshift(el.pagoMonto);
      }
      var fecha = F.deISO(el.pagoFecha.value);
      if (isNaN(fecha) || fecha > F.hoy()) {
        A.errorCampo(el.pagoFecha, el.pagoFechaError, 'Elija la fecha del pago (hoy o antes).');
        errores.push(el.pagoFecha);
      }
      if (errores.length) {
        errores[0].focus();
        return;
      }
      var antes = r.pagos;
      var pago = { fecha: el.pagoFecha.value, monto: D.r2(monto), moneda: moneda, tasa: tasa, concepto: radio(el.fPago, 'concepto') || 'pago' };
      r.pagos = r.pagos.concat([pago]);
      A.cerrarDialogo(el.dPago);
      repintar();
      var saldo = A.calc.saldo(r);
      A.aviso('Pago anotado: ' + D.monto(pago.monto, moneda) + (moneda !== 'USD' ? ' (' + D.usd(D.aUSD(pago.monto, moneda, tasa)) + ')' : '') +
        '. ' + (saldo > 0 ? 'Falta ' + D.usd(saldo) + '.' : 'Ya está pagada por completo.') +
        (r.estado === 'pendiente' ? ' Ahora puede confirmar la reserva.' : ''), {
        icono: 'pago',
        deshacer: function () {
          r.pagos = antes;
          repintar();
        }
      });
    }

    /* ---------- Eventos ---------- */
    el.nueva.addEventListener('click', function () { abrirNueva(); });
    el.detalleCerrar.addEventListener('click', function () { abierta = null; A.cerrarDialogo(el.detalle); });
    el.detalle.addEventListener('cancel', function (e) { e.preventDefault(); abierta = null; A.cerrarDialogo(el.detalle); });

    el.nuevaCancelar.addEventListener('click', function () { A.cerrarDialogo(el.dNueva); });
    el.dNueva.addEventListener('cancel', function (e) { e.preventDefault(); A.cerrarDialogo(el.dNueva); });
    el.fNueva.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = validarNueva();
      if (v) { guardarNueva(v); }
    });
    el.fNueva.addEventListener('change', function (e) {
      var n = e.target.name;
      if (n === 'tipo-cliente') { tipoCliente(); }
      if (n === 'nueva-moneda') { actualizarMonedaNueva(true); return; }
      if (e.target === el.entrada) {
        // Si la salida queda antes de la entrada, se propone una noche más.
        var ent = F.deISO(el.entrada.value);
        if (!isNaN(ent) && !(F.deISO(el.salida.value) > ent)) { el.salida.value = F.aISO(ent + 1); }
        if (!isNaN(ent)) { el.salida.min = F.aISO(ent + 1); }
      }
      if (e.target === el.entrada || e.target === el.salida || n === 'habitaciones') {
        actualizarNueva();
        comprobarFechas();
        return;
      }
      actualizarNueva();
    });
    el.tasa.addEventListener('input', actualizarNueva);
    el.deposito.addEventListener('input', function () { depositoEditado = true; });

    el.pagoCancelar.addEventListener('click', function () { A.cerrarDialogo(el.dPago); });
    el.dPago.addEventListener('cancel', function (e) { e.preventDefault(); A.cerrarDialogo(el.dPago); });
    el.fPago.addEventListener('submit', function (e) { e.preventDefault(); guardarPago(); });
    el.fPago.addEventListener('change', function (e) {
      if (e.target.name === 'pago-moneda') { actualizarPago(true); }
      if (e.target.name === 'concepto') { ponerMontoSugerido(); equivalentePago(); }
    });
    el.pagoMonto.addEventListener('input', function () { montoTocado = true; equivalentePago(); });
    el.pagoTasa.addEventListener('input', function () { ponerMontoSugerido(); equivalentePago(); });

    /* ---------- Arranque ---------- */
    rellenarHabitaciones();
    pintarFiltros();
    pintarLista();
    var idParam = A.parametro('id');
    if (idParam) {
      abrirDetalle(idParam);
    } else if (A.parametro('nueva')) {
      el.nueva.focus();
      abrirNueva(A.parametro('cliente') || '');
    }
  });
})();
