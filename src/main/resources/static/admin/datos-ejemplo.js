/* Casita de Tercera · Panel (maqueta) · DATOS DE EJEMPLO.
   ÚNICO origen de datos: todas las páginas leen window.DATOS_EJEMPLO a través de
   Admin.cargarDatos() (comun.js). Cuando exista el backend, este archivo se
   sustituye por llamadas a la API que devuelvan la misma forma.
   TODO ES FICTICIO: "Cliente Ejemplo N", correos @example.com, teléfonos 0000.
   Para que la maqueta parezca viva cualquier día que se abra, las fechas se
   calculan respecto a HOY en La Habana y el historial se genera con números
   pseudoaleatorios fijos (siempre la misma secuencia).

   Formatos (los mismos que debería devolver la API):
   - Fechas 'AAAA-MM-DD' en hora de La Habana; momentos 'AAAA-MM-DDTHH:MM'.
   - Todo importe lleva moneda y tasa de cambio:
       USD → tasa 1
       EUR → tasa = cuántos USD vale 1 EUR (p. ej. 1.08)
       CUP → tasa = cuántos CUP vale 1 USD (p. ej. 420)
   - Una reserva ocupa desde el día de entrada hasta el día anterior a la salida
     (bloques de 24 h, de 10:00 a 10:00).
   - Los cobros de alquiler NO están en "movimientos": salen de reservas[].pagos.
     "movimientos" guarda lo que se anota a mano (extras, propinas, gastos, pérdidas). */
