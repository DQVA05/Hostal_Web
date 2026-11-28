/* Casita de Tercera · Panel (maqueta) · Dinero (libro de cuentas).
   - Los cobros de alquiler salen de los pagos de las reservas (no se editan aquí).
   - Lo demás (extras, propinas, gastos, pérdidas) se anota a mano.
   - Cada movimiento: fecha, tipo, categoría, cantidad, moneda + tasa → equivalente en USD.
   Parámetros: ?nuevo=gasto|ingreso|propina|perdida abre el formulario,
   ?reserva=R-0000 lo enlaza a una reserva, ?mes=AAAA-MM elige el mes.
   Nada se guarda. TODO backend: GET/POST/PUT/DELETE /api/movimientos. */
(function () {
  'use strict';

  var A = window.Admin;
  var F = A.fecha;
  var D = A.dinero;
  var h = A.h;
  var POR_PAGINA = 40;

  A.iniciar(function (datos) {
    var $ = function (id) { return document.getElementById(id); };
    var el = {
      nuevo: $('boton-nuevo'),
      mes: $('filtro-mes'),
      tipo: $('filtro-tipo'),
      categoria: $('filtro-categoria'),
      resumenTitulo: $('resumen-titulo'),
      resumen: $('resumen'),
      lista: $('lista'),
      listaAyuda: $('lista-ayuda'),
      dialogo: $('dialogo-movimiento'),
      form: $('form-movimiento'),
      titulo: $('movimiento-titulo'),
      tipoGrupo: $('mov-tipo-grupo'),
      tipoError: $('mov-tipo-error'),
      fecha: $('mov-fecha'),
      fechaError: $('mov-fecha-error'),
      categoriaCampo: $('mov-categoria-campo'),
      categoriaSel: $('mov-categoria'),
      categoriaAyuda: $('mov-categoria-ayuda'),
      categoriaError: $('mov-categoria-error'),
      monto: $('mov-monto'),
      montoError: $('mov-monto-error'),
      tasaCampo: $('mov-tasa-campo'),
      tasaEtiqueta: $('mov-tasa-etiqueta'),
      tasa: $('mov-tasa'),
      tasaError: $('mov-tasa-error'),
      equivalente: $('mov-equivalente'),
      reserva: $('mov-reserva'),
      nota: $('mov-nota'),
      cancelar: $('mov-cancelar')
    };

    var mostrar = POR_PAGINA;
    var editando = null;   // id del movimiento que se cambia, o null si es nuevo

    /* ---------- Filtros ---------- */
    function rellenarMeses(elegido) {
      var claves = new Set([F.claveMes(F.hoy())]);
      A.calc.movimientos(datos).forEach(function (m) { claves.add(m.fecha.slice(0, 7)); });
      var lista = Array.from(claves).sort().reverse();
      A.vaciar(el.mes);
      lista.forEach(function (c) {
        el.mes.appendChild(h('option', { value: c, text: F.nombreMes(F.mesDeClave(c)) }));
      });
      el.mes.appendChild(h('option', { value: 'todos', text: 'Todos los meses' }));
      el.mes.value = lista.indexOf(elegido) > -1 || elegido === 'todos' ? elegido : lista[0];
    }

    function rellenarCategorias() {
      var tipo = el.tipo.value;
      var anterior = el.categoria.value;
      A.vaciar(el.categoria);
      el.categoria.appendChild(h('option', { value: '', text: 'Todas las categorías' }));
      function grupo(etiqueta, prefijo, lista) {
        var g = h('optgroup', { label: etiqueta });
        lista.forEach(function (c) { g.appendChild(h('option', { value: prefijo + ':' + c[0], text: c[1] })); });
        el.categoria.appendChild(g);
      }
      if (!tipo || tipo === 'ingreso') { grupo('Ingresos', 'ingreso', A.catalogo.CATEGORIAS_INGRESO); }
      if (!tipo || tipo === 'gasto' || tipo === 'perdida') {
        grupo('Gastos y pérdidas', 'gasto', A.catalogo.CATEGORIAS_GASTO);
      }
      if (!tipo || tipo === 'propina') { grupo('Propinas', 'propina', [['propina', 'Propina']]); }
      el.categoria.value = anterior;
      if (el.categoria.value !== anterior) { el.categoria.value = ''; }
    }

    function periodo() {
      if (el.mes.value === 'todos') { return null; }
      return A.calc.periodoMes(F.mesDeClave(el.mes.value));
    }

    function filtrados(lista) {
      var tipo = el.tipo.value;
      var cat = el.categoria.value;
      var grupo = cat ? cat.split(':')[0] : '';
      var clave = cat ? cat.split(':')[1] : '';
      return lista.filter(function (m) {
        if (tipo && m.tipo !== tipo) { return false; }
        if (cat) {
          if (m.categoria !== clave) { return false; }
          if (grupo === 'gasto' && m.tipo !== 'gasto' && m.tipo !== 'perdida') { return false; }
          if (grupo === 'ingreso' && m.tipo !== 'ingreso') { return false; }
          if (grupo === 'propina' && m.tipo !== 'propina') { return false; }
        }
        return true;
      });
    }

    /* ---------- Resumen del periodo (no depende del tipo ni de la categoría) ---------- */
    function pintarResumen(movsPeriodo) {
      var t = A.calc.totales(movsPeriodo);
      el.resumenTitulo.textContent = el.mes.value === 'todos' ? 'Resumen de todos los meses'
        : 'Resumen de ' + F.nombreMes(F.mesDeClave(el.mes.value)).toLowerCase();
      function fila(etiqueta, valor, clase, signo) {
        return h('div', { class: clase || null }, [
          h('dt', { text: etiqueta }),
          h('dd', { class: signo === '-' && valor ? 'negativo' : null, text: (signo === '-' && valor ? '− ' : '') + D.usd(valor) })
        ]);
      }
      A.vaciar(el.resumen);
      el.resumen.appendChild(h('dl', { class: 'datos' }, [
        fila('Alquiler (servicio general)', t.alquiler),
        fila('Gastronomía', t.extras.gastronomia, 'sangria'),
        fila('Transporte', t.extras.transporte, 'sangria'),
        fila('Pasadía', t.extras.pasadia, 'sangria'),
        fila('Otros ingresos', t.extras.otro, 'sangria'),
        fila('Total de extras', t.totalExtras),
        fila('Propinas', t.propinas),
        fila('Total que entró', t.ingresos),
        fila('Gastos', t.gastos, null, '-'),
        fila('Pérdidas', t.perdidas, null, '-'),
        h('div', { class: 'total' }, [
          h('dt', { text: t.neto >= 0 ? 'Ganancia neta' : 'Pérdida neta' }),
          h('dd', { class: t.neto >= 0 ? 'positivo' : 'negativo', text: (t.neto < 0 ? '− ' : '') + D.usd(Math.abs(t.neto)) })
        ])
      ]));
    }

    /* ---------- Lista ---------- */
    function pintar() {
      var todos = A.calc.movimientos(datos);
      var p = periodo();
      var delPeriodo = p ? A.calc.enPeriodo(todos, p.desde, p.hasta) : todos;
      pintarResumen(delPeriodo);

      var lista = filtrados(delPeriodo);
      A.vaciar(el.lista);
      if (!todos.length) {
        el.listaAyuda.textContent = 'Los más recientes primero.';
        el.lista.appendChild(A.vacio('dinero', 'Todavía no hay movimientos.',
          'Pulse «Anotar movimiento» para apuntar el primer gasto o ingreso.',
          A.boton('Anotar movimiento', 'sumar', 'boton-principal', function () { abrir(null, 'gasto'); })));
        return;
      }
      if (!lista.length) {
        el.listaAyuda.textContent = 'Los más recientes primero.';
        el.lista.appendChild(A.vacio('buscar', 'No hay movimientos con estos filtros.',
          'Pruebe con otro mes o elija «Todos los tipos» y «Todas las categorías».',
          A.boton('Quitar filtros de tipo y categoría', 'cerrar', 'boton-secundario', function () {
            el.tipo.value = '';
            rellenarCategorias();
            el.categoria.value = '';
            mostrar = POR_PAGINA;
            pintar();
          })));
        return;
      }
      var suma = lista.reduce(function (s, m) {
        return s + (m.tipo === 'gasto' || m.tipo === 'perdida' ? -m.usd : m.usd);
      }, 0);
      el.listaAyuda.textContent = lista.length + (lista.length === 1 ? ' movimiento' : ' movimientos') +
        ', los más recientes primero. Saldo de lo que ve: ' + (suma < 0 ? '− ' : '') + D.usd(Math.abs(suma)) + '.';

      var ul = h('ul', { class: 'lista-items' });
      lista.slice(0, mostrar).forEach(function (m) { ul.appendChild(item(m)); });
      el.lista.appendChild(ul);
      if (lista.length > mostrar) {
        el.lista.appendChild(h('div', { class: 'seccion' }, A.boton('Ver ' + Math.min(POR_PAGINA, lista.length - mostrar) +
          ' movimientos más', 'siguiente', 'boton-secundario boton-bloque', function () {
          mostrar += POR_PAGINA;
          pintar();
        })));
      }
    }

    function item(m) {
      var salida = m.tipo === 'gasto' || m.tipo === 'perdida';
      var li = h('li', { class: 'item' });
      li.appendChild(h('div', { class: 'item-cabecera' }, [
        A.insigniaTipo(m.tipo),
        h('span', { class: 'importe ' + (salida ? 'negativo' : 'positivo'),
          text: (salida ? '− ' : '+ ') + D.monto(m.monto, m.moneda) })
      ]));
      li.appendChild(h('p', { class: 'item-linea item-titulo', text: A.catalogo.nombreCategoria(m.tipo, m.categoria) }));
      li.appendChild(h('p', { class: 'item-linea texto-suave', text: F.corta(F.deISO(m.fecha)) + (m.nota ? ' · ' + m.nota : '') }));
      if (m.moneda !== 'USD') {
        li.appendChild(h('p', { class: 'item-linea texto-suave',
          text: 'Tasa: ' + D.textoTasa(m.moneda, m.tasa) + ' → ' + D.usd(m.usd) }));
      }
      var acciones = h('div', { class: 'item-acciones' });
      if (m.derivado) {
        acciones.appendChild(A.enlaceBoton('Ver la reserva ' + m.reservaId, 'ver', A.enlaceReserva(m.reservaId)));
        li.appendChild(acciones);
        li.appendChild(h('p', { class: 'campo-ayuda', text: 'Este cobro sale de la reserva: se cambia desde «Reservas».' }));
      } else {
        acciones.appendChild(A.boton('Cambiar', 'editar', 'boton-secundario', function () { abrir(m.id); }));
        if (m.reservaId) {
          acciones.appendChild(A.enlaceBoton('Reserva ' + m.reservaId, 'ver', A.enlaceReserva(m.reservaId)));
        }
        acciones.appendChild(A.boton('Borrar', 'borrar', 'boton-peligro', function () { borrar(m.id); }));
        li.appendChild(acciones);
      }
      return li;
    }

    /* ---------- Formulario ---------- */
    function radio(nombre) {
      var r = el.form.querySelector('input[name="' + nombre + '"]:checked');
      return r ? r.value : '';
    }

    function marcar(nombre, valor) {
      el.form.querySelectorAll('input[name="' + nombre + '"]').forEach(function (r) { r.checked = r.value === valor; });
    }

    function rellenarCategoriasForm(tipo, elegida) {
      A.vaciar(el.categoriaSel);
      el.categoriaCampo.hidden = tipo === 'propina' || !tipo;
      if (!tipo || tipo === 'propina') { return; }
      el.categoriaSel.appendChild(h('option', { value: '', text: 'Elija una categoría' }));
      A.catalogo.categoriasDe(tipo).forEach(function (c) {
        if (c[0] === 'alquiler') { return; } // el alquiler se cobra desde la reserva
        el.categoriaSel.appendChild(h('option', { value: c[0], text: c[1] }));
      });
      el.categoriaSel.value = elegida || '';
      el.categoriaAyuda.textContent = tipo === 'ingreso'
        ? 'Los cobros del alquiler no se anotan aquí: se anotan como pago en la reserva.'
        : (tipo === 'perdida' ? 'Pérdida: algo que se rompió, se perdió o no se pudo cobrar.' : '');
      el.categoriaAyuda.hidden = !el.categoriaAyuda.textContent;
    }

    function rellenarReservas(elegida) {
      var diaHoy = F.hoy();
      A.vaciar(el.reserva);
      el.reserva.appendChild(h('option', { value: '', text: 'Sin reserva' }));
      datos.reservas
        .filter(function (r) {
          if (r.id === elegida) { return true; }
          if (r.estado === 'cancelada') { return false; }
          var d = F.deISO(r.entrada);
          return d >= diaHoy - 60 && d <= diaHoy + 60;
        })
        .sort(function (a, b) { return a.entrada < b.entrada ? 1 : -1; })
        .forEach(function (r) {
          el.reserva.appendChild(h('option', { value: r.id, text: r.id + ' · ' + A.calc.nombreCliente(datos, r.clienteId) +
            ' · ' + F.corta(F.deISO(r.entrada)) + ' – ' + F.corta(F.deISO(r.salida)) }));
        });
      el.reserva.value = elegida || '';
    }

    function actualizarMoneda(ponerTasa) {
      var moneda = radio('moneda') || 'USD';
      el.tasaCampo.hidden = moneda === 'USD';
      if (moneda !== 'USD') {
        el.tasaEtiqueta.textContent = D.preguntaTasa(moneda);
        if (ponerTasa) { el.tasa.value = String(datos.tasasVigentes[moneda]).replace('.', ','); }
      }
      actualizarEquivalente();
    }

    function actualizarEquivalente() {
      var moneda = radio('moneda') || 'USD';
      var monto = D.leer(el.monto.value);
      var tasa = moneda === 'USD' ? 1 : D.leer(el.tasa.value);
      if (!(monto > 0) || !(tasa > 0)) {
        el.equivalente.textContent = moneda === 'USD' ? 'Escriba la cantidad en dólares.' :
          'Escriba la cantidad y la tasa para ver cuánto es en dólares.';
        return;
      }
      el.equivalente.textContent = moneda === 'USD' ? 'Se anotará: ' + D.usd(monto)
        : 'Equivale a ' + D.usd(D.aUSD(monto, moneda, tasa)) + ' (' + D.textoTasa(moneda, tasa) + ').';
    }

    function limpiarErrores() {
      [[el.tipoGrupo, el.tipoError], [el.fecha, el.fechaError], [el.categoriaSel, el.categoriaError],
        [el.monto, el.montoError], [el.tasa, el.tasaError]].forEach(function (p) { A.errorCampo(p[0], p[1], ''); });
    }

    function abrir(id, tipoInicial, reservaInicial) {
      editando = id || null;
      limpiarErrores();
      var m = id ? datos.movimientos.find(function (x) { return x.id === id; }) : null;
      el.titulo.textContent = m ? 'Cambiar movimiento' : 'Anotar movimiento';
      var tipo = m ? m.tipo : (tipoInicial || 'gasto');
      marcar('tipo', tipo);
      el.fecha.max = F.aISO(F.hoy());
      el.fecha.value = m ? m.fecha : F.aISO(F.hoy());
      rellenarCategoriasForm(tipo, m ? m.categoria : '');
      el.monto.value = m ? String(m.monto).replace('.', ',') : '';
      marcar('moneda', m ? m.moneda : 'USD');
      el.tasa.value = m && m.moneda !== 'USD' ? String(m.tasa).replace('.', ',') : '';
      actualizarMoneda(!m || m.moneda === 'USD');
      rellenarReservas(m ? m.reservaId : (reservaInicial || ''));
      el.nota.value = m ? m.nota : '';
      A.abrirDialogo(el.dialogo);
      (m ? el.monto : el.form.querySelector('input[name="tipo"]:checked')).focus();
    }

    function cerrar() {
      A.cerrarDialogo(el.dialogo);
    }

    function validar() {
      limpiarErrores();
      var primero = null;
      function error(campo, nodo, texto) {
        A.errorCampo(campo, nodo, texto);
        if (!primero) { primero = campo.tagName === 'FIELDSET' ? campo.querySelector('input') : campo; }
      }
      var tipo = radio('tipo');
      if (!tipo) { error(el.tipoGrupo, el.tipoError, 'Elija qué quiere anotar.'); }
      var fecha = F.deISO(el.fecha.value);
      if (isNaN(fecha)) { error(el.fecha, el.fechaError, 'Escriba la fecha.'); }
      else if (fecha > F.hoy()) { error(el.fecha, el.fechaError, 'La fecha no puede ser posterior a hoy.'); }
      if (tipo && tipo !== 'propina' && !el.categoriaSel.value) {
        error(el.categoriaSel, el.categoriaError, 'Elija una categoría.');
      }
      var monto = D.leer(el.monto.value);
      if (!el.monto.value.trim()) { error(el.monto, el.montoError, 'Escriba la cantidad.'); }
      else if (!(monto > 0)) { error(el.monto, el.montoError, 'Escriba solo números, por ejemplo 25 o 25,50.'); }
      var moneda = radio('moneda') || 'USD';
      var tasa = 1;
      if (moneda !== 'USD') {
        tasa = D.leer(el.tasa.value);
        if (!(tasa > 0)) { error(el.tasa, el.tasaError, 'Escriba la tasa de cambio, por ejemplo ' + D.numero(datos.tasasVigentes[moneda]) + '.'); }
      }
      if (primero) {
        primero.focus();
        return null;
      }
      return {
        fecha: el.fecha.value,
        tipo: tipo,
        categoria: tipo === 'propina' ? 'propina' : el.categoriaSel.value,
        monto: D.r2(monto),
        moneda: moneda,
        tasa: tasa,
        nota: el.nota.value.trim(),
        reservaId: el.reserva.value || null
      };
    }

    function guardar(valores) {
      var antes = datos.movimientos.slice();
      var nuevo;
      if (editando) {
        nuevo = Object.assign({ id: editando }, valores);
        datos.movimientos = datos.movimientos.map(function (x) { return x.id === editando ? nuevo : x; });
      } else {
        nuevo = Object.assign({ id: A.calc.siguienteId(datos.movimientos, 'M') }, valores);
        datos.movimientos = datos.movimientos.concat([nuevo]);
      }
      var eraEdicion = Boolean(editando);
      cerrar();
      var mesAntes = el.mes.value;
      rellenarMeses(mesAntes === 'todos' ? 'todos' : valores.fecha.slice(0, 7));
      pintar();
      el.nuevo.focus(); // el botón que abrió el formulario puede haberse vuelto a pintar
      var nombre = A.catalogo.TIPOS[valores.tipo].nombre;
      A.aviso((eraEdicion ? 'Cambio guardado: ' : nombre + ' anotado: ') + D.monto(valores.monto, valores.moneda) +
        (valores.moneda !== 'USD' ? ' (' + D.usd(D.aUSD(valores.monto, valores.moneda, valores.tasa)) + ')' : '') + '.', {
        deshacer: function () {
          datos.movimientos = antes;
          rellenarMeses(el.mes.value);
          pintar();
        }
      });
    }

    function borrar(id) {
      var m = datos.movimientos.find(function (x) { return x.id === id; });
      if (!m) { return; }
      var nombre = A.catalogo.TIPOS[m.tipo].nombre.toLowerCase();
      A.confirmar({
        titulo: '¿Borrar este ' + (m.tipo === 'perdida' || m.tipo === 'propina' ? 'movimiento' : nombre) + '?',
        texto: A.catalogo.TIPOS[m.tipo].nombre + ' de ' + D.monto(m.monto, m.moneda) + ' · ' +
          A.catalogo.nombreCategoria(m.tipo, m.categoria) + ' · ' + F.corta(F.deISO(m.fecha)) +
          '. Podrá deshacerlo justo después.',
        aceptar: 'Sí, borrar',
        icono: 'borrar',
        peligro: true
      }).then(function (ok) {
        if (!ok) { return; }
        var antes = datos.movimientos.slice();
        datos.movimientos = datos.movimientos.filter(function (x) { return x.id !== id; });
        pintar();
        A.aviso('Movimiento borrado.', {
          icono: 'borrar',
          deshacer: function () {
            datos.movimientos = antes;
            pintar();
          }
        });
        el.nuevo.focus();
      });
    }

    /* ---------- Eventos ---------- */
    el.nuevo.addEventListener('click', function () { abrir(null, 'gasto'); });
    el.cancelar.addEventListener('click', cerrar);
    el.dialogo.addEventListener('cancel', function (e) { e.preventDefault(); cerrar(); });
    el.form.addEventListener('submit', function (e) {
      e.preventDefault();
      var valores = validar();
      if (valores) { guardar(valores); }
    });
    el.form.addEventListener('change', function (e) {
      if (e.target.name === 'tipo') {
        rellenarCategoriasForm(e.target.value, '');
        A.errorCampo(el.tipoGrupo, el.tipoError, '');
      }
      if (e.target.name === 'moneda') { actualizarMoneda(true); }
    });
    el.monto.addEventListener('input', actualizarEquivalente);
    el.tasa.addEventListener('input', actualizarEquivalente);

    el.mes.addEventListener('change', function () { mostrar = POR_PAGINA; pintar(); });
    el.tipo.addEventListener('change', function () { rellenarCategorias(); mostrar = POR_PAGINA; pintar(); });
    el.categoria.addEventListener('change', function () { mostrar = POR_PAGINA; pintar(); });

    /* ---------- Arranque ---------- */
    var paramMes = A.parametro('mes');
    rellenarMeses(/^\d{4}-\d{2}$/.test(paramMes || '') ? paramMes : F.claveMes(F.hoy()));
    rellenarCategorias();
    pintar();
    var nuevo = A.parametro('nuevo');
    if (nuevo && A.catalogo.TIPOS[nuevo]) {
      el.nuevo.focus();
      abrir(null, nuevo, A.parametro('reserva') || '');
    }
  });
})();
