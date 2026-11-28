/* Casita de Tercera · Panel (maqueta) · Calendario.
   Mes a mes, semana de lunes a domingo, fecha de La Habana.
   Estados: disponible, pendiente, reservado, desactivado (icono + patrón + texto).
   Tocar un día libre o desactivado lo elige; tocar otro forma un periodo.
   Tocar un día ocupado muestra el resumen de su reserva.
   Los cambios viven solo en memoria. TODO backend: PUT /api/bloqueos. */
(function () {
  'use strict';

  var A = window.Admin;
  var F = A.fecha;
  var h = A.h;

  A.iniciar(function (datos) {
    var el = {
      titulo: document.getElementById('calendario-titulo'),
      dias: document.getElementById('calendario-dias'),
      anterior: document.getElementById('mes-anterior'),
      siguiente: document.getElementById('mes-siguiente'),
      panel: document.getElementById('panel'),
      contadores: document.getElementById('contadores')
    };

    var diaHoy = F.hoy();
    var pHoy = F.partes(diaHoy);
    var estado = {
      mes: { anio: pHoy.anio, mes: pHoy.mes },
      desde: null,      // primer día tocado
      hasta: null,      // segundo día tocado (puede ser anterior al primero)
      consulta: null,   // día ocupado o pasado que se está consultando
      foco: null
    };
    var paramMes = A.parametro('mes');
    if (/^\d{4}-\d{2}$/.test(paramMes || '')) {
      estado.mes = F.mesDeClave(paramMes);
    }
    var guia = A.parametro('accion') === 'bloquear';

    var ocupacion;
    var desactivados;
    function recalcular() {
      ocupacion = A.calc.ocupacion(datos);
      desactivados = A.calc.desactivados(datos);
    }

    function estadoDe(n) {
      return A.calc.estadoDia(n, ocupacion, desactivados);
    }

    function seleccion() {
      if (estado.desde === null) { return null; }
      var b = estado.hasta === null ? estado.desde : estado.hasta;
      return { desde: Math.min(estado.desde, b), hasta: Math.max(estado.desde, b) };
    }

    function textoDias(n) {
      return n + (n === 1 ? ' día' : ' días');
    }

    function textoPeriodo(sel) {
      if (sel.desde === sel.hasta) { return F.media(sel.desde); }
      return 'del ' + F.media(sel.desde) + ' al ' + F.media(sel.hasta);
    }

    var NOMBRES = { disponible: 'disponible', pendiente: 'pendiente', reservado: 'reservado', desactivado: 'desactivado' };
    var ICONOS = { pendiente: 'reloj', reservado: 'check', desactivado: 'candado' };

    /* ---------- Calendario ---------- */
    function pintar(enfocar) {
      var mes = estado.mes;
      var primero = F.numeroDeDia(mes.anio, mes.mes, 1);
      var ultimo = primero + F.diasDelMes(mes.anio, mes.mes) - 1;
      el.titulo.textContent = F.nombreMes(mes);

      var foco = estado.foco;
      if (foco === null || foco < primero || foco > ultimo) {
        foco = (diaHoy >= primero && diaHoy <= ultimo) ? diaHoy : primero;
      }
      estado.foco = foco;

      var sel = seleccion();
      var filas = document.createDocumentFragment();
      var fila = null;
      var desde = primero - F.columna(primero);
      for (var i = 0; i < 42; i++) {   // siempre 6 semanas: el alto no cambia
        if (i % 7 === 0) {
          fila = h('tr');
          filas.appendChild(fila);
        }
        var dia = desde + i;
        var celda = h('td');
        fila.appendChild(celda);
        if (dia < primero || dia > ultimo) { continue; }

        var est = estadoDe(dia);
        var pasado = dia < diaHoy;
        var elegible = !pasado && (est === 'disponible' || est === 'desactivado');
        var elegido = sel !== null && dia >= sel.desde && dia <= sel.hasta;

        var etiqueta = F.larga(dia);
        if (dia === diaHoy) { etiqueta += ', hoy'; }
        etiqueta += ', ' + NOMBRES[est];
        var o = ocupacion.get(dia);
        if (o) {
          etiqueta += ': reserva ' + o.reserva.id + ' de ' + A.calc.nombreCliente(datos, o.reserva.clienteId);
        } else if (est === 'desactivado') {
          etiqueta += ' (' + A.catalogo.MOTIVOS[desactivados.get(dia).motivo] + ')';
        }
        if (pasado) { etiqueta += ', ya pasó'; }
        if (elegido && elegible) { etiqueta += ', elegido'; }

        var clases = 'dia dia-' + est + (pasado ? ' dia-pasado' : '') + (dia === diaHoy ? ' dia-hoy' : '');
        var boton = h('button', {
          type: 'button',
          class: clases,
          'data-dia': String(dia),
          tabindex: dia === foco ? '0' : '-1',
          'aria-label': etiqueta,
          'aria-pressed': elegible ? (elegido ? 'true' : 'false') : null,
          'aria-current': dia === diaHoy ? 'date' : null
        }, [
          h('span', { class: 'dia-numero', 'aria-hidden': 'true', text: String(dia - primero + 1) }),
          ICONOS[est] ? A.icono(ICONOS[est]) : null
        ]);
        celda.appendChild(boton);
      }
      A.vaciar(el.dias).appendChild(filas);
      if (enfocar) {
        var activo = el.dias.querySelector('button[tabindex="0"]');
        if (activo) { activo.focus(); }
      }
      pintarContadores();
    }

    /* ---------- Contadores del mes visible ---------- */
    function pintarContadores() {
      var p = A.calc.periodoMes(estado.mes);
      var r = A.calc.resumenDias(datos, p.desde, p.hasta);
      function cifra(etiqueta, valor, nota, ancha) {
        return h('div', { class: 'cifra' + (ancha ? ' cifra-ancha' : '') }, [
          h('span', { class: 'cifra-etiqueta', text: etiqueta }),
          h('span', { class: 'cifra-valor', text: valor }),
          nota ? h('span', { class: 'cifra-nota', text: nota }) : null
        ]);
      }
      A.vaciar(el.contadores);
      [
        cifra('Disponibles', String(r.disponibles), 'desde hoy'),
        cifra('Pendientes', String(r.pendientes)),
        cifra('Reservados', String(r.reservados)),
        cifra('Desactivados', String(r.desactivados)),
        cifra('Ocupación', Math.round(r.ocupacion * 100) + ' %',
          'Días reservados ÷ (días del mes − desactivados). Días pasados sin reserva: ' + r.pasadosLibres + '.', true)
      ].forEach(function (c) { el.contadores.appendChild(c); });
    }

    /* ---------- Panel bajo el calendario ---------- */
    function pintarPanel() {
      A.vaciar(el.panel);

      if (estado.consulta !== null) {
        el.panel.appendChild(panelConsulta(estado.consulta));
        return;
      }

      var sel = seleccion();
      if (!sel) {
        el.panel.appendChild(h('div', { class: 'tarjeta pila' }, [
          guia ? h('p', { class: 'nota nota-aviso' }, [A.icono('candado'),
            h('span', { text: 'Para bloquear días: pulse el primer día y después el último. Luego pulse «Desactivar».' })])
            : null,
          h('p', { text: 'Ningún día elegido. Pulse en el calendario un día disponible o desactivado.' })
        ]));
        return;
      }

      var libres = [];
      var cerrados = [];
      var problemas = [];
      for (var d = sel.desde; d <= sel.hasta; d++) {
        var est = estadoDe(d);
        if (d < diaHoy) {
          problemas.push(F.corta(d) + ' ya pasó');
        } else if (est === 'pendiente' || est === 'reservado') {
          var r = ocupacion.get(d).reserva;
          problemas.push(F.corta(d) + ' tiene una reserva ' + (est === 'pendiente' ? 'pendiente' : 'confirmada') +
            ' (' + r.id + ')');
        } else if (est === 'desactivado') {
          cerrados.push(d);
        } else {
          libres.push(d);
        }
      }
      var total = sel.hasta - sel.desde + 1;
      var tarjeta = h('div', { class: 'tarjeta pila' }, [
        h('p', { class: 'item-titulo', text: 'Elegido: ' + textoPeriodo(sel) + ' (' + textoDias(total) + ')' })
      ]);

      if (problemas.length) {
        var lista = h('ul');
        problemas.slice(0, 5).forEach(function (t) { lista.appendChild(h('li', { text: '• ' + t })); });
        if (problemas.length > 5) { lista.appendChild(h('li', { text: '• y ' + (problemas.length - 5) + ' días más' })); }
        tarjeta.appendChild(h('div', { class: 'nota nota-aviso' }, [A.icono('alerta'), h('div', null, [
          h('p', { text: 'Este periodo no se puede cambiar porque incluye días ocupados o pasados:' }),
          lista,
          h('p', { text: 'Elija otro periodo sin reservas ni días pasados.' })
        ])]));
        tarjeta.appendChild(A.boton('Quitar selección', 'cerrar', 'boton-secundario boton-bloque', quitarSeleccion));
        el.panel.appendChild(tarjeta);
        return;
      }

      if (total === 1 && cerrados.length === 1) {
        var b = desactivados.get(cerrados[0]);
        tarjeta.appendChild(h('p', { text: 'Está desactivado. Motivo: ' + A.catalogo.MOTIVOS[b.motivo] +
          (b.nota ? ' — ' + b.nota : '') + '.' }));
      }
      if (estado.hasta === null) {
        tarjeta.appendChild(h('p', { class: 'texto-suave', text: 'Si quiere elegir un periodo, pulse ahora el último día.' }));
      }

      var botones = h('div', { class: 'botones-columna' });
      if (libres.length) {
        botones.appendChild(A.boton('Desactivar ' + textoDias(libres.length), 'candado', 'boton-principal boton-grande',
          function () { desactivar(sel, libres); }));
      }
      if (cerrados.length) {
        botones.appendChild(A.boton('Activar ' + textoDias(cerrados.length), 'abierto',
          libres.length ? 'boton-secundario' : 'boton-principal boton-grande',
          function () { activar(sel, cerrados); }));
      }
      botones.appendChild(A.boton('Quitar selección', 'cerrar', 'boton-secundario', quitarSeleccion));
      tarjeta.appendChild(botones);
      el.panel.appendChild(tarjeta);
    }

    function panelConsulta(dia) {
      var est = estadoDe(dia);
      var o = ocupacion.get(dia);
      var tarjeta = h('div', { class: 'tarjeta pila' });
      if (o) {
        var r = o.reserva;
        var saldo = A.calc.saldo(r);
        tarjeta.appendChild(h('div', { class: 'item-cabecera' }, [
          h('p', { class: 'item-titulo', text: F.media(dia) }),
          A.insigniaEstado(r.estado)
        ]));
        tarjeta.appendChild(h('dl', { class: 'datos' }, [
          fila('Reserva', r.id),
          fila('Cliente', A.calc.nombreCliente(datos, r.clienteId)),
          fila('Entrada', F.corta(F.deISO(r.entrada)) + ', ' + datos.negocio.horaCambio),
          fila('Salida', F.corta(F.deISO(r.salida)) + ', ' + datos.negocio.horaCambio),
          fila('Grupo', r.huespedes + ' huéspedes · ' + r.habitaciones + ' habitaciones'),
          fila('Total', A.dinero.usd(A.calc.total(r))),
          fila('Falta por cobrar', saldo > 0 ? A.dinero.usd(saldo) : 'Nada, está pagada')
        ]));
        if (r.estado === 'pendiente') {
          var vencida = A.calc.vencida(datos, r);
          tarjeta.appendChild(h('p', { class: 'nota nota-aviso' }, [A.icono('reloj'), h('span', {
            text: (vencida ? 'Venció el ' : 'Vence el ') + F.momento(A.calc.vence(datos, r)) +
              ' (plazo provisional de ' + datos.negocio.horasCaducidadPendiente + ' h).'
          })]));
        }
        tarjeta.appendChild(h('p', { class: 'texto-suave', text: 'Este día no se puede desactivar porque tiene una reserva.' }));
        tarjeta.appendChild(h('div', { class: 'botones-columna' }, [
          A.enlaceBoton('Ver la reserva', 'ver', A.enlaceReserva(r.id), 'boton-principal boton-grande'),
          A.boton('Cerrar este resumen', 'cerrar', 'boton-secundario', cerrarConsulta)
        ]));
      } else {
        tarjeta.appendChild(h('p', { class: 'item-titulo', text: F.media(dia) }));
        var texto = 'Este día ya pasó. Los días pasados no se pueden cambiar.';
        if (est === 'desactivado') {
          var b = desactivados.get(dia);
          texto += ' Estuvo desactivado por: ' + A.catalogo.MOTIVOS[b.motivo] + (b.nota ? ' — ' + b.nota : '') + '.';
        }
        tarjeta.appendChild(h('p', { text: texto }));
        tarjeta.appendChild(A.boton('Cerrar', 'cerrar', 'boton-secundario boton-bloque', cerrarConsulta));
      }
      return tarjeta;
    }

    function fila(dt, dd) {
      return h('div', null, [h('dt', { text: dt }), h('dd', { text: dd })]);
    }

    /* ---------- Interacción ---------- */
    function tocar(dia) {
      estado.foco = dia;
      var est = estadoDe(dia);
      if (dia < F.hoy() || est === 'pendiente' || est === 'reservado') {
        estado.consulta = dia;
      } else {
        estado.consulta = null;
        if (estado.desde === null || estado.hasta !== null) {
          estado.desde = dia;
          estado.hasta = null;
        } else if (dia === estado.desde) {
          estado.desde = null;    // tocar otra vez el mismo día lo quita
        } else {
          estado.hasta = dia;
        }
      }
      pintar(true);
      pintarPanel();
    }

    function quitarSeleccion() {
      estado.desde = null;
      estado.hasta = null;
      pintar(false);
      pintarPanel();
      enfocarCalendario();
    }

    function cerrarConsulta() {
      estado.consulta = null;
      pintarPanel();
      enfocarCalendario();
    }

    function enfocarCalendario() {
      var activo = el.dias.querySelector('button[tabindex="0"]');
      if (activo) { activo.focus(); }
    }

    function aplicarCambio(antes, texto) {
      recalcular();
      estado.desde = null;
      estado.hasta = null;
      pintar(true);   // el foco vuelve al día en el calendario
      pintarPanel();
      A.aviso(texto, {
        icono: 'check',
        deshacer: function () {
          datos.bloqueos = antes;
          recalcular();
          pintar(false);
          pintarPanel();
        }
      });
    }

    /* Vuelve a comprobar justo antes de guardar (por si pasó la medianoche). */
    function siguenLibres(dias) {
      var diaActual = F.hoy();
      return dias.every(function (d) {
        var e = estadoDe(d);
        return d >= diaActual && (e === 'disponible' || e === 'desactivado');
      });
    }

    function desactivar(sel, libres) {
      var nombre = 'motivo-' + Date.now();
      var opciones = h('div', { class: 'opciones' });
      Object.keys(A.catalogo.MOTIVOS).forEach(function (clave) {
        opciones.appendChild(h('label', { class: 'opcion' }, [
          h('input', { type: 'radio', name: nombre, value: clave }),
          h('span', { text: A.catalogo.MOTIVOS[clave] })
        ]));
      });
      var idNota = nombre + '-nota';
      var nota = h('input', { type: 'text', id: idNota, maxlength: '120', autocomplete: 'off' });
      var contenido = h('div', { class: 'formulario' }, [
        h('fieldset', null, [h('legend', { text: 'Motivo (obligatorio)' }), opciones]),
        h('div', { class: 'campo' }, [
          h('label', { for: idNota }, ['Detalle ', h('span', { class: 'opcional', text: '(obligatorio si elige «Otro motivo»)' })]),
          nota
        ])
      ]);
      function elegido() {
        var marcado = opciones.querySelector('input:checked');
        return marcado ? marcado.value : '';
      }
      A.confirmar({
        titulo: 'Desactivar ' + textoDias(libres.length),
        texto: 'Días: ' + textoPeriodo(sel) + '. Mientras estén desactivados nadie podrá reservarlos.',
        aceptar: 'Sí, desactivar',
        icono: 'candado',
        contenido: contenido,
        validar: function () {
          if (!elegido()) { return 'Elija un motivo para poder desactivar los días.'; }
          if (elegido() === 'otro' && !nota.value.trim()) { return 'Escriba el motivo en «Detalle».'; }
          return '';
        }
      }).then(function (ok) {
        if (!ok) { return; }
        if (!siguenLibres(libres)) {
          recalcular();
          pintar(false);
          pintarPanel();
          A.aviso('No se guardó: algún día ya no está libre. Revise la selección.', { icono: 'alerta' });
          return;
        }
        var antes = datos.bloqueos.slice();
        var motivo = elegido();
        datos.bloqueos = datos.bloqueos.concat(libres.map(function (d) {
          return { fecha: F.aISO(d), motivo: motivo, nota: nota.value.trim() };
        }));
        aplicarCambio(antes, 'Se desactivaron ' + textoDias(libres.length) + ' (' +
          A.catalogo.MOTIVOS[motivo].toLowerCase() + ').');
      });
    }

    function activar(sel, cerrados) {
      A.confirmar({
        titulo: 'Activar ' + textoDias(cerrados.length),
        texto: 'Días: ' + textoPeriodo(sel) + '. Volverán a estar disponibles para reservar.',
        aceptar: 'Sí, activar',
        icono: 'abierto'
      }).then(function (ok) {
        if (!ok) { return; }
        if (!siguenLibres(cerrados)) {
          recalcular();
          pintar(false);
          pintarPanel();
          A.aviso('No se guardó: algún día ya pasó. Revise la selección.', { icono: 'alerta' });
          return;
        }
        var antes = datos.bloqueos.slice();
        var quitar = new Set(cerrados.map(F.aISO));
        datos.bloqueos = datos.bloqueos.filter(function (b) { return !quitar.has(b.fecha); });
        aplicarCambio(antes, 'Se activaron ' + textoDias(cerrados.length) + '. Ya se pueden reservar.');
      });
    }

    el.dias.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-dia]');
      if (b) { tocar(Number(b.getAttribute('data-dia'))); }
    });

    el.dias.addEventListener('keydown', function (e) {
      var b = e.target.closest('button[data-dia]');
      if (!b) { return; }
      var actual = Number(b.getAttribute('data-dia'));
      var destino;
      switch (e.key) {
        case 'ArrowLeft': destino = actual - 1; break;
        case 'ArrowRight': destino = actual + 1; break;
        case 'ArrowUp': destino = actual - 7; break;
        case 'ArrowDown': destino = actual + 7; break;
        case 'Home': destino = actual - F.columna(actual); break;
        case 'End': destino = actual + 6 - F.columna(actual); break;
        case 'PageUp': destino = F.mismoDiaEnOtroMes(actual, -1); break;
        case 'PageDown': destino = F.mismoDiaEnOtroMes(actual, 1); break;
        default: return;
      }
      e.preventDefault();
      var p = F.partes(destino);
      estado.mes = { anio: p.anio, mes: p.mes };
      estado.foco = destino;
      pintar(true);
    });

    function cambiarMes(cantidad) {
      estado.mes = F.sumarMeses(estado.mes, cantidad);
      estado.foco = null;
      pintar(false);
    }
    el.anterior.addEventListener('click', function () { cambiarMes(-1); });
    el.siguiente.addEventListener('click', function () { cambiarMes(1); });

    recalcular();
    pintar(false);
    pintarPanel();
    if (guia) { enfocarCalendario(); }
  });
})();
