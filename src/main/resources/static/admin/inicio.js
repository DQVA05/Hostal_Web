/* Casita de Tercera · Panel (maqueta) · Inicio.
   "Hoy": entradas, salidas, cobros pendientes y depósitos por cobrar.
   "Este mes": entró, salió y balance (mismas cuentas que Dinero e Informe).
   TODO backend: GET /api/resumen/hoy y GET /api/resumen/mes. */
(function () {
  'use strict';

  var A = window.Admin;
  var F = A.fecha;
  var D = A.dinero;
  var h = A.h;

  A.iniciar(function (datos) {
    var diaHoy = F.hoy();
    var hoyISO = F.aISO(diaHoy);
    var minutos = F.ahoraMinutos() % 1440;
    var saludo = minutos < 12 * 60 ? 'Buenos días' : (minutos < 19 * 60 ? 'Buenas tardes' : 'Buenas noches');
    document.getElementById('saludo').textContent = saludo + '. Hoy es ' + F.larga(diaHoy) + '.';

    var activas = datos.reservas.filter(function (r) { return r.estado !== 'cancelada'; });
    var llegan = activas.filter(function (r) { return r.entrada === hoyISO; });
    var salen = activas.filter(function (r) { return r.salida === hoyISO; });
    // Cobros pendientes: reservas confirmadas con saldo, en curso o que llegan en los próximos 7 días.
    var cobros = activas.filter(function (r) {
      return r.estado === 'confirmada' && A.calc.saldo(r) > 0 && F.deISO(r.entrada) <= diaHoy + 7;
    }).sort(porEntrada);
    // Depósitos por cobrar: reservas pendientes que aún no pagaron el depósito acordado.
    var depositos = activas.filter(function (r) {
      return r.estado === 'pendiente' && A.calc.pagado(r) < r.deposito;
    }).sort(function (a, b) { return A.calc.vence(datos, a) - A.calc.vence(datos, b); });

    function porEntrada(a, b) { return a.entrada < b.entrada ? -1 : (a.entrada > b.entrada ? 1 : 0); }

    function cifra(etiqueta, valor, nota, clase) {
      return h('div', { class: 'cifra' + (clase ? ' ' + clase : '') }, [
        h('span', { class: 'cifra-etiqueta', text: etiqueta }),
        h('span', { class: 'cifra-valor', text: valor }),
        nota ? h('span', { class: 'cifra-nota', text: nota }) : null
      ]);
    }

    var sumaCobros = cobros.reduce(function (s, r) { return s + A.calc.saldo(r); }, 0);
    var sumaDepositos = depositos.reduce(function (s, r) { return s + D.r2(r.deposito - A.calc.pagado(r)); }, 0);
    var cifrasHoy = document.getElementById('hoy-cifras');
    [
      cifra('Llegan hoy', String(llegan.length), llegan.length === 1 ? 'grupo' : 'grupos'),
      cifra('Se van hoy', String(salen.length), salen.length === 1 ? 'grupo' : 'grupos'),
      cifra('Cobros pendientes', D.usd(D.r2(sumaCobros)), cobros.length + (cobros.length === 1 ? ' reserva' : ' reservas')),
      cifra('Depósitos por cobrar', D.usd(D.r2(sumaDepositos)), depositos.length + (depositos.length === 1 ? ' reserva' : ' reservas'))
    ].forEach(function (c) { cifrasHoy.appendChild(c); });

    function tarjetaReserva(r, extra) {
      var saldo = A.calc.saldo(r);
      return h('li', { class: 'item' }, [
        h('div', { class: 'item-cabecera' }, [
          h('span', { class: 'item-titulo', text: A.calc.nombreCliente(datos, r.clienteId) }),
          A.insigniaEstado(r.estado)
        ]),
        h('p', { class: 'item-linea texto-suave', text: r.id + ' · ' + r.huespedes + ' huéspedes · ' + r.habitaciones +
          ' habitaciones · ' + F.corta(F.deISO(r.entrada)) + ' – ' + F.corta(F.deISO(r.salida)) }),
        extra ? h('p', { class: 'item-linea', text: extra }) : null,
        h('p', { class: 'item-linea' + (saldo > 0 ? ' negativo' : ' positivo'),
          text: saldo > 0 ? 'Falta por cobrar: ' + D.usd(saldo) : 'Pagada por completo' }),
        h('div', { class: 'item-acciones' }, A.enlaceBoton('Ver la reserva', 'ver', A.enlaceReserva(r.id)))
      ]);
    }

    function bloque(titulo, lista, vacioTexto, extra) {
      var cont = h('div', { class: 'subseccion' }, [h('h3', { text: titulo })]);
      if (!lista.length) {
        cont.appendChild(h('p', { class: 'texto-suave', text: vacioTexto }));
        return cont;
      }
      var ul = h('ul', { class: 'lista-items' });
      lista.forEach(function (r) { ul.appendChild(tarjetaReserva(r, extra ? extra(r) : '')); });
      cont.appendChild(ul);
      return cont;
    }

    var listas = document.getElementById('hoy-listas');
    listas.appendChild(bloque('Llegan hoy (entrada a las ' + datos.negocio.horaCambio + ')', llegan,
      'Hoy no llega nadie.'));
    listas.appendChild(bloque('Se van hoy (salida a las ' + datos.negocio.horaCambio + ')', salen,
      'Hoy no se va nadie.'));
    listas.appendChild(bloque('Cobros pendientes', cobros,
      'No hay nada pendiente de cobrar en los próximos 7 días.', function (r) {
        var d = F.deISO(r.entrada);
        return d < diaHoy ? 'Alojados desde el ' + F.corta(d) + '.' : (d === diaHoy ? 'Llegan hoy.' : 'Llegan el ' + F.corta(d) + '.');
      }));
    listas.appendChild(bloque('Depósitos por cobrar', depositos,
      'No hay depósitos pendientes.', function (r) {
        var vence = A.calc.vence(datos, r);
        var falta = D.r2(r.deposito - A.calc.pagado(r));
        return 'Depósito: ' + D.usd(falta) + '. ' + (A.calc.vencida(datos, r) ? 'El plazo venció el ' : 'Plazo hasta el ') +
          F.momento(vence) + ' (provisional).';
      }));

    if (!datos.reservas.length) {
      listas.appendChild(h('div', { class: 'seccion' }, A.vacio('reservas', 'Todavía no hay reservas.',
        'Cuando alguien reserve por la web, por teléfono o por WhatsApp, aparecerá aquí. Para anotar una, pulse «Nueva reserva».')));
    }

    /* Este mes (del 1 a hoy): mismas funciones que Dinero e Informe. */
    var pHoy = F.partes(diaHoy);
    var mes = { anio: pHoy.anio, mes: pHoy.mes };
    var p = A.calc.periodoMes(mes);
    var t = A.calc.totales(A.calc.enPeriodo(A.calc.movimientos(datos), p.desde, diaHoy));
    document.getElementById('mes-titulo').textContent = F.nombreMes(mes);
    document.getElementById('mes-ayuda').textContent = 'Del 1 al ' + pHoy.dia + ' de ' + F.MESES[pHoy.mes] + ', en dólares (USD).';
    var cifrasMes = document.getElementById('mes-cifras');
    [
      cifra('Entró', D.usd(t.ingresos), 'Alquiler, extras y propinas'),
      cifra('Salió', D.usd(t.salidas), 'Gastos y pérdidas'),
      cifra('Balance', (t.neto < 0 ? '− ' : '') + D.usd(Math.abs(t.neto)), t.neto >= 0 ? 'Ganancia' : 'Pérdida',
        'cifra-ancha ' + (t.neto >= 0 ? 'positivo' : 'negativo'))
    ].forEach(function (c) { cifrasMes.appendChild(c); });
  });
})();
