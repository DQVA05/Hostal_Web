/* Casita de Tercera: calendario de reserva y diálogo de aceptación de reglas.
   JavaScript nativo, sin dependencias ni peticiones al servidor. */
(function () {
  'use strict';

  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MS_POR_DIA = 86400000;
  const MENSAJE_SIN_ENVIO = 'Su solicitud aún no se ha enviado. ' +
    'La reserva en línea estará disponible próximamente.';

  /* ---------- Fechas ----------
     Cada día se representa con un número entero: días transcurridos desde el
     1-1-1970. Se obtiene con Date.UTC a partir del año, mes y día LOCALES:
     - el día es el del calendario del visitante (nunca se usa toISOString,
       que convierte a UTC y puede devolver el día anterior o el siguiente);
     - restar dos días da siempre un número exacto, aunque entre medias haya
       un cambio de horario, porque UTC no tiene horario de verano. */

  function numeroDeDia(anio, mes, dia) {
    return Date.UTC(anio, mes, dia) / MS_POR_DIA;
  }

  function hoy() {
    const ahora = new Date();
    return numeroDeDia(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  }

  function partes(numero) {
    const f = new Date(numero * MS_POR_DIA);
    return { anio: f.getUTCFullYear(), mes: f.getUTCMonth(), dia: f.getUTCDate(), semana: f.getUTCDay() };
  }

  function diasDelMes(anio, mes) {
    return new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  }

  function sumarMeses(mesVisible, cantidad) {
    const total = mesVisible.anio * 12 + mesVisible.mes + cantidad;
    return { anio: Math.floor(total / 12), mes: ((total % 12) + 12) % 12 };
  }

  /* Lunes = 0 … domingo = 6 (la semana empieza en lunes). */
  function columna(numero) {
    return (partes(numero).semana + 6) % 7;
  }

  function textoFecha(numero) {
    const p = partes(numero);
    return DIAS_SEMANA[p.semana] + ', ' + p.dia + ' de ' + MESES[p.mes] + ' de ' + p.anio;
  }

  function textoBloques(cantidad) {
    return cantidad + (cantidad === 1 ? ' bloque' : ' bloques') + ' de 24 horas';
  }

  /* ---------- Elementos ---------- */
  const $ = function (id) { return document.getElementById(id); };
  const el = {
    titulo: $('calendario-titulo'),
    dias: $('calendario-dias'),
    anterior: $('mes-anterior'),
    siguiente: $('mes-siguiente'),
    entrada: $('resumen-entrada'),
    salida: $('resumen-salida'),
    bloques: $('resumen-bloques'),
    estado: $('estado-reserva'),
    reservar: $('boton-reservar'),
    borrar: $('boton-borrar'),
    reglas: $('reglas-texto'),
    dialogo: $('dialogo-reglas'),
    dialogoReglas: $('dialogo-reglas-texto'),
    dialogoEntrada: $('dialogo-entrada'),
    dialogoSalida: $('dialogo-salida'),
    dialogoBloques: $('dialogo-bloques'),
    mensaje: $('dialogo-mensaje'),
    aceptar: $('boton-aceptar'),
    confirmar: $('boton-confirmar'),
    cancelar: $('boton-cancelar')
  };

  if (!el.dias || !el.dialogo) {
    return;
  }

  const inicio = partes(hoy());
  const estado = {
    mes: { anio: inicio.anio, mes: inicio.mes }, // mes que se está viendo
    entrada: null,
    salida: null,
    aceptado: false,
    foco: null // día que recibe el foco del teclado dentro del calendario
  };

  function seleccionCompleta() {
    return estado.entrada !== null && estado.salida !== null;
  }

  function anunciar(texto) {
    el.estado.textContent = texto;
  }

  /* ---------- Calendario ---------- */
  function pintarCalendario(enfocar) {
    const diaHoy = hoy();
    const mesHoy = partes(diaHoy);
    const anio = estado.mes.anio;
    const mes = estado.mes.mes;
    const primero = numeroDeDia(anio, mes, 1);
    const ultimo = primero + diasDelMes(anio, mes) - 1;

    el.titulo.textContent = MESES[mes].charAt(0).toUpperCase() + MESES[mes].slice(1) + ' de ' + anio;
    // No tiene sentido ir a meses pasados: todos sus días están deshabilitados.
    el.anterior.disabled = anio < mesHoy.anio || (anio === mesHoy.anio && mes <= mesHoy.mes);

    // Un solo día es alcanzable con Tab; las flechas mueven el foco entre días.
    let foco = estado.foco;
    if (foco === null || foco < primero || foco > ultimo || foco < diaHoy) {
      const entradaVisible = estado.entrada !== null && estado.entrada >= Math.max(primero, diaHoy) &&
        estado.entrada <= ultimo;
      foco = entradaVisible ? estado.entrada : Math.max(primero, diaHoy);
    }
    estado.foco = foco;

    const filas = document.createDocumentFragment();
    let fila = null;
    // Siempre 6 semanas (42 celdas): el calendario no cambia de alto al cambiar de mes.
    const desde = primero - columna(primero);
    for (let i = 0; i < 42; i++) {
      if (i % 7 === 0) {
        fila = document.createElement('tr');
        filas.appendChild(fila);
      }
      const dia = desde + i;
      const celda = document.createElement('td');
      fila.appendChild(celda);
      if (dia < primero || dia > ultimo) {
        continue;
      }

      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'dia';
      boton.textContent = String(dia - primero + 1);
      boton.dataset.dia = String(dia);
      boton.tabIndex = dia === foco ? 0 : -1;

      let etiqueta = textoFecha(dia);
      if (dia < diaHoy) {
        boton.disabled = true;
        etiqueta += ', no disponible';
      }
      if (dia === diaHoy) {
        boton.classList.add('es-hoy');
        boton.setAttribute('aria-current', 'date');
        etiqueta += ', hoy';
      }
      if (dia === estado.entrada) {
        boton.classList.add('es-entrada');
        etiqueta += ', día de entrada';
      } else if (dia === estado.salida) {
        boton.classList.add('es-salida');
        etiqueta += ', día de salida';
      } else if (seleccionCompleta() && dia > estado.entrada && dia < estado.salida) {
        boton.classList.add('en-rango');
        etiqueta += ', dentro de la estancia';
      }
      boton.setAttribute('aria-label', etiqueta);
      celda.appendChild(boton);
    }

    el.dias.textContent = '';
    el.dias.appendChild(filas);

    if (enfocar) {
      const boton = el.dias.querySelector('[data-dia="' + foco + '"]');
      if (boton) {
        boton.focus();
      }
    }
  }

  function actualizarResumen() {
    el.entrada.textContent = estado.entrada !== null ? textoFecha(estado.entrada) + ', 10:00' : 'Sin seleccionar';
    el.salida.textContent = estado.salida !== null ? textoFecha(estado.salida) + ', 10:00' : 'Sin seleccionar';
    el.bloques.textContent = seleccionCompleta() ? String(estado.salida - estado.entrada) : '—';
    el.reservar.disabled = !seleccionCompleta();
    el.borrar.disabled = estado.entrada === null;
  }

  /* Primer clic: entrada. Segundo clic: salida (posterior a la entrada).
     Tercer clic: empieza una selección nueva con ese día como entrada. */
  function seleccionar(dia) {
    if (dia < hoy()) {
      return;
    }
    if (estado.entrada === null || estado.salida !== null) {
      estado.entrada = dia;
      estado.salida = null;
      anunciar('Entrada: ' + textoFecha(dia) + ', a las 10:00. Ahora seleccione el día de salida.');
    } else if (dia > estado.entrada) {
      estado.salida = dia;
      anunciar('Salida: ' + textoFecha(dia) + ', a las 10:00. Estancia de ' +
        textoBloques(estado.salida - estado.entrada) + '.');
    } else {
      estado.entrada = dia;
      anunciar('La salida debe ser posterior a la entrada. Nueva entrada: ' + textoFecha(dia) +
        '. Seleccione el día de salida.');
    }
    estado.foco = dia;
    anularAceptacion(); // cambiar las fechas anula la aceptación de las reglas
    actualizarResumen();
    pintarCalendario(true);
  }

  function cambiarMes(cantidad) {
    const teniaFocoAnterior = document.activeElement === el.anterior;
    estado.mes = sumarMeses(estado.mes, cantidad);
    estado.foco = null;
    pintarCalendario(false);
    // Si "Mes anterior" se deshabilita con el foco encima, el foco no se pierde.
    if (teniaFocoAnterior && el.anterior.disabled) {
      el.siguiente.focus();
    }
  }

  function mismoDiaEnOtroMes(numero, cantidad) {
    const p = partes(numero);
    const destino = sumarMeses({ anio: p.anio, mes: p.mes }, cantidad);
    return numeroDeDia(destino.anio, destino.mes, Math.min(p.dia, diasDelMes(destino.anio, destino.mes)));
  }

  el.dias.addEventListener('click', function (evento) {
    const boton = evento.target.closest('button[data-dia]');
    if (boton && !boton.disabled) {
      seleccionar(Number(boton.dataset.dia));
    }
  });

  el.dias.addEventListener('keydown', function (evento) {
    const boton = evento.target.closest('button[data-dia]');
    if (!boton) {
      return;
    }
    const actual = Number(boton.dataset.dia);
    let destino;
    switch (evento.key) {
      case 'ArrowLeft': destino = actual - 1; break;
      case 'ArrowRight': destino = actual + 1; break;
      case 'ArrowUp': destino = actual - 7; break;
      case 'ArrowDown': destino = actual + 7; break;
      case 'Home': destino = actual - columna(actual); break;
      case 'End': destino = actual + 6 - columna(actual); break;
      case 'PageUp': destino = mismoDiaEnOtroMes(actual, -1); break;
      case 'PageDown': destino = mismoDiaEnOtroMes(actual, 1); break;
      default: return;
    }
    evento.preventDefault();
    destino = Math.max(destino, hoy()); // no se puede ir a días pasados
    const p = partes(destino);
    estado.mes = { anio: p.anio, mes: p.mes };
    estado.foco = destino;
    pintarCalendario(true);
  });

  el.anterior.addEventListener('click', function () { cambiarMes(-1); });
  el.siguiente.addEventListener('click', function () { cambiarMes(1); });

  el.borrar.addEventListener('click', function () {
    estado.entrada = null;
    estado.salida = null;
    estado.foco = null;
    anularAceptacion();
    actualizarResumen();
    pintarCalendario(false);
    anunciar('Se han borrado las fechas. Seleccione el día de entrada.');
    // "Borrar fechas" queda deshabilitado: el foco pasa al calendario.
    const dia = el.dias.querySelector('button[tabindex="0"]');
    if (dia) {
      dia.focus();
    }
  });

  /* ---------- Diálogo de reglas ---------- */

  // Las reglas se escriben una sola vez en el HTML (#reglas-texto) y se copian aquí.
  if (el.reglas && el.dialogoReglas) {
    const copia = el.reglas.cloneNode(true);
    copia.removeAttribute('id');
    copia.querySelectorAll('[id]').forEach(function (nodo) { nodo.removeAttribute('id'); });
    el.dialogoReglas.appendChild(copia);
  }

  function anularAceptacion() {
    estado.aceptado = false;
    el.aceptar.setAttribute('aria-pressed', 'false');
    el.confirmar.disabled = true;
    el.mensaje.textContent = '';
  }

  el.reservar.addEventListener('click', function () {
    if (!seleccionCompleta()) {
      return;
    }
    anularAceptacion();
    el.dialogoEntrada.textContent = textoFecha(estado.entrada) + ', 10:00';
    el.dialogoSalida.textContent = textoFecha(estado.salida) + ', 10:00';
    el.dialogoBloques.textContent = String(estado.salida - estado.entrada);
    el.dialogo.showModal();
  });

  el.aceptar.addEventListener('click', function () {
    estado.aceptado = !estado.aceptado;
    el.aceptar.setAttribute('aria-pressed', String(estado.aceptado));
    el.confirmar.disabled = !estado.aceptado;
    el.mensaje.textContent = '';
  });

  el.confirmar.addEventListener('click', function () {
    // Doble comprobación: sin fechas o sin aceptar las reglas no se confirma nada.
    if (!estado.aceptado || !seleccionCompleta()) {
      return;
    }
    // TODO backend: aquí se enviaría la solicitud al servidor.
    el.mensaje.textContent = MENSAJE_SIN_ENVIO;
  });

  el.cancelar.addEventListener('click', function () {
    el.dialogo.close();
  });

  // "close" se dispara tanto con "Cancelar" como con la tecla Escape.
  el.dialogo.addEventListener('close', anularAceptacion);

  /* ---------- Inicio ---------- */
  actualizarResumen();
  pintarCalendario(false);
})();