(function () {
  'use strict';

  var MS = 86400000;

  function hoyHabana() {
    var ahora = new Date();
    try {
      var p = {};
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Havana', year: 'numeric', month: 'numeric', day: 'numeric'
      }).formatToParts(ahora).forEach(function (x) { p[x.type] = x.value; });
      return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)) / MS;
    } catch (e) {
      return Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()) / MS;
    }
  }

  var HOY = hoyHabana();
  var INICIO = HOY - 400;

  function dos(n) { return (n < 10 ? '0' : '') + n; }
  function iso(n) {
    var d = new Date(n * MS);
    return d.getUTCFullYear() + '-' + dos(d.getUTCMonth() + 1) + '-' + dos(d.getUTCDate());
  }
  function f(desplazamiento) { return iso(HOY + desplazamiento); }
  function mesDe(n) { return new Date(n * MS).getUTCMonth(); }

  /* Pseudoaleatorio con semilla fija (Park–Miller). */
  var semilla = 4271;
  function azar() { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; }
  function entre(a, b) { return a + Math.floor(azar() * (b - a + 1)); }
  function elegir(lista) { return lista[Math.floor(azar() * lista.length)]; }
  function r2(x) { return Math.round(x * 100) / 100; }

  /* Tasas ficticias que cambian con el tiempo. */
  function tasaEUR(n) {
    var i = Math.floor((n - INICIO) / 30) % 6;
    return [1.06, 1.07, 1.08, 1.09, 1.08, 1.07][(i + 6) % 6]; // también para fechas anteriores al inicio
  }
  function tasaCUP(n) { return 360 + Math.round(Math.max(0, n - INICIO) / 400 * 12) * 5; }
  function tasaDe(moneda, n) { return moneda === 'USD' ? 1 : (moneda === 'EUR' ? tasaEUR(n) : tasaCUP(n)); }
  function enMoneda(usd, moneda, tasa) {
    if (moneda === 'USD') { return usd; }
    return moneda === 'EUR' ? r2(usd / tasa) : Math.round(usd * tasa);
  }

  /* ---------- Clientes ---------- */
  function cliente(n, ofertas, notas, altaDesp, cambios) {
    var c = {
      id: 'C' + dos(n),
      nombre: 'Cliente Ejemplo ' + n,
      email: 'cliente' + n + '@example.com',
      telefono: '+53 0000 00' + dos(n),
      ofertas: ofertas,
      notas: notas || '',
      incidencias: [],
      alta: f(altaDesp)
    };
    Object.keys(cambios || {}).forEach(function (k) { c[k] = cambios[k]; });
    return c;
  }

  var clientes = [
    cliente(1, true, 'Viene cada verano con su familia.', -395),
    cliente(2, false, '', -380),
    cliente(3, true, 'Prefiere pagar en euros.', -360),
    cliente(4, true, '', -340),
    cliente(5, false, 'Pidió cuna para un bebé.', -300, {
      incidencias: [{ fecha: f(-120), texto: 'Se rompió una copa. Se cobró aparte (5 USD).' }]
    }),
    cliente(6, true, '', -280),
    // Mismo teléfono que Cliente Ejemplo 3: la página de clientes lo advierte.
    cliente(7, false, '', -250, { telefono: '+53 0000 0003' }),
    cliente(8, true, 'Llega tarde por el vuelo; dejar la llave preparada.', -220, {
      incidencias: [{ fecha: f(-200), texto: 'Ruido después de medianoche. Se habló con el grupo.' }]
    }),
    // Reservó por teléfono y no dejó correo.
    cliente(9, false, 'Reserva siempre por teléfono.', -190, { email: '' }),
    cliente(10, true, '', -150),
    cliente(11, false, '', -110),
    cliente(12, false, '', -80, { email: '' }),
    cliente(13, true, 'Grupo de amigos; pidió transporte desde el aeropuerto.', -45),
    // Misma persona que Cliente Ejemplo 6 con otra ficha: el correo coincide (en mayúsculas).
    cliente(14, true, '', -20, { email: 'CLIENTE6@example.com', telefono: '+53 0000 0114' })
  ];

  /* ---------- Reservas y movimientos ---------- */
  var reservas = [];
  var movimientos = [];
  var numReserva = 0;
  var numMovimiento = 0;

  function codigo() {
    numReserva += 1;
    return 'R-' + ('000' + numReserva).slice(-4);
  }

  function pago(n, usd, moneda, concepto) {
    var tasa = tasaDe(moneda, n);
    return { fecha: iso(n), monto: enMoneda(usd, moneda, tasa), moneda: moneda, tasa: tasa, concepto: concepto };
  }

  function movimiento(n, tipo, categoria, usd, moneda, nota, reservaId) {
    if (n > HOY) { return; }
    var tasa = tasaDe(moneda, n);
    numMovimiento += 1;
    movimientos.push({
      id: 'M' + ('000' + numMovimiento).slice(-4),
      fecha: iso(n),
      tipo: tipo,                 // ingreso | gasto | perdida | propina
      categoria: categoria,
      monto: enMoneda(usd, moneda, tasa),
      moneda: moneda,
      tasa: tasa,
      nota: nota || '',
      reservaId: reservaId || null
    });
  }

  function temporadaAlta(n) {
    var m = mesDe(n);
    return m === 0 || m === 6 || m === 7 || m === 11; // enero, julio, agosto, diciembre
  }

  // Historial: reservas pasadas sin solaparse, hasta dos días antes de hoy.
  var conEmail = ['C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07', 'C08', 'C09', 'C10', 'C11', 'C12'];
  var dia = INICIO + 5;
  for (;;) {
    var alta = temporadaAlta(dia);
    dia += alta ? entre(0, 3) : entre(2, 9);
    var bloques = entre(1, alta ? 4 : 3);
    if (dia + bloques > HOY - 2) { break; }
    var habitaciones = azar() < 0.55 ? 2 : 3;
    var precio = habitaciones === 3 ? 150 : 100;
    var total = precio * bloques;
    var cancelada = azar() < 0.07;
    var x = azar();
    var moneda = x < 0.68 ? 'USD' : (x < 0.9 ? 'EUR' : 'CUP');
    var creada = dia - entre(3, 35);
    var id = codigo();
    reservas.push({
      id: id,
      clienteId: elegir(conEmail),
      entrada: iso(dia),
      salida: iso(dia + bloques),
      habitaciones: habitaciones,
      huespedes: habitaciones === 3 ? entre(3, 6) : entre(2, 5),
      estado: cancelada ? 'cancelada' : 'completada',
      creada: iso(creada) + 'T' + dos(entre(8, 21)) + ':' + dos(elegir([0, 15, 30, 45])),
      origen: elegir(['web', 'web', 'whatsapp', 'telefono']),
      precioPorBloque: precio,
      deposito: total / 2,
      moneda: moneda,
      tasa: tasaDe(moneda, dia),
      pagos: cancelada ? [] : [
        pago(creada + 1, total / 2, moneda, 'deposito'),
        pago(dia, total / 2, moneda, 'resto')
      ],
      nota: ''
    });
    if (!cancelada) {
      if (azar() < 0.4) {
        movimiento(dia + entre(0, bloques - 1), 'ingreso', 'gastronomia', entre(5, 18) * 5, moneda,
          'Desayunos y cenas para el grupo', id);
      }
      if (azar() < 0.3) {
        movimiento(dia, 'ingreso', 'transporte', entre(6, 16) * 5, 'USD',
          'Traslado aeropuerto–casa (auto de 7 plazas con chofer)', id);
      }
      if (azar() < 0.12) {
        movimiento(dia + entre(0, bloques - 1), 'ingreso', 'pasadia', entre(4, 10) * 5, 'USD',
          'Pasadía para amigos del grupo', id);
      }
      if (azar() < 0.3) {
        movimiento(dia + bloques, 'propina', 'propina', entre(1, 4) * 5, moneda, 'Propina al despedirse', id);
      }
    }
    dia += bloques;
  }

  // Gastos y otros movimientos de cada mes.
  var NOTAS_COMPRAS = ['Productos de limpieza', 'Agua embotellada', 'Sábanas y toallas', 'Café y azúcar para huéspedes',
    'Papel higiénico y jabón', 'Bombillos'];
  var NOTAS_MANTENIMIENTO = ['Revisión del aire acondicionado', 'Pintura de una habitación', 'Arreglo de la bomba de agua',
    'Cambio de cerradura', 'Limpieza del tanque de agua'];
  var NOTAS_ROTURAS = ['Vaso roto', 'Toalla manchada sin arreglo', 'Plato roto', 'Mando del aire perdido'];
  var inicioFecha = new Date(INICIO * MS);
  for (var m = 0; ; m++) {
    var primero = Date.UTC(inicioFecha.getUTCFullYear(), inicioFecha.getUTCMonth() + m, 1) / MS;
    if (primero > HOY) { break; }
    var mesAlto = temporadaAlta(primero);
    movimiento(primero, 'gasto', 'salarios', 80, 'USD', 'Salario del mes: limpieza y atención');
    movimiento(primero + 7, 'gasto', 'electricidad-agua', entre(25, 45), 'CUP', 'Factura de electricidad y agua');
    var compras = entre(2, 4);
    for (var k = 0; k < compras; k++) {
      movimiento(primero + entre(2, 27), 'gasto', 'compras', entre(12, 60), elegir(['USD', 'CUP', 'CUP']),
        elegir(NOTAS_COMPRAS));
    }
    if (azar() < 0.35) {
      movimiento(primero + entre(3, 26), 'gasto', 'mantenimiento', entre(20, 120), 'USD', elegir(NOTAS_MANTENIMIENTO));
    }
    if (azar() < 0.25) {
      movimiento(primero + entre(3, 26), 'perdida', 'roturas-danos', entre(3, 25), 'USD', elegir(NOTAS_ROTURAS));
    }
    if (mesAlto && azar() < 0.6) {
      movimiento(primero + entre(3, 26), 'ingreso', 'pasadia', entre(5, 12) * 5, 'USD',
        'Pasadía para visitantes sin alojamiento');
    }
    if (azar() < 0.15) {
      movimiento(primero + entre(3, 26), 'gasto', 'otro', entre(5, 20), 'CUP', 'Gestiones y papeleo');
    }
    if (azar() < 0.2) {
      movimiento(primero + entre(3, 26), 'ingreso', 'otro', entre(2, 6) * 5, 'USD', 'Venta de agua y refrescos');
    }
  }

  // Reservas actuales y próximas (escritas a mano para que la maqueta tenga casos de todo tipo).
  function reservaActual(o) {
    var bloquesR = o.salida - o.entrada;
    var precioR = o.habitaciones === 3 ? 150 : 100;
    var idR = codigo();
    reservas.push({
      id: idR,
      clienteId: o.cliente,
      entrada: f(o.entrada),
      salida: f(o.salida),
      habitaciones: o.habitaciones,
      huespedes: o.huespedes,
      estado: o.estado,
      creada: f(o.creada[0]) + 'T' + o.creada[1],
      origen: o.origen,
      precioPorBloque: precioR,
      deposito: o.deposito !== undefined ? o.deposito : precioR * bloquesR / 2,
      moneda: o.moneda,
      tasa: tasaDe(o.moneda, HOY),
      pagos: (o.pagos || []).map(function (p) { return pago(HOY + p[0], p[2], o.moneda, p[1]); }),
      nota: o.nota || ''
    });
    return idR;
  }

  var rSale = reservaActual({ cliente: 'C02', entrada: -2, salida: 0, habitaciones: 3, huespedes: 6,
    estado: 'confirmada', creada: [-20, '11:20'], moneda: 'USD', origen: 'web',
    pagos: [[-19, 'deposito', 150], [-2, 'resto', 150]] });
  var rEntra = reservaActual({ cliente: 'C04', entrada: 0, salida: 3, habitaciones: 2, huespedes: 4,
    estado: 'confirmada', creada: [-11, '19:05'], moneda: 'EUR', origen: 'web',
    pagos: [[-10, 'deposito', 150]], nota: 'Cobrar el resto al llegar.' });
  reservaActual({ cliente: 'C06', entrada: 5, salida: 7, habitaciones: 3, huespedes: 5,
    estado: 'pendiente', creada: [-1, '16:30'], moneda: 'USD', origen: 'web' });
  reservaActual({ cliente: 'C08', entrada: 10, salida: 14, habitaciones: 2, huespedes: 3,
    estado: 'confirmada', creada: [-7, '10:40'], moneda: 'CUP', origen: 'whatsapp',
    pagos: [[-6, 'deposito', 200]] });
  reservaActual({ cliente: 'C10', entrada: 19, salida: 21, habitaciones: 2, huespedes: 2,
    estado: 'pendiente', creada: [-3, '09:00'], moneda: 'USD', origen: 'whatsapp',
    nota: 'Dijo que enviaría el depósito.' });
  reservaActual({ cliente: 'C11', entrada: 24, salida: 26, habitaciones: 3, huespedes: 6,
    estado: 'cancelada', creada: [-8, '18:45'], moneda: 'USD', origen: 'web',
    nota: 'Canceló por cambio de vuelo.' });
  reservaActual({ cliente: 'C03', entrada: 30, salida: 33, habitaciones: 3, huespedes: 6,
    estado: 'confirmada', creada: [-5, '12:10'], moneda: 'EUR', origen: 'telefono', deposito: 135,
    pagos: [[-4, 'deposito', 135]], nota: 'Depósito negociado del 30 %.' });
  reservaActual({ cliente: 'C09', entrada: 45, salida: 47, habitaciones: 2, huespedes: 4,
    estado: 'pendiente', creada: [-1, '20:15'], moneda: 'USD', origen: 'telefono' });
  reservaActual({ cliente: 'C13', entrada: 60, salida: 64, habitaciones: 3, huespedes: 6,
    estado: 'confirmada', creada: [-2, '08:50'], moneda: 'USD', origen: 'web',
    pagos: [[-2, 'deposito', 300]] });

  movimiento(HOY - 2, 'ingreso', 'transporte', 50, 'USD', 'Traslado aeropuerto–casa (auto de 7 plazas con chofer)', rSale);
  movimiento(HOY - 1, 'ingreso', 'gastronomia', 60, 'USD', 'Cena criolla para 6 personas', rSale);
  movimiento(HOY, 'propina', 'propina', 10, 'USD', 'Propina al despedirse', rSale);
  movimiento(HOY, 'ingreso', 'transporte', 40, 'EUR', 'Traslado aeropuerto–casa', rEntra);

  movimientos.sort(function (a, b) { return a.fecha < b.fecha ? -1 : (a.fecha > b.fecha ? 1 : 0); });

  /* ---------- Días desactivados ---------- */
  function ocupado(n) {
    var d = iso(n);
    return reservas.some(function (r) { return r.estado !== 'cancelada' && r.entrada <= d && d < r.salida; });
  }
  var diaPasadoLibre = HOY - 9;
  while (ocupado(diaPasadoLibre)) { diaPasadoLibre -= 1; }

  var bloqueos = [
    { fecha: iso(diaPasadoLibre), motivo: 'mantenimiento', nota: 'Revisión del aire acondicionado' },
    { fecha: f(16), motivo: 'mantenimiento', nota: 'Pintura de la terraza' },
    { fecha: f(17), motivo: 'mantenimiento', nota: 'Pintura de la terraza' },
    { fecha: f(40), motivo: 'uso-propio', nota: 'Visita familiar' }
  ];

  /* ---------- Visitas a la web (estadística anónima) ----------
     unicos: un identificador anónimo por navegador; sesiones: nueva tras 30 min sin actividad. */
  var visitas = { mensual: {}, anual: {} };
  for (var v = 0; ; v++) {
    var p1 = Date.UTC(inicioFecha.getUTCFullYear(), inicioFecha.getUTCMonth() + v, 1) / MS;
    if (p1 > HOY) { break; }
    var fecha1 = new Date(p1 * MS);
    var diasMes = new Date(Date.UTC(fecha1.getUTCFullYear(), fecha1.getUTCMonth() + 1, 0)).getUTCDate();
    var diasContados = Math.min(diasMes, HOY - p1 + 1);
    var factor = diasContados / diasMes;
    var unicos = Math.round((temporadaAlta(p1) ? entre(380, 620) : entre(160, 340)) * factor);
    var sesiones = Math.round(unicos * (1.3 + azar() * 0.3));
    var clave = iso(p1).slice(0, 7);
    visitas.mensual[clave] = { unicos: unicos, sesiones: sesiones, paginas: Math.round(sesiones * (2.4 + azar())) };
    var anio = clave.slice(0, 4);
    var a = visitas.anual[anio] || (visitas.anual[anio] = { unicos: 0, sesiones: 0, paginas: 0 });
    a.unicos += Math.round(unicos * 0.82); // parte de los visitantes repite en varios meses
    a.sesiones += sesiones;
    a.paginas += visitas.mensual[clave].paginas;
  }

  window.DATOS_EJEMPLO = {
    negocio: {
      nombre: 'Casita de Tercera',
      lugar: 'Costamar, La Habana',
      horaCambio: '10:00',
      maxHuespedes: 6,
      precioPorBloque: { 2: 100, 3: 150 },   // USD por cada 24 h
      porcentajeDeposito: 50,                 // negociable en cada reserva
      horasCaducidadPendiente: 48             // provisional
    },
    tasasVigentes: { EUR: tasaEUR(HOY), CUP: tasaCUP(HOY) },
    clientes: clientes,
    reservas: reservas,
    bloqueos: bloqueos,
    movimientos: movimientos,
    visitas: visitas
  };
})();
