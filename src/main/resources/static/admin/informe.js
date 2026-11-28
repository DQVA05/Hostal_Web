/* Casita de Tercera · Panel (maqueta) · Informe.
   Periodo: un mes (por defecto) o un año. Gráficos SVG propios (sin librerías),
   accesibles: <title>, <desc> y botón "Ver como tabla".
   "Exportar PDF": hoja de impresión (@media print en admin.css) + window.print().
   "Descargar CSV": movimientos del periodo.
   TODO backend: GET /api/informe?mes=AAAA-MM | ?anio=AAAA y GET /api/visitas. */
(function () {
  'use strict';

  var A = window.Admin;
  var F = A.fecha;
  var D = A.dinero;
  var h = A.h;
  var NS = 'http://www.w3.org/2000/svg';
  var contador = 0;

  /* Elemento SVG con atributos. */
  function s(etiqueta, attrs, hijos) {
    var el = document.createElementNS(NS, etiqueta);
    Object.keys(attrs || {}).forEach(function (k) {
      if (attrs[k] !== null && attrs[k] !== undefined) { el.setAttribute(k, String(attrs[k])); }
    });
    (hijos || []).forEach(function (c) {
      if (c) { el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }
    });
    return el;
  }

  function texto(x, y, contenido, attrs) {
    return s('text', Object.assign({ x: x, y: y }, attrs || {}), [contenido]);
  }

  /* Máximo "redondo" para el eje (p. ej. 1340 → 1500). */
  function techo(valor) {
    if (valor <= 0) { return 10; }
    var potencia = Math.pow(10, Math.floor(Math.log10(valor)));
    var pasos = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    for (var i = 0; i < pasos.length; i++) {
      if (pasos[i] * potencia >= valor) { return pasos[i] * potencia; }
    }
    return 10 * potencia;
  }

  var formatoEje = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });
  function corto(valor) {
    var a = Math.abs(valor);
    var t = a >= 1000 ? formatoEje.format(a / 1000) + ' mil' : formatoEje.format(Math.round(a));
    return (valor < 0 ? '−' : '') + t;
  }

  /* Ancho real disponible para el gráfico: se dibuja a escala 1 (texto de 13 px de verdad). */
  function anchoDe(contenedor) {
    return Math.max(260, Math.min(640, (contenedor.clientWidth || 320) - 34));
  }

  /* Contenedor de gráfico: SVG accesible + leyenda + "Ver como tabla". */
  function grafico(contenedor, opciones) {
    contador += 1;
    var id = 'grafico-' + contador;
    var svg = s('svg', {
      viewBox: '0 0 ' + opciones.ancho + ' ' + opciones.alto,
      role: 'img',
      'aria-labelledby': id + '-titulo ' + id + '-desc',
      focusable: 'false'
    }, [
      s('title', { id: id + '-titulo' }, [opciones.titulo]),
      s('desc', { id: id + '-desc' }, [opciones.descripcion])
    ]);
    opciones.dibujar(svg);

    var tabla = h('table', { class: 'tabla-datos' }, [
      h('caption', { text: opciones.titulo }),
      h('thead', null, h('tr', null, opciones.columnas.map(function (c) { return h('th', { scope: 'col', text: c }); }))),
      h('tbody', null, opciones.filas.map(function (f) {
        return h('tr', null, f.map(function (celda, i) {
          return i === 0 ? h('th', { scope: 'row', text: celda }) : h('td', { text: celda });
        }));
      }))
    ]);
    var envoltorio = h('div', { class: 'tabla-envoltorio', id: id + '-tabla', hidden: true }, tabla);
    var alternar = A.boton('Ver como tabla', 'tabla', 'boton-secundario no-imprimir', null, {
      'aria-expanded': 'false', 'aria-controls': id + '-tabla'
    });
    alternar.addEventListener('click', function () {
      var abrir = envoltorio.hidden;
      envoltorio.hidden = !abrir;
      alternar.setAttribute('aria-expanded', abrir ? 'true' : 'false');
      alternar.querySelector('span:last-child').textContent = abrir ? 'Ocultar la tabla' : 'Ver como tabla';
    });

    A.vaciar(contenedor).appendChild(h('div', { class: 'tarjeta grafico' }, [
      svg,
      opciones.leyenda || null,
      h('div', { class: 'seccion-cabecera', style: 'margin-top: 0.75rem' }, alternar),
      envoltorio
    ]));
  }

  A.iniciar(function (datos) {
    var $ = function (id) { return document.getElementById(id); };
    var el = {
      mes: $('elegir-mes'),
      anio: $('elegir-anio'),
      campoMes: $('campo-mes'),
      campoAnio: $('campo-anio'),
      cifrasTitulo: $('cifras-titulo'),
      cifras: $('cifras'),
      mesesAyuda: $('meses-ayuda'),
      graficoMeses: $('grafico-meses'),
      lineaTitulo: $('linea-titulo'),
      lineaAyuda: $('linea-ayuda'),
      graficoLinea: $('grafico-linea'),
      graficoFuentes: $('grafico-fuentes'),
      mejores: $('mejores'),
      mejoresAyuda: $('mejores-ayuda'),
      visitas: $('visitas'),
      cierre: $('cierre'),
      impresionPeriodo: $('impresion-periodo'),
      impresionFecha: $('impresion-fecha'),
      pdf: $('exportar-pdf'),
      csv: $('descargar-csv')
    };

    var diaHoy = F.hoy();
    var todos = A.calc.movimientos(datos);

    /* ---------- Selector de periodo ---------- */
    var claves = new Set([F.claveMes(diaHoy)]);
    todos.forEach(function (m) { claves.add(m.fecha.slice(0, 7)); });
    var meses = Array.from(claves).sort().reverse();
    var anios = Array.from(new Set(meses.map(function (c) { return c.slice(0, 4); }))).sort().reverse();
    meses.forEach(function (c) { el.mes.appendChild(h('option', { value: c, text: F.nombreMes(F.mesDeClave(c)) })); });
    anios.forEach(function (a) { el.anio.appendChild(h('option', { value: a, text: a })); });

    var paramMes = A.parametro('mes');
    var paramAnio = A.parametro('anio');
    if (paramMes && meses.indexOf(paramMes) > -1) { el.mes.value = paramMes; }
    if (paramAnio && anios.indexOf(paramAnio) > -1) {
      el.anio.value = paramAnio;
      document.querySelector('input[name="periodo"][value="anio"]').checked = true;
    }

    function modo() {
      return document.querySelector('input[name="periodo"]:checked').value;
    }

    /* Periodo elegido: días, nombre y meses que abarca. */
    function periodo() {
      if (modo() === 'anio') {
        var anio = Number(el.anio.value);
        var lista = [];
        for (var m = 0; m < 12; m++) {
          var clave = anio + '-' + (m < 9 ? '0' : '') + (m + 1);
          if (clave <= F.claveMes(diaHoy)) { lista.push(F.mesDeClave(clave)); }
        }
        return {
          tipo: 'anio',
          nombre: 'año ' + anio,
          nombreLargo: 'Año ' + anio,
          desde: F.numeroDeDia(anio, 0, 1),
          hasta: F.numeroDeDia(anio, 11, 31),
          meses: lista,
          mesesGrafico: lista,
          clave: String(anio)
        };
      }
      var mes = F.mesDeClave(el.mes.value);
      var p = A.calc.periodoMes(mes);
      var ultimos = [];
      for (var i = 11; i >= 0; i--) { ultimos.push(F.sumarMeses(mes, -i)); }
      var seis = ultimos.slice(6);
      return {
        tipo: 'mes',
        nombre: F.nombreMes(mes).toLowerCase(),
        nombreLargo: F.nombreMes(mes),
        desde: p.desde,
        hasta: p.hasta,
        meses: ultimos,
        mesesGrafico: seis,
        mes: mes,
        clave: el.mes.value
      };
    }

    function totalesMes(mes) {
      var p = A.calc.periodoMes(mes);
      return A.calc.totales(A.calc.enPeriodo(todos, p.desde, p.hasta));
    }

    /* ---------- Cifras ---------- */
    function cifra(etiqueta, valor, nota, clase) {
      return h('div', { class: 'cifra' + (clase ? ' ' + clase : '') }, [
        h('span', { class: 'cifra-etiqueta', text: etiqueta }),
        h('span', { class: 'cifra-valor', text: valor }),
        nota ? h('span', { class: 'cifra-nota', text: nota }) : null
      ]);
    }

    function pintarCifras(per, t) {
      el.cifrasTitulo.textContent = per.tipo === 'mes' ? 'Cifras de ' + per.nombre : 'Cifras del ' + per.nombre;
      var desdeISO = F.aISO(per.desde);
      var hastaISO = F.aISO(per.hasta);
      var delPeriodo = datos.reservas.filter(function (r) { return r.entrada >= desdeISO && r.entrada <= hastaISO; });
      var validas = delPeriodo.filter(function (r) { return r.estado !== 'cancelada'; });
      var canceladas = delPeriodo.length - validas.length;
      var clientes = new Set(validas.map(function (r) { return r.clienteId; })).size;
      var dias = A.calc.resumenDias(datos, per.desde, per.hasta);
      // Días transcurridos para la media diaria (el periodo en curso solo cuenta hasta hoy).
      var transcurridos = Math.max(0, Math.min(per.hasta, diaHoy) - per.desde + 1);
      var media = transcurridos ? t.neto / transcurridos : 0;

      A.vaciar(el.cifras);
      [
        cifra('Entró', D.usd(t.ingresos), 'Alquiler, extras y propinas'),
        cifra('Salió', D.usd(t.salidas), 'Gastos y pérdidas'),
        cifra(t.neto >= 0 ? 'Ganancia neta' : 'Pérdida neta', D.usd(Math.abs(t.neto)), 'Lo que entró menos lo que salió',
          t.neto >= 0 ? 'positivo' : 'negativo'),
        cifra('Ganancia media por día', D.usd(D.r2(media)),
          transcurridos ? 'Ganancia neta ÷ ' + transcurridos + ' días' : 'El periodo aún no empezó'),
        cifra('Ocupación', Math.round(dias.ocupacion * 100) + ' %',
          dias.reservados + ' días reservados de ' + (dias.total - dias.desactivados) +
          (dias.desactivados ? ' (sin contar ' + dias.desactivados +
            (dias.desactivados === 1 ? ' desactivado)' : ' desactivados)') : '')),
        cifra('Reservas', String(validas.length), canceladas ? 'Con entrada en el periodo. Además, ' + canceladas +
          (canceladas === 1 ? ' cancelada' : ' canceladas') : 'Con entrada en el periodo'),
        cifra('Clientes', String(clientes), 'Grupos distintos con entrada en el periodo')
      ].forEach(function (c) { el.cifras.appendChild(c); });
    }

    /* ---------- Gráfico 1: barras por mes ---------- */
    function pintarMeses(per) {
      var serie = per.mesesGrafico.map(function (m) {
        var t = totalesMes(m);
        return { mes: m, entro: t.ingresos, salio: t.salidas, neto: t.neto };
      });
      el.mesesAyuda.textContent = (per.tipo === 'mes' ? 'Los últimos 6 meses hasta ' + per.nombre + '. ' : 'Cada mes del ' + per.nombre + '. ') +
        'Barra lisa: lo que entró. Barra rayada: gastos y pérdidas.';
      var maximo = techo(Math.max.apply(null, serie.map(function (x) { return Math.max(x.entro, x.salio); }).concat([0])));
      var W = anchoDe(el.graficoMeses);
      var H = 230;
      var izq = 40;
      var der = 6;
      var arriba = 10;
      var abajo = 26;
      var anchoZona = W - izq - der;
      var altoZona = H - arriba - abajo;
      var grupo = anchoZona / Math.max(serie.length, 1);
      var barra = Math.min(18, grupo * 0.36);
      var mayor = serie.reduce(function (m, x) { return x.entro > m.entro ? x : m; }, serie[0] || { entro: 0 });

      grafico(el.graficoMeses, {
        ancho: W,
        alto: H,
        titulo: 'Lo que entró y lo que salió cada mes, en USD',
        descripcion: serie.length ? 'Gráfico de barras de ' + serie.length + ' meses. El mes con más ingresos fue ' +
          F.nombreMes(mayor.mes).toLowerCase() + ' con ' + D.usd(mayor.entro) + '. Los datos exactos están en la tabla.'
          : 'No hay datos.',
        columnas: ['Mes', 'Entró', 'Salió', 'Ganancia'],
        filas: serie.map(function (x) {
          return [F.nombreMes(x.mes), D.usd(x.entro), D.usd(x.salio), (x.neto < 0 ? '− ' : '') + D.usd(Math.abs(x.neto))];
        }),
        leyenda: h('ul', { class: 'grafico-leyenda' }, [
          h('li', null, [h('span', { class: 'muestra-1', 'aria-hidden': 'true' }), 'Entró']),
          h('li', null, [h('span', { class: 'muestra-2', 'aria-hidden': 'true' }), 'Salió (gastos y pérdidas)'])
        ]),
        dibujar: function (svg) {
          svg.appendChild(s('defs', null, [
            s('pattern', { id: 'rayas-gasto', patternUnits: 'userSpaceOnUse', width: 5, height: 5, patternTransform: 'rotate(45)' }, [
              s('line', { x1: 0, y1: 0, x2: 0, y2: 5, class: 'raya-gasto' })
            ])
          ]));
          for (var i = 0; i <= 4; i++) {
            var valor = maximo * i / 4;
            var y = arriba + altoZona - altoZona * i / 4;
            svg.appendChild(s('line', { x1: izq, x2: W - der, y1: y, y2: y, class: i === 0 ? 'eje' : 'rejilla' }));
            svg.appendChild(texto(izq - 4, y + 4, corto(valor), { 'text-anchor': 'end' }));
          }
          serie.forEach(function (x, j) {
            var cx = izq + grupo * j + grupo / 2;
            var h1 = altoZona * x.entro / maximo;
            var h2 = altoZona * x.salio / maximo;
            svg.appendChild(s('rect', { x: cx - barra - 1, y: arriba + altoZona - h1, width: barra, height: Math.max(h1, 0), class: 'barra-1' }));
            svg.appendChild(s('rect', { x: cx + 1, y: arriba + altoZona - h2, width: barra, height: Math.max(h2, 0), class: 'barra-2' }));
            var etiqueta = grupo >= 30 ? F.mesCorto(x.mes) : F.mesCorto(x.mes).charAt(0);
            svg.appendChild(texto(cx, H - 8, etiqueta, { 'text-anchor': 'middle' }));
          });
        }
      });
    }

    /* ---------- Gráfico 2: línea (días del mes o meses del año) ---------- */
    function pintarLinea(per) {
      var puntos = [];
      if (per.tipo === 'mes') {
        el.lineaTitulo.textContent = 'Ganancia de cada día';
        el.lineaAyuda.textContent = 'Lo que entró menos lo que salió cada día de ' + per.nombre + '. La línea de puntos es el cero.';
        var fin = Math.min(per.hasta, diaHoy);
        for (var d = per.desde; d <= fin; d++) {
          var t = A.calc.totales(A.calc.enPeriodo(todos, d, d));
          puntos.push({ etiqueta: String(F.partes(d).dia), larga: F.corta(d), valor: t.neto });
        }
      } else {
        el.lineaTitulo.textContent = 'Ganancia de cada mes';
        el.lineaAyuda.textContent = 'Lo que entró menos lo que salió cada mes del ' + per.nombre + '. La línea de puntos es el cero.';
        per.meses.forEach(function (m) {
          puntos.push({ etiqueta: F.mesCorto(m).charAt(0), larga: F.nombreMes(m), valor: totalesMes(m).neto });
        });
      }
      if (!puntos.length) {
        A.vaciar(el.graficoLinea).appendChild(A.vacio('grafico', 'Este periodo todavía no ha empezado.',
          'Elija un mes anterior para ver su gráfico.'));
        return;
      }
      var valores = puntos.map(function (p) { return p.valor; });
      var max = techo(Math.max.apply(null, valores.concat([0])));
      var minimo = Math.min.apply(null, valores.concat([0]));
      var min = minimo < 0 ? -techo(-minimo) : 0;
      var W = anchoDe(el.graficoLinea);
      var H = 210;
      var izq = 40;
      var der = 8;
      var arriba = 10;
      var abajo = 24;
      var anchoZona = W - izq - der;
      var altoZona = H - arriba - abajo;
      function x(i) { return izq + (puntos.length === 1 ? anchoZona / 2 : anchoZona * i / (puntos.length - 1)); }
      function y(v) { return arriba + altoZona - altoZona * (v - min) / (max - min); }
      var mejor = puntos.reduce(function (a, b) { return b.valor > a.valor ? b : a; });
      var peor = puntos.reduce(function (a, b) { return b.valor < a.valor ? b : a; });

      grafico(el.graficoLinea, {
        ancho: W,
        alto: H,
        titulo: el.lineaTitulo.textContent + ', en USD',
        descripcion: 'Gráfico de línea con ' + puntos.length + ' puntos. El mejor fue ' + mejor.larga + ' con ' +
          D.usd(mejor.valor) + ' y el peor ' + peor.larga + ' con ' + (peor.valor < 0 ? '− ' : '') + D.usd(Math.abs(peor.valor)) + '.',
        columnas: [per.tipo === 'mes' ? 'Día' : 'Mes', 'Ganancia'],
        filas: puntos.map(function (p) { return [p.larga, (p.valor < 0 ? '− ' : '') + D.usd(Math.abs(p.valor))]; }),
        dibujar: function (svg) {
          (min < 0 ? [max, 0, min] : [max, max / 2, 0]).forEach(function (v) {
            svg.appendChild(s('line', { x1: izq, x2: W - der, y1: y(v), y2: y(v), class: 'rejilla' }));
            svg.appendChild(texto(izq - 4, y(v) + 4, corto(v), { 'text-anchor': 'end' }));
          });
          svg.appendChild(s('line', { x1: izq, x2: W - der, y1: y(0), y2: y(0), class: 'cero' }));
          svg.appendChild(s('polyline', {
            class: 'linea',
            points: puntos.map(function (p, i) { return x(i).toFixed(1) + ',' + y(p.valor).toFixed(1); }).join(' ')
          }));
          puntos.forEach(function (p, i) {
            if (puntos.length <= 31) { svg.appendChild(s('circle', { cx: x(i), cy: y(p.valor), r: 2.5, class: 'punto' })); }
            var cada = puntos.length > 12 ? 5 : 1;
            var ultimo = puntos.length - 1;
            // Etiqueta cada 5 días y la del último, sin que se monten dos seguidas.
            if (i === ultimo || (i % cada === 0 && (cada === 1 || ultimo - i >= 3))) {
              svg.appendChild(texto(x(i), H - 6, p.etiqueta, { 'text-anchor': 'middle' }));
            }
          });
        }
      });
    }

    /* ---------- Gráfico 3: barras horizontales por origen ---------- */
    function pintarFuentes(t) {
      var fuentes = [
        ['Alquiler (servicio general)', t.alquiler],
        ['Gastronomía', t.extras.gastronomia],
        ['Transporte', t.extras.transporte],
        ['Pasadía', t.extras.pasadia],
        ['Otros ingresos', t.extras.otro],
        ['Propinas', t.propinas]
      ];
      if (!t.ingresos) {
        A.vaciar(el.graficoFuentes).appendChild(A.vacio('dinero', 'No entró dinero en este periodo.',
          'Cuando anote cobros o extras en «Dinero» o «Reservas», aparecerán aquí.'));
        return;
      }
      var W = anchoDe(el.graficoFuentes);
      var fila = 46;
      var H = fuentes.length * fila + 4;
      var maximo = Math.max.apply(null, fuentes.map(function (f) { return f[1]; }));
      var principal = fuentes.reduce(function (a, b) { return b[1] > a[1] ? b : a; });
      grafico(el.graficoFuentes, {
        ancho: W,
        alto: H,
        titulo: 'De dónde viene el dinero, en USD',
        descripcion: 'Barras horizontales por origen. La mayor parte viene de ' + principal[0].toLowerCase() + ': ' +
          D.usd(principal[1]) + ' de ' + D.usd(t.ingresos) + '.',
        columnas: ['Origen', 'Importe', 'Parte del total'],
        filas: fuentes.map(function (f) {
          return [f[0], D.usd(f[1]), Math.round(f[1] / t.ingresos * 100) + ' %'];
        }),
        dibujar: function (svg) {
          fuentes.forEach(function (f, i) {
            var y0 = i * fila;
            var ancho = maximo ? W * f[1] / maximo : 0;
            svg.appendChild(texto(0, y0 + 14, f[0], { class: 'valor' }));
            svg.appendChild(texto(W, y0 + 14, D.usd(f[1]) + ' · ' + Math.round(f[1] / t.ingresos * 100) + ' %',
              { 'text-anchor': 'end' }));
            svg.appendChild(s('rect', { x: 0, y: y0 + 20, width: W, height: 16, rx: 2, class: 'pista' }));
            svg.appendChild(s('rect', { x: 0, y: y0 + 20, width: Math.max(ancho, f[1] > 0 ? 2 : 0), height: 16, rx: 2, class: 'barra-1' }));
          });
        }
      });
    }

    /* ---------- Tres mejores meses ---------- */
    function pintarMejores(per) {
      el.mejoresAyuda.textContent = per.tipo === 'mes' ? 'Los meses con más ganancia neta en los últimos 12 meses hasta ' + per.nombre + '.'
        : 'Los meses con más ganancia neta del ' + per.nombre + '.';
      var lista = per.meses.map(function (m) { return { mes: m, neto: totalesMes(m).neto, entro: totalesMes(m).ingresos }; })
        .filter(function (x) { return x.entro > 0; })
        .sort(function (a, b) { return b.neto - a.neto; })
        .slice(0, 3);
      A.vaciar(el.mejores);
      if (!lista.length) {
        el.mejores.appendChild(A.vacio('informe', 'Todavía no hay meses con movimientos.',
          'Cuando anote ingresos y gastos, aquí verá sus mejores meses.'));
        return;
      }
      var ol = h('ol', { class: 'lista-items' });
      lista.forEach(function (x, i) {
        ol.appendChild(h('li', { class: 'item item-cabecera' }, [
          h('span', { class: 'item-titulo', text: (i + 1) + '.º ' + F.nombreMes(x.mes) }),
          h('span', { class: 'importe ' + (x.neto >= 0 ? 'positivo' : 'negativo'),
            text: (x.neto < 0 ? '− ' : '') + D.usd(Math.abs(x.neto)) })
        ]));
      });
      el.mejores.appendChild(ol);
    }

    /* ---------- Visitas ---------- */
    function pintarVisitas(per) {
      var v = per.tipo === 'mes' ? datos.visitas.mensual[per.clave] : datos.visitas.anual[per.clave];
      A.vaciar(el.visitas);
      if (!v) {
        el.visitas.appendChild(A.vacio('usuario', 'No hay datos de visitas para este periodo.',
          'Las visitas se cuentan desde que la web pública empezó a medirlas.'));
        return;
      }
      el.visitas.appendChild(h('div', { class: 'cifras' }, [
        cifra('Visitantes únicos', D.numero(v.unicos),
          'Un identificador anónimo por navegador. Si la misma persona entra desde otro aparato, cuenta otra vez.', 'cifra-ancha'),
        cifra('Sesiones', D.numero(v.sesiones),
          'Cada visita. Si alguien pasa 30 minutos sin hacer nada, lo siguiente cuenta como sesión nueva.'),
        cifra('Páginas vistas', D.numero(v.paginas), 'Cada página abierta, también las repetidas.')
      ]));
      if (per.tipo === 'anio') {
        el.visitas.appendChild(h('p', { class: 'campo-ayuda', style: 'margin-top: 0.5rem',
          text: 'En el año, los visitantes únicos no son la suma de los meses: quien vuelve otro mes cuenta una sola vez.' }));
      }
    }

    /* ---------- Mensaje final ---------- */
    function pintarCierre(per, t) {
      A.vaciar(el.cierre);
      if (per.tipo !== 'mes') { return; }
      var anterior = F.sumarMeses(per.mes, -1);
      var pa = A.calc.periodoMes(anterior);
      var enCurso = diaHoy >= per.desde && diaHoy <= per.hasta;
      var netoAnterior;
      var comparacion;
      if (enCurso) {
        // Mes en curso: se compara con los mismos días del mes anterior.
        var diasLlevados = diaHoy - per.desde;
        var hastaAnterior = Math.min(pa.desde + diasLlevados, pa.hasta);
        netoAnterior = A.calc.totales(A.calc.enPeriodo(todos, pa.desde, hastaAnterior)).neto;
        comparacion = 'en los mismos días de ' + F.nombreMes(anterior).toLowerCase();
      } else {
        netoAnterior = totalesMes(anterior).neto;
        comparacion = 'en ' + F.nombreMes(anterior).toLowerCase();
      }
      if (t.neto > netoAnterior && t.neto > 0) {
        el.cierre.appendChild(h('div', { class: 'nota nota-exito' }, [A.icono('propina'), h('div', null, [
          h('p', { class: 'item-titulo', text: '¡Muy bien! Este periodo va mejor que el anterior.' }),
          h('p', { text: 'Ganancia neta de ' + D.usd(t.neto) + ': ' + D.usd(D.r2(t.neto - netoAnterior)) + ' más que ' + comparacion +
            '. Siga así.' })
        ])]));
      } else {
        el.cierre.appendChild(h('div', { class: 'nota' }, [A.icono('info'), h('p', {
          text: 'Ganancia neta de ' + (t.neto < 0 ? '− ' : '') + D.usd(Math.abs(t.neto)) + ' frente a ' +
            (netoAnterior < 0 ? '− ' : '') + D.usd(Math.abs(netoAnterior)) + ' ' + comparacion + '.' +
            (enCurso ? ' El mes todavía no ha terminado.' : '')
        })]));
      }
    }

    /* ---------- Pintar todo ---------- */
    function pintar() {
      var per = periodo();
      el.campoMes.hidden = per.tipo !== 'mes';
      el.campoAnio.hidden = per.tipo !== 'anio';
      var t = A.calc.totales(A.calc.enPeriodo(todos, per.desde, per.hasta));
      el.impresionPeriodo.textContent = 'Informe · ' + per.nombreLargo;
      el.impresionFecha.textContent = 'Generado el ' + F.larga(diaHoy) + '. Importes en USD.';
      pintarCifras(per, t);
      pintarMeses(per);
      pintarLinea(per);
      pintarFuentes(t);
      pintarMejores(per);
      pintarVisitas(per);
      pintarCierre(per, t);
    }

    document.querySelectorAll('input[name="periodo"]').forEach(function (r) { r.addEventListener('change', pintar); });
    el.mes.addEventListener('change', pintar);
    el.anio.addEventListener('change', pintar);

    var anchoAnterior = window.innerWidth;
    var esperaGiro = null;
    window.addEventListener('resize', function () {
      clearTimeout(esperaGiro);
      esperaGiro = setTimeout(function () {
        if (window.innerWidth !== anchoAnterior) {
          anchoAnterior = window.innerWidth;
          pintar();
        }
      }, 250);
    });

    el.pdf.addEventListener('click', function () { window.print(); });

    el.csv.addEventListener('click', function () {
      var per = periodo();
      var lista = A.calc.enPeriodo(todos, per.desde, per.hasta).slice().reverse();
      if (!lista.length) {
        A.aviso('No hay movimientos en este periodo: no hay nada que descargar.', { icono: 'info' });
        return;
      }
      function campo(v) {
        var t = String(v === null || v === undefined ? '' : v);
        return /[";\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
      }
      function num(v) { return String(v).replace('.', ','); }
      var filas = [['fecha', 'tipo', 'categoria', 'cantidad', 'moneda', 'tasa', 'equivalente_usd', 'nota', 'reserva', 'origen']];
      lista.forEach(function (m) {
        filas.push([m.fecha, A.catalogo.TIPOS[m.tipo].nombre, A.catalogo.nombreCategoria(m.tipo, m.categoria), num(m.monto),
          m.moneda, num(m.tasa), num(m.usd), m.nota, m.reservaId || '', m.derivado ? 'pago de reserva' : 'anotado a mano']);
      });
      // Separador ";" y coma decimal: se abre bien en hojas de cálculo en español. BOM para los acentos.
      var csv = '﻿' + filas.map(function (f) { return f.map(campo).join(';'); }).join('\r\n');
      A.descargar('movimientos-' + per.clave + '.csv', csv, 'text/csv;charset=utf-8');
      A.aviso('Descargado: ' + lista.length + ' movimientos ' + (per.tipo === 'mes' ? 'de ' : 'del ') + per.nombre + '.',
        { icono: 'descargar' });
    });

    pintar();
  });
})();
