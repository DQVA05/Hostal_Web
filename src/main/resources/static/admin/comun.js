/* Casita de Tercera · Panel (maqueta) · código común a todas las páginas.
   - Fechas en hora de La Habana (copiado y ampliado de la web pública, reserva.js).
   - Dinero: formatos, monedas y tasas de cambio.
   - Cálculos de negocio: los MISMOS en todas las páginas para que las cifras coincidan.
   - Interfaz: tema claro/oscuro, menú "Más", diálogos de confirmación, avisos con
     "Deshacer" y estados de carga, vacío y error (?estado=carga|vacio|error).
   Nada se guarda: los cambios viven en memoria; localStorage solo guarda el tema. */
(function () {
  'use strict';

  /* ================= Fechas =================
     Cada día es un número entero (días desde el 1-1-1970), calculado con Date.UTC
     a partir de la fecha DE LA HABANA. Nunca se usa toISOString (pasa a UTC). */
  var MS = 86400000;
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
    'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

  var formatoHabana = (function () {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Havana', year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
      });
    } catch (e) {
      return null;
    }
  })();

  function numeroDeDia(anio, mes, dia) {
    return Date.UTC(anio, mes, dia) / MS;
  }

  /* Ahora en La Habana, en minutos (día × 1440 + hora × 60 + minuto). */
  function ahoraMinutos() {
    var ahora = new Date();
    if (formatoHabana && formatoHabana.formatToParts) {
      var p = {};
      formatoHabana.formatToParts(ahora).forEach(function (x) { p[x.type] = x.value; });
      return numeroDeDia(Number(p.year), Number(p.month) - 1, Number(p.day)) * 1440 +
        (Number(p.hour) % 24) * 60 + Number(p.minute);
    }
    return numeroDeDia(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()) * 1440 +
      ahora.getHours() * 60 + ahora.getMinutes();
  }

  function hoy() {
    return Math.floor(ahoraMinutos() / 1440);
  }

  function partes(n) {
    var f = new Date(n * MS);
    return { anio: f.getUTCFullYear(), mes: f.getUTCMonth(), dia: f.getUTCDate(), semana: f.getUTCDay() };
  }

  function diasDelMes(anio, mes) {
    return new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  }

  function sumarMeses(mes, cantidad) {
    var total = mes.anio * 12 + mes.mes + cantidad;
    return { anio: Math.floor(total / 12), mes: ((total % 12) + 12) % 12 };
  }

  function mismoDiaEnOtroMes(n, cantidad) {
    var p = partes(n);
    var destino = sumarMeses({ anio: p.anio, mes: p.mes }, cantidad);
    return numeroDeDia(destino.anio, destino.mes, Math.min(p.dia, diasDelMes(destino.anio, destino.mes)));
  }

  /* Lunes = 0 … domingo = 6. */
  function columna(n) {
    return (partes(n).semana + 6) % 7;
  }

  function dos(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function aISO(n) {
    var p = partes(n);
    return p.anio + '-' + dos(p.mes + 1) + '-' + dos(p.dia);
  }

  function deISO(texto) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto || '');
    return m ? numeroDeDia(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : NaN;
  }

  /* 'AAAA-MM-DDTHH:MM' (hora de La Habana) → minutos. */
  function deMomento(texto) {
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(texto || '');
    if (!m) { return NaN; }
    return numeroDeDia(Number(m[1]), Number(m[2]) - 1, Number(m[3])) * 1440 + Number(m[4]) * 60 + Number(m[5]);
  }

  function mayuscula(t) {
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  var fecha = {
    MESES: MESES,
    hoy: hoy,
    ahoraMinutos: ahoraMinutos,
    numeroDeDia: numeroDeDia,
    partes: partes,
    diasDelMes: diasDelMes,
    sumarMeses: sumarMeses,
    mismoDiaEnOtroMes: mismoDiaEnOtroMes,
    columna: columna,
    aISO: aISO,
    deISO: deISO,
    deMomento: deMomento,
    /* "lunes, 1 de diciembre de 2026" */
    larga: function (n) {
      var p = partes(n);
      return DIAS[p.semana] + ', ' + p.dia + ' de ' + MESES[p.mes] + ' de ' + p.anio;
    },
    /* "lunes 1 de diciembre" */
    media: function (n) {
      var p = partes(n);
      return DIAS[p.semana] + ' ' + p.dia + ' de ' + MESES[p.mes];
    },
    /* "lunes 1 de diciembre" (+ "de 2027" si no es el año actual) */
    mediaConAnio: function (n) {
      var p = partes(n);
      var texto = DIAS[p.semana] + ' ' + p.dia + ' de ' + MESES[p.mes];
      return p.anio === partes(hoy()).anio ? texto : texto + ' de ' + p.anio;
    },
    /* "lun 1 dic" (+ año si no es el actual) */
    corta: function (n) {
      var p = partes(n);
      var texto = DIAS_CORTOS[p.semana] + ' ' + p.dia + ' ' + MESES_CORTOS[p.mes];
      return p.anio === partes(hoy()).anio ? texto : texto + ' ' + p.anio;
    },
    /* "1 dic 2026" */
    numerica: function (n) {
      var p = partes(n);
      return p.dia + ' ' + MESES_CORTOS[p.mes] + ' ' + p.anio;
    },
    /* "Noviembre de 2026" */
    nombreMes: function (mes) {
      return mayuscula(MESES[mes.mes]) + ' de ' + mes.anio;
    },
    mesCorto: function (mes) {
      return mayuscula(MESES_CORTOS[mes.mes]);
    },
    /* "sábado 28 de noviembre, 16:30" */
    momento: function (minutos) {
      var dia = Math.floor(minutos / 1440);
      var resto = minutos - dia * 1440;
      return fecha.media(dia) + ', ' + dos(Math.floor(resto / 60)) + ':' + dos(resto % 60);
    },
    /* Ahora en La Habana como 'AAAA-MM-DDTHH:MM'. */
    ahoraISO: function () {
      var m = ahoraMinutos();
      var dia = Math.floor(m / 1440);
      var resto = m - dia * 1440;
      return aISO(dia) + 'T' + dos(Math.floor(resto / 60)) + ':' + dos(resto % 60);
    },
    claveMes: function (n) {
      return aISO(n).slice(0, 7);
    },
    mesDeClave: function (clave) {
      return { anio: Number(clave.slice(0, 4)), mes: Number(clave.slice(5, 7)) - 1 };
    },
    claveDeMes: function (mes) {
      return mes.anio + '-' + dos(mes.mes + 1);
    }
  };

  /* ================= Dinero ================= */
  var formatoEntero = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
  var formatoDecimal = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function r2(x) {
    return Math.round((x + Number.EPSILON) * 100) / 100;
  }

  function numero(x) {
    var v = r2(x);
    return Number.isInteger(v) ? formatoEntero.format(v) : formatoDecimal.format(v);
  }

  var dinero = {
    MONEDAS: ['USD', 'EUR', 'CUP'],
    r2: r2,
    numero: numero,
    /* "1250 USD" · "-35,50 USD" */
    usd: function (x) {
      return numero(x) + ' USD';
    },
    monto: function (cantidad, moneda) {
      return numero(cantidad) + ' ' + moneda;
    },
    /* USD → 1; EUR → tasa = USD por 1 EUR; CUP → tasa = CUP por 1 USD. */
    aUSD: function (cantidad, moneda, tasa) {
      if (moneda === 'USD') { return r2(cantidad); }
      if (!tasa) { return 0; }
      return moneda === 'EUR' ? r2(cantidad * tasa) : r2(cantidad / tasa);
    },
    deUSD: function (usd, moneda, tasa) {
      if (moneda === 'USD') { return r2(usd); }
      if (!tasa) { return 0; }
      return moneda === 'EUR' ? r2(usd / tasa) : Math.round(usd * tasa);
    },
    /* "1 EUR = 1,08 USD" · "1 USD = 420 CUP" */
    textoTasa: function (moneda, tasa) {
      if (moneda === 'EUR') { return '1 EUR = ' + numero(tasa) + ' USD'; }
      if (moneda === 'CUP') { return '1 USD = ' + numero(tasa) + ' CUP'; }
      return '';
    },
    preguntaTasa: function (moneda) {
      return moneda === 'EUR' ? '¿Cuántos dólares (USD) vale 1 euro?' : '¿Cuántos pesos (CUP) vale 1 dólar?';
    },
    /* Acepta "12,50", "12.50", "1.250,50" o "1250". Devuelve NaN si no es un número. */
    leer: function (texto) {
      var t = String(texto || '').replace(/\s/g, '');
      if (!t) { return NaN; }
      var coma = t.lastIndexOf(',');
      var punto = t.lastIndexOf('.');
      if (coma > -1 && punto > -1) {
        t = coma > punto ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
      } else if (coma > -1) {
        t = t.replace(',', '.');
      }
      return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
    }
  };

  /* ================= Catálogos ================= */
  var catalogo = {
    TIPOS: {
      ingreso: { nombre: 'Ingreso', icono: 'ingreso' },
      gasto: { nombre: 'Gasto', icono: 'gasto' },
      perdida: { nombre: 'Pérdida', icono: 'alerta' },
      propina: { nombre: 'Propina', icono: 'propina' }
    },
    CATEGORIAS_INGRESO: [
      ['alquiler', 'Alquiler (servicio general)'],
      ['gastronomia', 'Gastronomía'],
      ['transporte', 'Transporte'],
      ['pasadia', 'Pasadía'],
      ['otro', 'Otro ingreso']
    ],
    CATEGORIAS_GASTO: [
      ['compras', 'Compras'],
      ['mantenimiento', 'Mantenimiento'],
      ['electricidad-agua', 'Electricidad y agua'],
      ['salarios', 'Salarios'],
      ['roturas-danos', 'Roturas y daños'],
      ['otro', 'Otro gasto']
    ],
    ESTADOS: {
      pendiente: { nombre: 'Pendiente', icono: 'reloj' },
      confirmada: { nombre: 'Confirmada', icono: 'check' },
      completada: { nombre: 'Completada', icono: 'bandera' },
      cancelada: { nombre: 'Cancelada', icono: 'cancelar' }
    },
    MOTIVOS: { mantenimiento: 'Mantenimiento', 'uso-propio': 'Uso propio', otro: 'Otro motivo' },
    ORIGENES: { web: 'Página web', telefono: 'Teléfono', whatsapp: 'WhatsApp' },
    CONCEPTOS: { deposito: 'Depósito', resto: 'Resto del pago', pago: 'Pago' },
    categoriasDe: function (tipo) {
      if (tipo === 'ingreso') { return catalogo.CATEGORIAS_INGRESO; }
      if (tipo === 'propina') { return [['propina', 'Propina']]; }
      return catalogo.CATEGORIAS_GASTO;
    },
    nombreCategoria: function (tipo, clave) {
      var lista = catalogo.categoriasDe(tipo);
      for (var i = 0; i < lista.length; i++) {
        if (lista[i][0] === clave) { return lista[i][1]; }
      }
      return clave;
    }
  };

  /* ================= Cálculos de negocio =================
     Todas las páginas usan estas funciones; así las cifras coinciden siempre. */
  var calc = {
    cliente: function (datos, id) {
      for (var i = 0; i < datos.clientes.length; i++) {
        if (datos.clientes[i].id === id) { return datos.clientes[i]; }
      }
      return null;
    },
    reserva: function (datos, id) {
      for (var i = 0; i < datos.reservas.length; i++) {
        if (datos.reservas[i].id === id) { return datos.reservas[i]; }
      }
      return null;
    },
    nombreCliente: function (datos, id) {
      var c = calc.cliente(datos, id);
      return c ? c.nombre : 'Cliente sin ficha';
    },
    bloques: function (r) {
      return deISO(r.salida) - deISO(r.entrada);
    },
    total: function (r) {
      return r2(r.precioPorBloque * calc.bloques(r));
    },
    pagado: function (r) {
      return r2(r.pagos.reduce(function (s, p) { return s + dinero.aUSD(p.monto, p.moneda, p.tasa); }, 0));
    },
    saldo: function (r) {
      var s = r2(calc.total(r) - calc.pagado(r));
      return Math.abs(s) < 0.05 ? 0 : s; // céntimos de redondeo al convertir monedas
    },
    /* Vencimiento provisional de una reserva pendiente (minutos, hora de La Habana). */
    vence: function (datos, r) {
      return deMomento(r.creada) + datos.negocio.horasCaducidadPendiente * 60;
    },
    vencida: function (datos, r) {
      return r.estado === 'pendiente' && ahoraMinutos() > calc.vence(datos, r);
    },
    /* Día → { estado: 'pendiente' | 'reservado', reserva }. Una reserva ocupa de la
       entrada al día anterior a la salida. Las canceladas no ocupan. */
    ocupacion: function (datos) {
      var mapa = new Map();
      datos.reservas.forEach(function (r) {
        if (r.estado === 'cancelada') { return; }
        var desde = deISO(r.entrada);
        var hasta = deISO(r.salida);
        for (var d = desde; d < hasta; d++) {
          mapa.set(d, { estado: r.estado === 'pendiente' ? 'pendiente' : 'reservado', reserva: r });
        }
      });
      return mapa;
    },
    desactivados: function (datos) {
      var mapa = new Map();
      datos.bloqueos.forEach(function (b) { mapa.set(deISO(b.fecha), b); });
      return mapa;
    },
    estadoDia: function (n, ocupacion, desactivados) {
      var o = ocupacion.get(n);
      if (o) { return o.estado; }
      return desactivados.has(n) ? 'desactivado' : 'disponible';
    },
    /* Días entre [desde, hasta) que impiden una reserva nueva. */
    conflictos: function (datos, desde, hasta, ignorarId) {
      var ocup = new Map();
      datos.reservas.forEach(function (r) {
        if (r.estado === 'cancelada' || r.id === ignorarId) { return; }
        for (var d = deISO(r.entrada); d < deISO(r.salida); d++) { ocup.set(d, r); }
      });
      var bloq = calc.desactivados(datos);
      var lista = [];
      for (var d = desde; d < hasta; d++) {
        if (ocup.has(d)) {
          var r = ocup.get(d);
          lista.push({ dia: d, motivo: (r.estado === 'pendiente' ? 'pendiente' : 'reservado'), reserva: r });
        } else if (bloq.has(d)) {
          lista.push({ dia: d, motivo: 'desactivado' });
        }
      }
      return lista;
    },
    /* Cuenta días por estado en [desde, hasta]. Ocupación = reservados ÷ (total − desactivados). */
    resumenDias: function (datos, desde, hasta) {
      var ocup = calc.ocupacion(datos);
      var bloq = calc.desactivados(datos);
      var res = { total: 0, disponibles: 0, pendientes: 0, reservados: 0, desactivados: 0, pasadosLibres: 0 };
      var diaHoy = hoy();
      for (var d = desde; d <= hasta; d++) {
        res.total += 1;
        var e = calc.estadoDia(d, ocup, bloq);
        if (e === 'reservado') { res.reservados += 1; }
        else if (e === 'pendiente') { res.pendientes += 1; }
        else if (e === 'desactivado') { res.desactivados += 1; }
        else if (d < diaHoy) { res.pasadosLibres += 1; }
        else { res.disponibles += 1; }
      }
      var base = res.total - res.desactivados;
      res.ocupacion = base > 0 ? res.reservados / base : 0;
      return res;
    },
    /* Libro de dinero completo: lo anotado a mano + los cobros de alquiler que salen de las reservas. */
    movimientos: function (datos) {
      var lista = datos.movimientos.map(function (m) {
        var copia = Object.assign({}, m);
        copia.usd = dinero.aUSD(m.monto, m.moneda, m.tasa);
        copia.derivado = false;
        return copia;
      });
      datos.reservas.forEach(function (r) {
        r.pagos.forEach(function (p, i) {
          lista.push({
            id: 'P-' + r.id + '-' + (i + 1),
            fecha: p.fecha,
            tipo: 'ingreso',
            categoria: 'alquiler',
            monto: p.monto,
            moneda: p.moneda,
            tasa: p.tasa,
            usd: dinero.aUSD(p.monto, p.moneda, p.tasa),
            nota: (catalogo.CONCEPTOS[p.concepto] || 'Pago') + ' de la reserva ' + r.id + ' (' +
              calc.nombreCliente(datos, r.clienteId) + ')',
            reservaId: r.id,
            derivado: true
          });
        });
      });
      lista.sort(function (a, b) {
        if (a.fecha !== b.fecha) { return a.fecha < b.fecha ? 1 : -1; }
        return a.id < b.id ? 1 : -1;
      });
      return lista;
    },
    /* Movimientos con fecha entre desde y hasta (números de día, ambos incluidos). */
    enPeriodo: function (lista, desde, hasta) {
      var a = aISO(desde);
      var b = aISO(hasta);
      return lista.filter(function (m) { return m.fecha >= a && m.fecha <= b; });
    },
    totales: function (lista) {
      var t = {
        alquiler: 0,
        extras: { gastronomia: 0, transporte: 0, pasadia: 0, otro: 0 },
        totalExtras: 0,
        propinas: 0,
        ingresos: 0,      // alquiler + extras + propinas
        gastos: 0,
        perdidas: 0,
        salidas: 0,       // gastos + pérdidas
        neto: 0
      };
      lista.forEach(function (m) {
        if (m.tipo === 'ingreso') {
          if (m.categoria === 'alquiler') { t.alquiler += m.usd; }
          else { t.extras[m.categoria] = (t.extras[m.categoria] || 0) + m.usd; }
        } else if (m.tipo === 'propina') {
          t.propinas += m.usd;
        } else if (m.tipo === 'gasto') {
          t.gastos += m.usd;
        } else if (m.tipo === 'perdida') {
          t.perdidas += m.usd;
        }
      });
      Object.keys(t.extras).forEach(function (k) {
        t.extras[k] = r2(t.extras[k]);
        t.totalExtras += t.extras[k];
      });
      t.alquiler = r2(t.alquiler);
      t.totalExtras = r2(t.totalExtras);
      t.propinas = r2(t.propinas);
      t.gastos = r2(t.gastos);
      t.perdidas = r2(t.perdidas);
      t.ingresos = r2(t.alquiler + t.totalExtras + t.propinas);
      t.salidas = r2(t.gastos + t.perdidas);
      t.neto = r2(t.ingresos - t.salidas);
      return t;
    },
    /* Mes en curso hasta hoy: lo que muestran Inicio, Dinero e Informe. */
    periodoMes: function (mes) {
      var desde = numeroDeDia(mes.anio, mes.mes, 1);
      var hasta = desde + diasDelMes(mes.anio, mes.mes) - 1;
      return { desde: desde, hasta: hasta };
    },
    /* Precio por bloque según habitaciones (datos.negocio). */
    precio: function (datos, habitaciones) {
      return datos.negocio.precioPorBloque[habitaciones] || 0;
    },
    siguienteId: function (lista, prefijo) {
      var max = 0;
      lista.forEach(function (x) {
        var n = parseInt(String(x.id).replace(/\D/g, ''), 10);
        if (n > max) { max = n; }
      });
      return prefijo + ('000' + (max + 1)).slice(-4);
    }
  };

  /* ================= Utilidades de interfaz ================= */
  function anadir(el, hijos) {
    if (hijos === null || hijos === undefined || hijos === false) { return; }
    (Array.isArray(hijos) ? hijos : [hijos]).forEach(function (c) {
      if (c === null || c === undefined || c === false) { return; }
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
  }

  /* h('p', { class: 'x', text: 'hola' }, [hijos]) — siempre con textContent, nunca innerHTML. */
  function h(etiqueta, props, hijos) {
    var el = document.createElement(etiqueta);
    Object.keys(props || {}).forEach(function (k) {
      var v = props[k];
      if (v === null || v === undefined || v === false) { return; }
      if (k === 'class') { el.className = v; }
      else if (k === 'text') { el.textContent = v; }
      else if (k.indexOf('on') === 0 && typeof v === 'function') { el.addEventListener(k.slice(2), v); }
      else if (k === 'dataset') { Object.keys(v).forEach(function (d) { el.dataset[d] = v[d]; }); }
      else if (v === true) { el.setAttribute(k, ''); }
      else { el.setAttribute(k, String(v)); }
    });
    anadir(el, hijos);
    return el;
  }

  function icono(nombre, clase) {
    return h('span', { class: 'icono i-' + nombre + (clase ? ' ' + clase : ''), 'aria-hidden': 'true' });
  }

  /* Botón con icono + palabra (nunca solo icono). */
  function boton(texto, nombreIcono, clase, alPulsar, extra) {
    var props = Object.assign({ type: 'button', class: 'boton ' + (clase || 'boton-secundario') }, extra || {});
    var b = h('button', props, [nombreIcono ? icono(nombreIcono) : null, h('span', { text: texto })]);
    if (alPulsar) { b.addEventListener('click', alPulsar); }
    return b;
  }

  function enlaceBoton(texto, nombreIcono, href, clase) {
    return h('a', { class: 'boton ' + (clase || 'boton-secundario'), href: href },
      [nombreIcono ? icono(nombreIcono) : null, h('span', { text: texto })]);
  }

  function vaciar(el) {
    while (el.firstChild) { el.removeChild(el.firstChild); }
    return el;
  }

  function normalizar(texto) {
    return String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }

  function soloDigitos(texto) {
    return String(texto || '').replace(/\D/g, '');
  }

  function insignia(clase, nombreIcono, texto) {
    return h('span', { class: 'insignia insignia-' + clase }, [icono(nombreIcono), h('span', { text: texto })]);
  }

  function insigniaEstado(estado) {
    var e = catalogo.ESTADOS[estado];
    return insignia(estado, e.icono, e.nombre);
  }

  function insigniaTipo(tipo) {
    var t = catalogo.TIPOS[tipo];
    return insignia(tipo, t.icono, t.nombre);
  }

  /* Estado vacío: qué pasa y qué hacer a continuación. */
  function vacio(nombreIcono, titulo, siguiente, accion) {
    return h('div', { class: 'vacio' }, [
      icono(nombreIcono),
      h('p', { class: 'item-titulo', text: titulo }),
      siguiente ? h('p', { class: 'texto-suave', text: siguiente }) : null,
      accion || null
    ]);
  }

  /* Escribe (o borra) el error de un campo y marca aria-invalid. */
  function errorCampo(campo, nodoError, texto) {
    nodoError.textContent = texto || '';
    if (texto) {
      campo.setAttribute('aria-invalid', 'true');
    } else {
      campo.removeAttribute('aria-invalid');
    }
  }

  function parametro(nombre) {
    try {
      return new URLSearchParams(window.location.search).get(nombre);
    } catch (e) {
      return null;
    }
  }

  function descargar(nombreArchivo, contenido, tipo) {
    var blob = new Blob([contenido], { type: tipo || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = h('a', { href: url, download: nombreArchivo, hidden: true });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }

  /* ---------- Diálogos ---------- */
  function abrirDialogo(dialogo) {
    dialogo._volverA = document.activeElement;
    if (typeof dialogo.showModal === 'function') {
      dialogo.showModal();
    } else {
      dialogo.setAttribute('open', '');
    }
  }

  function cerrarDialogo(dialogo) {
    // Si el aviso estaba dentro de este diálogo, vuelve a la página para que se siga viendo.
    if (region && dialogo.contains(region)) { document.body.appendChild(region); }
    if (typeof dialogo.close === 'function') {
      dialogo.close();
    } else {
      dialogo.removeAttribute('open');
    }
    var volver = dialogo._volverA;
    if (volver && document.contains(volver) && typeof volver.focus === 'function') {
      volver.focus();
    }
  }

  /* Diálogo de confirmación. Devuelve una promesa: true si confirma, false si vuelve.
     opciones: titulo, texto (texto o nodo), aceptar, icono, peligro, contenido (nodo extra),
     validar() → texto de error o '' (para pedir datos dentro del diálogo, p. ej. un motivo). */
  var contadorDialogos = 0;
  function confirmar(opciones) {
    return new Promise(function (resolver) {
      contadorDialogos += 1;
      var idTitulo = 'confirmar-titulo-' + contadorDialogos;
      var idTexto = 'confirmar-texto-' + contadorDialogos;
      var error = h('p', { class: 'error-campo', role: 'alert' });
      var volver = boton(opciones.volver || 'Volver sin cambiar nada', 'anterior', 'boton-secundario');
      var aceptar = boton(opciones.aceptar || 'Sí, continuar', opciones.icono || 'check',
        opciones.peligro ? 'boton-peligro-lleno' : 'boton-principal');
      var dialogo = h('dialog', { class: 'dialogo', 'aria-labelledby': idTitulo, 'aria-describedby': idTexto }, [
        h('div', { class: 'dialogo-cabecera' }, h('h2', { id: idTitulo, text: opciones.titulo })),
        h('div', { class: 'dialogo-cuerpo pila' }, [
          typeof opciones.texto === 'string' ? h('p', { id: idTexto, text: opciones.texto })
            : h('div', { id: idTexto }, opciones.texto),
          opciones.contenido || null,
          error
        ]),
        h('div', { class: 'dialogo-pie' }, [volver, aceptar])
      ]);
      var resuelto = false;
      function terminar(valor) {
        if (resuelto) { return; }
        resuelto = true;
        cerrarDialogo(dialogo);
        dialogo.remove();
        resolver(valor);
      }
      volver.addEventListener('click', function () { terminar(false); });
      aceptar.addEventListener('click', function () {
        var problema = opciones.validar ? opciones.validar() : '';
        error.textContent = problema || '';
        if (!problema) { terminar(true); }
      });
      dialogo.addEventListener('cancel', function (e) { e.preventDefault(); terminar(false); });
      document.body.appendChild(dialogo);
      abrirDialogo(dialogo);
      // Lo destructivo nunca queda enfocado por defecto.
      (opciones.peligro ? volver : aceptar).focus();
    });
  }

  /* ---------- Aviso emergente con "Deshacer" ---------- */
  var region = null;
  var temporizador = null;
  function aviso(texto, opciones) {
    opciones = opciones || {};
    if (!region) { return; }
    clearTimeout(temporizador);
    // Si el foco estaba en el aviso anterior (p. ej. en "Deshacer"), pasa al nuevo para no perderse.
    var teniaFoco = region.contains(document.activeElement);
    vaciar(region);
    // Con un diálogo modal abierto, el resto de la página no se puede tocar:
    // el aviso se coloca dentro del diálogo para que "Deshacer" funcione.
    var abiertos = document.querySelectorAll('dialog[open]');
    var contenedor = abiertos.length ? abiertos[abiertos.length - 1] : document.body;
    if (region.parentNode !== contenedor) { contenedor.appendChild(region); }
    var caja = h('div', { class: 'aviso' }, [
      h('p', { class: 'aviso-texto' }, [icono(opciones.icono || 'check'), h('span', { text: texto })])
    ]);
    if (opciones.deshacer) {
      caja.appendChild(boton('Deshacer', 'deshacer', 'boton-secundario', function () {
        // Si deshacer() devuelve false, ya mostró su propio aviso (no se pudo deshacer).
        if (opciones.deshacer() !== false) {
          aviso('Listo: se deshizo el cambio.', { icono: 'deshacer' });
        }
      }));
    }
    var cerrarAviso = boton('Cerrar', 'cerrar', 'boton-secundario aviso-cerrar', function () {
      vaciar(region);
    });
    caja.appendChild(cerrarAviso);
    region.appendChild(caja);
    if (teniaFoco) { cerrarAviso.focus(); }
    // Se queda 10 s (más si se está usando) y se pausa mientras tiene el foco o el ratón encima.
    function programar() {
      clearTimeout(temporizador);
      temporizador = setTimeout(function () {
        if (!caja.contains(document.activeElement) && !caja.matches(':hover')) { vaciar(region); }
        else { programar(); }
      }, opciones.deshacer ? 12000 : 8000);
    }
    programar();
  }

  /* ---------- Tema, menú "Más" ---------- */
  var raiz = document.documentElement;

  function temaActual() {
    var elegido = raiz.getAttribute('data-tema');
    if (elegido === 'claro' || elegido === 'oscuro') { return elegido; }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
  }

  function prepararTema() {
    document.querySelectorAll('[data-boton-tema]').forEach(function (b) {
      b.addEventListener('click', function () {
        var nuevo = temaActual() === 'oscuro' ? 'claro' : 'oscuro';
        raiz.setAttribute('data-tema', nuevo);
        try { window.localStorage.setItem('tema', nuevo); } catch (e) { /* sin almacenamiento */ }
      });
    });
  }

  function prepararMenuMas() {
    var boton = document.querySelector('[data-menu-mas]');
    var menu = document.getElementById('menu-mas');
    if (!boton || !menu) { return; }
    function abrir(valor) {
      boton.setAttribute('aria-expanded', valor ? 'true' : 'false');
      menu.hidden = !valor;
    }
    boton.addEventListener('click', function () {
      var abierto = boton.getAttribute('aria-expanded') === 'true';
      abrir(!abierto);
      if (!abierto) {
        var primero = menu.querySelector('a');
        if (primero) { primero.focus(); }
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && boton.getAttribute('aria-expanded') === 'true') {
        abrir(false);
        boton.focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (boton.getAttribute('aria-expanded') === 'true' && !menu.contains(e.target) && !boton.contains(e.target)) {
        abrir(false);
      }
    });
    menu.addEventListener('focusout', function (e) {
      if (e.relatedTarget && !menu.contains(e.relatedTarget) && e.relatedTarget !== boton) { abrir(false); }
    });
    if (menu.querySelector('[aria-current="page"]')) {
      boton.classList.add('contiene-actual');
    }
  }

  /* ---------- Carga de datos ----------
     Hoy lee window.DATOS_EJEMPLO; mañana hará fetch a la API con la misma forma.
     ?estado=carga  → se queda cargando (para ver el esqueleto)
     ?estado=vacio  → datos sin registros (para ver los estados vacíos)
     ?estado=error  → falla (para ver el mensaje de error y "Reintentar") */
  function cargarDatos() {
    var estado = parametro('estado');
    return new Promise(function (resolver, rechazar) {
      if (estado === 'carga') { return; }
      setTimeout(function () {
        if (estado === 'error' || !window.DATOS_EJEMPLO) {
          rechazar(new Error('Sin datos'));
          return;
        }
        var copia = JSON.parse(JSON.stringify(window.DATOS_EJEMPLO));
        if (estado === 'vacio') {
          copia.clientes = [];
          copia.reservas = [];
          copia.bloqueos = [];
          copia.movimientos = [];
          copia.visitas = { mensual: {}, anual: {} };
        }
        resolver(copia);
      }, 250);
    });
  }

  function iniciar(alCargar) {
    prepararTema();
    prepararMenuMas();
    region = h('div', { id: 'avisos', class: 'avisos', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(region);

    var listo = document.querySelector('[data-listo]');
    if (!listo || !alCargar) { return; }
    var carga = h('div', { class: 'estado-carga', role: 'status' }, [
      h('p', { class: 'texto-suave', text: 'Cargando datos…' }),
      h('div', { class: 'esqueleto' }),
      h('div', { class: 'esqueleto esqueleto-alto' }),
      h('div', { class: 'esqueleto' })
    ]);
    listo.hidden = true;
    listo.parentNode.insertBefore(carga, listo);

    function mostrarError() {
      listo.hidden = true;
      var reintentar = boton('Reintentar', 'recargar', 'boton-principal', function () {
        // Vuelve a cargar la página sin el parámetro de prueba.
        var url = new URL(window.location.href);
        url.searchParams.delete('estado');
        window.location.href = url.toString();
      });
      listo.parentNode.insertBefore(h('div', { class: 'pila', role: 'alert' }, [
        h('div', { class: 'nota nota-error' }, [
          icono('alerta'),
          h('div', null, [
            h('p', { class: 'item-titulo', text: 'No se pudieron cargar los datos.' }),
            h('p', { text: 'Compruebe la conexión a internet y pulse «Reintentar».' })
          ])
        ]),
        reintentar
      ]), listo);
    }

    cargarDatos().then(function (datos) {
      carga.remove();
      listo.hidden = false;
      try {
        alCargar(datos);
      } catch (error) {
        // Un fallo al pintar no deja la página a medias: se ve el mensaje de error.
        if (window.console) { window.console.error(error); }
        mostrarError();
      }
    }, function () {
      carga.remove();
      mostrarError();
    });
  }

  window.Admin = {
    fecha: fecha,
    dinero: dinero,
    catalogo: catalogo,
    calc: calc,
    h: h,
    icono: icono,
    boton: boton,
    enlaceBoton: enlaceBoton,
    vaciar: vaciar,
    normalizar: normalizar,
    soloDigitos: soloDigitos,
    insignia: insignia,
    insigniaEstado: insigniaEstado,
    insigniaTipo: insigniaTipo,
    vacio: vacio,
    errorCampo: errorCampo,
    parametro: parametro,
    descargar: descargar,
    abrirDialogo: abrirDialogo,
    cerrarDialogo: cerrarDialogo,
    confirmar: confirmar,
    aviso: aviso,
    cargarDatos: cargarDatos,
    iniciar: iniciar,
    enlaceReserva: function (id) { return 'reservas.html?id=' + encodeURIComponent(id); }
  };
})();
