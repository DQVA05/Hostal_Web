/* Casita de Tercera: página de reserva.
   Calendario, datos del cliente, resumen con precio, diálogo de aceptación de las
   regulaciones de la casa, pantalla de confirmación y botón "Volver arriba".
   NO envía ni guarda datos: nada va al servidor, a localStorage, a la consola ni a la URL.
   TODO backend: repetir todas las validaciones en el servidor, guardar los datos y
   el consentimiento de ofertas, y comprobar la disponibilidad de las fechas. */
(function () {
  'use strict';


  /* ---------- Fechas ----------
     Cada día se representa con un número entero: días transcurridos desde el
     1-1-1970. Se obtiene con Date.UTC a partir del año, mes y día DE LA HABANA:
     - "hoy" es la fecha de La Habana, no la del dispositivo (Intl.DateTimeFormat
       con timeZone 'America/Havana'); nunca se usa toISOString, que pasa a UTC
       y puede devolver el día anterior o el siguiente;
     - restar dos días da siempre un número exacto, aunque entre medias haya un
       cambio de horario, porque UTC no tiene horario de verano;
     - fin de mes y fin de año los resuelve Date.UTC (p. ej. 31 dic + 1 = 1 ene). */
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MS_POR_DIA = 86400000;

  const formatoHabana = (function () {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Havana', year: 'numeric', month: 'numeric', day: 'numeric'
      });
    } catch (e) {
      return null; // navegador sin zonas horarias: se usa el respaldo de hoy()
    }
  })();

  function numeroDeDia(anio, mes, dia) {
    return Date.UTC(anio, mes, dia) / MS_POR_DIA;
  }

  /* Hoy en La Habana. */
  function hoy() {
    const ahora = new Date();
    if (formatoHabana && formatoHabana.formatToParts) {
      const p = {};
      formatoHabana.formatToParts(ahora).forEach(function (parte) { p[parte.type] = parte.value; });
      return numeroDeDia(Number(p.year), Number(p.month) - 1, Number(p.day));
    }
    // Respaldo para navegadores muy antiguos: fecha del dispositivo.
    return numeroDeDia(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  }

  /* La entrada más temprana es mañana: hoy y los días pasados no se pueden elegir. */
  function primerDiaReservable() {
    return hoy() + 1;
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

  /* Mismo día del mes en otro mes; si no existe (31 → febrero), el último día de ese mes. */
  function mismoDiaEnOtroMes(numero, cantidad) {
    const p = partes(numero);
    const destino = sumarMeses({ anio: p.anio, mes: p.mes }, cantidad);
    return numeroDeDia(destino.anio, destino.mes, Math.min(p.dia, diasDelMes(destino.anio, destino.mes)));
  }

  /* Lunes = 0 … domingo = 6 (la semana empieza en lunes). */
  function columna(numero) {
    return (partes(numero).semana + 6) % 7;
  }

  function textoFecha(numero) {
    const p = partes(numero);
    return DIAS_SEMANA[p.semana] + ', ' + p.dia + ' de ' + MESES[p.mes] + ' de ' + p.anio;
  }

  function textoNoches(cantidad) {
    return cantidad + (cantidad === 1 ? ' noche' : ' noches');
  }

  /* ---------- Elementos ---------- */
  const $ = function (id) { return document.getElementById(id); };
  const el = {
    main: $('contenido'),
    calendario: $('calendario'),
    calendarioError: $('calendario-error'),
    titulo: $('calendario-titulo'),
    dias: $('calendario-dias'),
    anterior: $('mes-anterior'),
    siguiente: $('mes-siguiente'),
    seleccionEntrada: $('seleccion-entrada'),
    seleccionSalida: $('seleccion-salida'),
    estado: $('estado-fechas'),
    borrar: $('boton-borrar'),
    formulario: $('formulario-reserva'),
    resumenEntrada: $('resumen-entrada'),
    resumenSalida: $('resumen-salida'),
    resumenNoches: $('resumen-noches'),
    preciosTotal: $('precios-total'),
    reservar: $('boton-reservar'),
    reservarAyuda: $('reservar-ayuda'),
    estadoFormulario: $('estado-formulario'),
    dialogo: $('dialogo-reglas'),
    dialogoEntrada: $('dialogo-entrada'),
    dialogoSalida: $('dialogo-salida'),
    dialogoNoches: $('dialogo-noches'),
    dialogoPrecio: $('dialogo-precio'),
    mensaje: $('dialogo-mensaje'),
    aceptar: $('boton-aceptar'),
    confirmar: $('boton-confirmar'),
    cancelar: $('boton-cancelar'),
    volver: $('volver-arriba'),
    intro: document.querySelector('.contenedor-reserva > .entradilla'),
    bloqueReglas: $('reglas'),
    confirmacion: $('confirmacion'),
    confirmacionTitulo: $('confirmacion-titulo'),
    confirmacionNombre: $('confirmacion-nombre'),
    confirmacionCorreo: $('confirmacion-correo'),
    confirmacionTelefono: $('confirmacion-telefono'),
    confirmacionEntrada: $('confirmacion-entrada'),
    confirmacionSalida: $('confirmacion-salida'),
    confirmacionNoches: $('confirmacion-noches'),
    confirmacionPrecio: $('confirmacion-precio'),
    confirmacionOfertas: $('confirmacion-ofertas'),
    modificar: $('boton-modificar'),
    ofertas: $('ofertas')
  };

  if (!el.dias || !el.formulario || !el.dialogo) {
    return;
  }

  // Precios por cada 24 h, leídos de la tabla (data-precio): el número se escribe una sola vez en el HTML.
  const tarifas = Array.prototype.map.call(document.querySelectorAll('.precios tr[data-precio]'), function (fila) {
    return {
      precio: Number(fila.getAttribute('data-precio')),
      nombre: fila.querySelector('th').textContent.trim(),
      celdaTotal: fila.querySelector('.precio-total')
    };
  });

  const inicio = partes(primerDiaReservable());
  const estado = {
    mes: { anio: inicio.anio, mes: inicio.mes }, // mes que se está viendo
    entrada: null,
    salida: null,
    aceptado: false,
    foco: null,      // día que recibe el foco del teclado dentro del calendario
    hoyPintado: null // "hoy" con el que se pintó el calendario por última vez
  };

  function seleccionCompleta() {
    return estado.entrada !== null && estado.salida !== null;
  }

  function noches() {
    return seleccionCompleta() ? estado.salida - estado.entrada : 0;
  }

  function anunciar(texto) {
    el.estado.textContent = texto;
  }

  /* Pone un mensaje de error con el prefijo "Error:" para lectores de pantalla
     (a la vista ya lleva el icono "!" y el texto). */
  function escribirError(nodo, texto) {
    nodo.textContent = '';
    if (texto) {
      const prefijo = document.createElement('span');
      prefijo.className = 'solo-lectores';
      prefijo.textContent = 'Error: ';
      nodo.appendChild(prefijo);
      nodo.appendChild(document.createTextNode(texto));
    }
    nodo.hidden = !texto;
  }

  /* ---------- Calendario ---------- */
  function pintarCalendario(enfocar) {
    const diaHoy = hoy();
    const primerDia = diaHoy + 1;
    const mesPrimerDia = partes(primerDia);
    const anio = estado.mes.anio;
    const mes = estado.mes.mes;
    const primero = numeroDeDia(anio, mes, 1);
    const ultimo = primero + diasDelMes(anio, mes) - 1;
    estado.hoyPintado = diaHoy;

    el.titulo.textContent = MESES[mes].charAt(0).toUpperCase() + MESES[mes].slice(1) + ' de ' + anio;
    // No tiene sentido ir a meses anteriores al primer día reservable.
    el.anterior.disabled = anio < mesPrimerDia.anio || (anio === mesPrimerDia.anio && mes <= mesPrimerDia.mes);
    el.siguiente.disabled = false;

    // Un solo día es alcanzable con Tab; las flechas mueven el foco entre días.
    let foco = estado.foco;
    if (foco === null || foco < primero || foco > ultimo || foco < primerDia) {
      const entradaVisible = estado.entrada !== null && estado.entrada >= Math.max(primero, primerDia) &&
        estado.entrada <= ultimo;
      foco = entradaVisible ? estado.entrada : Math.max(primero, primerDia);
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
      if (dia === diaHoy) {
        boton.classList.add('es-hoy');
        boton.setAttribute('aria-current', 'date');
        etiqueta += ', hoy';
      }
      if (dia < primerDia) {
        boton.disabled = true;
        etiqueta += ', no disponible';
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
    el.calendario.removeAttribute('aria-busy'); // fuera el esqueleto de carga

    if (enfocar) {
      enfocarDiaActivo();
    }
  }

  function enfocarDiaActivo() {
    const boton = el.dias.querySelector('button[tabindex="0"]');
    if (boton) {
      boton.focus();
    }
  }

  function actualizarResumen() {
    const textoEntrada = estado.entrada !== null ? textoFecha(estado.entrada) + ', 10:00' : 'Sin seleccionar';
    const textoSalida = estado.salida !== null ? textoFecha(estado.salida) + ', 10:00' : 'Sin seleccionar';
    const cantidad = noches();

    el.seleccionEntrada.textContent = textoEntrada;
    el.seleccionSalida.textContent = textoSalida;
    el.resumenEntrada.textContent = textoEntrada;
    el.resumenSalida.textContent = textoSalida;
    el.resumenNoches.textContent = cantidad ? String(cantidad) : '—';

    // Totales: precio por cada 24 h × noches.
    el.preciosTotal.textContent = cantidad ? 'Total (' + textoNoches(cantidad) + ')' : 'Total';
    tarifas.forEach(function (t) {
      t.celdaTotal.textContent = cantidad ? (t.precio * cantidad) + ' USD' : '—';
    });

    // "Reservar" se habilita con entrada y salida elegidas.
    const completa = seleccionCompleta();
    el.reservar.disabled = !completa;
    el.reservarAyuda.hidden = completa;
    if (completa) {
      el.reservar.removeAttribute('aria-describedby');
    } else {
      el.reservar.setAttribute('aria-describedby', 'reservar-ayuda');
    }
    el.borrar.disabled = estado.entrada === null;
  }

  function textoPrecioTotal() {
    const cantidad = noches();
    return tarifas.map(function (t) {
      return (t.precio * cantidad) + ' USD con ' + t.nombre;
    }).join(' o ');
  }

  function mostrarErrorCalendario(texto) {
    el.calendario.classList.toggle('con-error', Boolean(texto));
    escribirError(el.calendarioError, texto);
  }

  /* Primer clic: entrada. Segundo clic: salida (posterior a la entrada).
     Tercer clic: empieza una selección nueva con ese día como entrada. */
  function seleccionar(dia) {
    const primerDia = primerDiaReservable();
    if (dia < primerDia) {
      // Pasó la medianoche con la página abierta: se repinta con los días correctos.
      pintarCalendario(true);
      anunciar('Ese día ya no está disponible. La entrada más temprana es ' + textoFecha(primerDia) + '.');
      return;
    }
    mostrarErrorCalendario('');
    if (estado.entrada === null || estado.salida !== null) {
      estado.entrada = dia;
      estado.salida = null;
      anunciar('Entrada: ' + textoFecha(dia) + ', a las 10:00. Ahora seleccione el día de salida.');
    } else if (dia > estado.entrada) {
      estado.salida = dia;
      anunciar('Salida: ' + textoFecha(dia) + ', a las 10:00. Estancia de ' +
        textoNoches(estado.salida - estado.entrada) + '.');
    } else {
      estado.entrada = dia;
      anunciar('La salida debe ser posterior a la entrada. Nueva entrada: ' + textoFecha(dia) +
        '. Seleccione el día de salida.');
    }
    estado.foco = dia;
    anularAceptacion(); // cambiar las fechas anula la aceptación de las regulaciones
    actualizarResumen();
    pintarCalendario(true);
  }

  /* Vuelve a validar las fechas con el "hoy" actual, por si la página quedó
     abierta pasada la medianoche. Devuelve false si la entrada ya no vale. */
  function comprobarFechas() {
    const primerDia = primerDiaReservable();
    if (estado.entrada !== null && estado.entrada < primerDia) {
      const p = partes(primerDia);
      estado.entrada = null;
      estado.salida = null;
      estado.foco = null;
      estado.mes = { anio: p.anio, mes: p.mes };
      anularAceptacion();
      actualizarResumen();
      pintarCalendario(false);
      mostrarErrorCalendario('La fecha de entrada elegida ya no está disponible: la entrada más temprana es ' +
        textoFecha(primerDia) + '. Elija de nuevo las fechas.');
      anunciar('Seleccione el día de entrada.');
      return false;
    }
    if (estado.hoyPintado !== hoy()) {
      pintarCalendario(el.calendario.contains(document.activeElement));
    }
    return true;
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
    destino = Math.max(destino, primerDiaReservable()); // no se puede ir a hoy ni a días pasados
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
    mostrarErrorCalendario('');
    actualizarResumen();
    pintarCalendario(false);
    anunciar('Se han borrado las fechas. Seleccione el día de entrada.');
    // "Borrar fechas" queda deshabilitado: el foco pasa al calendario.
    enfocarDiaActivo();
  });

  // Al volver a la pestaña (quizá al día siguiente) se actualizan los días disponibles.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      comprobarFechas();
    }
  });

  /* ---------- Datos del cliente ----------
     Se recortan los espacios sobrantes y se valida al salir de cada campo y al
     enviar. Al corregir, el error desaparece. */
  const LETRAS = 'A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u017F'; // incluye tildes, ü, ñ, ç…
  const RE_NOMBRE = new RegExp('^[' + LETRAS + ']+(?:[ \'’-][' + LETRAS + ']+)*$');
  const RE_CORREO = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
  const RE_TELEFONO = /^\+?[0-9]+(?:[ -][0-9]+)*$/;

  const campos = [
    {
      input: $('nombre'),
      limpiar: function (v) { return v.trim().replace(/\s+/g, ' '); },
      validar: function (v) {
        if (!v) { return 'Escriba su nombre y apellidos.'; }
        if (v.length < 2) { return 'El nombre debe tener al menos 2 caracteres.'; }
        if (v.length > 80) { return 'El nombre no puede superar los 80 caracteres.'; }
        if (!RE_NOMBRE.test(v)) { return 'Use solo letras (con tildes o ñ), espacios, guiones o apóstrofos.'; }
        return '';
      }
    },
    {
      input: $('correo'),
      limpiar: function (v) { return v.trim(); },
      validar: function (v) {
        if (!v) { return 'Escriba su correo electrónico.'; }
        if (v.length > 254) { return 'El correo no puede superar los 254 caracteres.'; }
        if (!RE_CORREO.test(v) || v.split('@')[0].length > 64) {
          return 'Revise el correo: debe tener la forma usuario@dominio.com.';
        }
        return '';
      }
    },
    {
      input: $('telefono'),
      limpiar: function (v) { return v.trim().replace(/\s+/g, ' '); },
      validar: function (v) {
        if (!v) { return 'Escriba su número de teléfono.'; }
        if (!RE_TELEFONO.test(v)) {
          return 'Use solo números, espacios o guiones, con el signo + opcional al inicio.';
        }
        const digitos = v.replace(/\D/g, '').length;
        if (digitos < 8 || digitos > 15) {
          return 'El teléfono debe tener entre 8 y 15 dígitos (ahora tiene ' + digitos + ').';
        }
        return '';
      }
    }
  ].filter(function (c) { return c.input; });

  function mostrarErrorCampo(campo, mensaje) {
    const id = campo.input.id;
    const error = $(id + '-error');
    escribirError(error, mensaje);
    if (mensaje) {
      campo.input.setAttribute('aria-invalid', 'true');
      campo.input.setAttribute('aria-describedby', id + '-ayuda ' + id + '-error');
    } else {
      campo.input.removeAttribute('aria-invalid');
      campo.input.setAttribute('aria-describedby', id + '-ayuda');
    }
  }

  /* Recorta, valida y muestra el resultado. Devuelve true si el campo es válido. */
  function validarCampo(campo) {
    const limpio = campo.limpiar(campo.input.value);
    if (limpio !== campo.input.value) {
      campo.input.value = limpio;
    }
    const mensaje = campo.validar(limpio);
    mostrarErrorCampo(campo, mensaje);
    return !mensaje;
  }

  campos.forEach(function (campo) {
    campo.input.addEventListener('blur', function () {
      validarCampo(campo);
    });
    // Al corregir: si el campo tenía error y ya es válido, el error desaparece.
    campo.input.addEventListener('input', function () {
      if (campo.input.getAttribute('aria-invalid') === 'true' && !campo.validar(campo.limpiar(campo.input.value))) {
        mostrarErrorCampo(campo, '');
      }
    });
  });

  /* Valida todos los campos. Devuelve la lista de campos con error. */
  function validarTodos() {
    return campos.filter(function (campo) { return !validarCampo(campo); });
  }

  /* ---------- Envío y diálogo de las regulaciones de la casa ---------- */
  function anularAceptacion() {
    estado.aceptado = false;
    el.aceptar.setAttribute('aria-pressed', 'false');
    el.confirmar.disabled = true;
    el.mensaje.textContent = '';
  }

  function abrirDialogo() {
    anularAceptacion();
    el.dialogoEntrada.textContent = textoFecha(estado.entrada) + ', 10:00';
    el.dialogoSalida.textContent = textoFecha(estado.salida) + ', 10:00';
    el.dialogoNoches.textContent = String(noches());
    el.dialogoPrecio.textContent = textoPrecioTotal();
    if (typeof el.dialogo.showModal === 'function') {
      el.dialogo.showModal();
    } else {
      // Navegadores sin <dialog> modal: se muestra en la página.
      el.dialogo.setAttribute('open', '');
      el.dialogo.scrollIntoView();
      el.aceptar.focus();
    }
    actualizarVolverArriba();
  }

  function cerrarDialogo() {
    if (typeof el.dialogo.close === 'function') {
      el.dialogo.close(); // también dispara "close", pero de forma asíncrona
    } else {
      el.dialogo.removeAttribute('open');
    }
    alCerrarDialogo(); // la aceptación se anula ya, sin esperar al evento
  }

  function alCerrarDialogo() {
    anularAceptacion(); // Cancelar o Escape anulan la aceptación
    actualizarVolverArriba();
  }

  // Nunca se envía el formulario: todavía no hay backend que lo reciba.
  el.formulario.addEventListener('submit', function (evento) {
    evento.preventDefault();
    el.estadoFormulario.textContent = '';

    if (!comprobarFechas() || !seleccionCompleta()) {
      if (!seleccionCompleta()) {
        el.estadoFormulario.textContent = 'Elija las fechas de entrada y salida.';
      }
      enfocarDiaActivo();
      return;
    }

    const conError = validarTodos();
    if (conError.length) {
      el.estadoFormulario.textContent = conError.length === 1 ?
        'Hay 1 dato por revisar en «Sus datos».' :
        'Hay ' + conError.length + ' datos por revisar en «Sus datos».';
      conError[0].input.focus(); // el foco va al primer campo con error
      return;
    }

    abrirDialogo();
  });

  el.aceptar.addEventListener('click', function () {
    estado.aceptado = !estado.aceptado;
    el.aceptar.setAttribute('aria-pressed', String(estado.aceptado));
    el.confirmar.disabled = !estado.aceptado;
    el.mensaje.textContent = '';
  });

  el.confirmar.addEventListener('click', function () {
    // Sin aceptar las regulaciones de la casa no se confirma nada.
    if (!estado.aceptado) {
      return;
    }
    // Se repiten las comprobaciones: fecha (por si pasó la medianoche) y datos.
    if (!comprobarFechas() || !seleccionCompleta()) {
      cerrarDialogo();
      enfocarDiaActivo();
      return;
    }
    const conError = validarTodos();
    if (conError.length) {
      cerrarDialogo();
      conError[0].input.focus();
      return;
    }
    // TODO backend: aquí se enviaría la solicitud al servidor y, si responde bien,
    // se mostraría la confirmación (sin el aviso «todavía no se ha enviado»).
    mostrarConfirmacion();
  });

  /* ---------- Pantalla de confirmación (final de la reserva) ----------
     Resumen claro, próximos pasos, contacto y agradecimiento. El formulario solo se
     oculta: con «Cambiar fechas o datos» vuelve tal como estaba. */
  function valorDe(id) {
    const campo = $(id);
    return campo ? campo.value.trim() : '';
  }

  function mostrarConfirmacion() {
    if (!el.confirmacion) {
      return;
    }
    const nombre = valorDe('nombre');
    el.confirmacionTitulo.textContent = nombre ? '¡Gracias, ' + nombre + '!' : '¡Gracias!';
    el.confirmacionNombre.textContent = nombre;
    el.confirmacionCorreo.textContent = valorDe('correo');
    el.confirmacionTelefono.textContent = valorDe('telefono');
    el.confirmacionEntrada.textContent = textoFecha(estado.entrada) + ', 10:00';
    el.confirmacionSalida.textContent = textoFecha(estado.salida) + ', 10:00';
    el.confirmacionNoches.textContent = String(noches());
    el.confirmacionPrecio.textContent = textoPrecioTotal() + ' (según las habitaciones que use)';
    el.confirmacionOfertas.textContent = el.ofertas && el.ofertas.checked ? 'Sí, desea recibirlas' : 'No';

    cerrarDialogo();
    [el.intro, el.bloqueReglas, el.formulario].forEach(function (nodo) {
      if (nodo) { nodo.hidden = true; }
    });
    el.confirmacion.hidden = false;
    el.confirmacionTitulo.focus({ preventScroll: true });
    const reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reducido ? 'auto' : 'smooth' });
    actualizarVolverArriba();
  }

  function ocultarConfirmacion() {
    el.confirmacion.hidden = true;
    [el.intro, el.bloqueReglas, el.formulario].forEach(function (nodo) {
      if (nodo) { nodo.hidden = false; }
    });
    enfocarDiaActivo();
    actualizarVolverArriba();
  }

  if (el.modificar) {
    el.modificar.addEventListener('click', ocultarConfirmacion);
  }

  el.cancelar.addEventListener('click', cerrarDialogo);

  // "close" se dispara tanto con "Cancelar" como con la tecla Escape.
  el.dialogo.addEventListener('close', alCerrarDialogo);

  /* ---------- Volver arriba ----------
     Aparece tras desplazar aproximadamente una pantalla. Se oculta con el diálogo
     abierto, mientras se escribe en un campo y cuando taparía un control. */
  const CONTROLES = 'a[href], button, input, select, textarea, label, summary, [tabindex]:not([tabindex="-1"])';
  let volverPendiente = false;

  function tapaUnControl() {
    if (!document.elementsFromPoint) {
      return false;
    }
    const r = el.volver.getBoundingClientRect();
    const puntos = [
      [r.left + r.width / 2, r.top + r.height / 2],
      [r.left + 4, r.top + 4], [r.right - 4, r.top + 4],
      [r.left + 4, r.bottom - 4], [r.right - 4, r.bottom - 4]
    ];
    return puntos.some(function (punto) {
      return document.elementsFromPoint(punto[0], punto[1]).some(function (nodo) {
        return nodo !== el.volver && !el.volver.contains(nodo) && nodo.matches(CONTROLES);
      });
    });
  }

  function actualizarVolverArriba() {
    volverPendiente = false;
    if (!el.volver) {
      return;
    }
    const activo = document.activeElement;
    let mostrar;
    if (activo === el.volver) {
      mostrar = !el.dialogo.open; // si tiene el foco, no desaparece bajo el teclado
    } else {
      mostrar = window.scrollY > window.innerHeight * 0.9 &&
        !el.dialogo.open &&
        !(activo && activo.matches('input, textarea, select')) &&
        !tapaUnControl();
    }
    el.volver.classList.toggle('es-visible', mostrar);
  }

  function programarVolverArriba() {
    if (!volverPendiente) {
      volverPendiente = true;
      window.requestAnimationFrame(actualizarVolverArriba);
    }
  }

  if (el.volver) {
    el.volver.hidden = false;
    window.addEventListener('scroll', programarVolverArriba, { passive: true });
    window.addEventListener('resize', programarVolverArriba);
    document.addEventListener('focusin', programarVolverArriba);
    document.addEventListener('focusout', programarVolverArriba);

    el.volver.addEventListener('click', function () {
      const reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      // El foco pasa al inicio del contenido; el desplazamiento es suave salvo con movimiento reducido.
      el.main.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: reducido ? 'auto' : 'smooth' });
    });
  }

  /* ---------- Inicio ---------- */
  actualizarResumen();
  pintarCalendario(false);
  actualizarVolverArriba();
})();
