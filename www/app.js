// Variables globales
let trabajadores = [];

// Inicializar app
function initApp() {
    console.log("🚀 AliadoApp Bolivia iniciada");
    cargarEstadisticas();
}

// Mostrar/ocultar campo para especificar otros servicios
function mostrarCampoOtros() {
    const tipoSeleccionado = document.getElementById('regTipo').value;
    const campoOtrosContainer = document.getElementById('campoOtrosContainer');
    const campoOtrosInput = document.getElementById('regOtrosEspecifico');
    
    if (tipoSeleccionado === 'otros') {
        campoOtrosContainer.style.display = 'block';
        campoOtrosInput.required = true;
    } else {
        campoOtrosContainer.style.display = 'none';
        campoOtrosInput.required = false;
        campoOtrosInput.value = ''; // Limpiar el campo
    }
}

// Registrar nuevo aliado - VERSIÓN MEJORADA CON HABILIDADES PERSONALIZADAS
async function registrarTrabajador() {
    const nombre = document.getElementById('regNombre').value.trim();
    const tipo = document.getElementById('regTipo').value;
    const departamento = document.getElementById('regDepartamento').value;
    const ubicacion = document.getElementById('regUbicacion').value.trim();
    const telefono = document.getElementById('regTelefono').value.trim();
    const otrosEspecifico = document.getElementById('regOtrosEspecifico').value.trim();

    // Validaciones
    if (!nombre || !tipo || !departamento || !ubicacion || !telefono) {
        mostrarMensaje("❌ Por favor completa todos los campos", "error");
        return;
    }

    // Validación especial para "otros"
    if (tipo === 'otros' && !otrosEspecifico) {
        mostrarMensaje("❌ Por favor describe tu habilidad o servicio", "error");
        return;
    }

    if (telefono.length < 8) {
        mostrarMensaje("❌ El teléfono debe tener al menos 8 dígitos", "error");
        return;
    }

    if (ubicacion.length < 3) {
        mostrarMensaje("❌ Por favor especifica tu zona (ej: Norte, Sur, Centro, etc.)", "error");
        return;
    }

    mostrarMensaje("⏳ Registrando aliado...", "info");

    const trabajadorData = {
        n: nombre,
        t: tipo,
        tlf: telefono,
        dep: departamento,
        loc: ubicacion.toLowerCase(),
        esp: [],
        f: firebase.firestore.FieldValue.serverTimestamp(),
        v: false,
        cal: 0,
        calCount: 0,
        trComp: 0,
        ultAct: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Si es "otros", guardar la habilidad personalizada
    if (tipo === 'otros' && otrosEspecifico) {
        trabajadorData.habilidadPersonalizada = otrosEspecifico.toLowerCase();
    }

    try {
        const docRef = await db.collection('trabajadores').add(trabajadorData);
        console.log("✅ Aliado registrado con ID:", docRef.id);
        
        let mensajeExito = `✅ ¡Te has unido a AliadoApp! Ahora aparecerás en las búsquedas de ${capitalize(departamento)}`;
        if (tipo === 'otros') {
            mensajeExito += ` como: ${otrosEspecifico}`;
        }
        
        mostrarMensaje(mensajeExito, "success");
        limpiarFormulario();
        cargarEstadisticas();
        
    } catch (error) {
        console.error('❌ Error registrando aliado:', error);
        mostrarMensaje("❌ Error en el registro. Intenta nuevamente.", "error");
    }
}

// BUSCAR ALIADOS - VERSIÓN INTELIGENTE CON PUNTUACIÓN
async function buscarTrabajadores() {
    let query = document.getElementById('searchInput').value.toLowerCase().trim();
    const departamento = document.getElementById('departamentoInput').value;
    const zona = document.getElementById('locationInput').value.toLowerCase().trim();

    if (!query) {
        mostrarMensaje("❌ Escribe qué necesitas solucionar", "error");
        return;
    }

    if (!departamento) {
        mostrarMensaje("❌ Selecciona un departamento para ver aliados cerca de ti", "error");
        return;
    }

    mostrarMensaje("🔍 Buscando aliados...", "info");

    try {
        const snapshot = await db.collection('trabajadores')
            .where('dep', '==', departamento)
            .get();

        const resultados = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            let puntuacion = 0;
            
            // SISTEMA DE PUNTUACIÓN POR RELEVANCIA
            
            // 1. COINCIDENCIA EXACTA en tipo predefinido (MÁXIMA PUNTUACIÓN)
            if (data.t === query) {
                puntuacion += 100;
                console.log(`🎯 Coincidencia EXACTA en tipo: ${data.t}`);
            }
            // 2. COINCIDENCIA PARCIAL en tipo predefinido
            else if (data.t && data.t.includes(query)) {
                puntuacion += 50;
                console.log(`✅ Coincidencia PARCIAL en tipo: ${data.t}`);
            }
            
            // 3. COINCIDENCIA EXACTA en habilidad personalizada (MÁXIMA PUNTUACIÓN)
            if (data.habilidadPersonalizada === query) {
                puntuacion += 100;
                console.log(`🎯 Coincidencia EXACTA en personalizada: ${data.habilidadPersonalizada}`);
            }
            // 4. COINCIDENCIA PARCIAL en habilidad personalizada
            else if (data.habilidadPersonalizada && data.habilidadPersonalizada.includes(query)) {
                puntuacion += 50;
                console.log(`✅ Coincidencia PARCIAL en personalizada: ${data.habilidadPersonalizada}`);
            }
            
            // 5. COINCIDENCIA en nombre (MENOR PESO)
            if (data.n && data.n.toLowerCase().includes(query)) {
                puntuacion += 10;
                console.log(`👤 Coincidencia en nombre: ${data.n}`);
            }

            // BONO por experiencia y calificación
            const bonoExperiencia = (data.cal || 0) * 5; // Hasta 25 puntos extra por 5 estrellas
            const bonoTrabajos = (data.trComp || 0) * 2; // 2 puntos por trabajo completado
            
            puntuacion += bonoExperiencia + bonoTrabajos;

            // FILTRAR POR ZONA
            let pasaFiltroZona = true;
            if (zona) {
                if (!data.loc || !data.loc.includes(zona)) {
                    pasaFiltroZona = false;
                }
            }

            // Solo agregar si tiene puntuación y pasa filtro de zona
            if (puntuacion > 0 && pasaFiltroZona) {
                const tipo = data.t === 'otros' ? 'personalizado' : 'predefinido';
                resultados.push({ 
                    id: doc.id, 
                    data: data, 
                    tipo: tipo,
                    puntuacion: puntuacion
                });
            }
        });

        // ORDENAR por puntuación de relevancia (de mayor a menor)
        resultados.sort((a, b) => b.puntuacion - a.puntuacion);

        console.log(`📊 Resultados ordenados por puntuación:`, resultados);

        // MOSTRAR RESULTADOS
        mostrarResultadosInteligentes(resultados, query, departamento, zona);

    } catch (error) {
        console.error('❌ Error en búsqueda:', error);
        mostrarMensaje("❌ Error: " + error.message, "error");
    }
}

// FUNCIÓN MEJORADA PARA MOSTRAR RESULTADOS CON PUNTUACIÓN
function mostrarResultadosInteligentes(trabajadores, query, departamento, zona) {
    const resultsSection = document.getElementById('resultsSection');
    const resultsList = document.getElementById('resultsList');
    
    resultsSection.style.display = 'block';
    resultsList.innerHTML = '';

    if (trabajadores.length === 0) {
        resultsList.innerHTML = `
            <div class="no-results">
                <p>😞 No se encontraron aliados para "${query}" en ${capitalize(departamento)}</p>
                <p>💡 Intenta con otros términos o busca en otro departamento.</p>
                <p>🔍 Tip: Busca por oficio (plomero, electricista) o palabras clave</p>
            </div>
        `;
        return;
    }

    // Mostrar resultados ordenados por relevancia
    trabajadores.forEach(({ id, data, tipo, puntuacion }) => {
        const card = document.createElement('div');
        card.className = 'trabajador-card';
        
        const rating = data.cal > 0 ? `⭐ ${data.cal.toFixed(1)}` : '🆕 Nuevo';
        const trabajosCompletados = data.trComp || 0;
        
        // Determinar el servicio a mostrar
        let servicioMostrado = capitalize(data.t);
        if (tipo === 'personalizado' && data.habilidadPersonalizada) {
            servicioMostrado = `🎯 ${capitalize(data.habilidadPersonalizada)}`;
        }
        
        // Indicador de relevancia (solo para debugging, puedes quitarlo después)
        const indicadorRelevancia = `<span style="font-size: 0.7em; color: #666;">(relevancia: ${puntuacion})</span>`;
        
        card.innerHTML = `
            <div class="card-header">
                <h4>${data.n}</h4>
                <div>
                    <span class="rating">${rating}</span>
                    ${puntuacion >= 100 ? '<span style="color: #27ae60; margin-left: 5px;">🎯</span>' : ''}
                </div>
            </div>
            <div class="card-body">
                <p><strong>🧰 Servicio:</strong> ${servicioMostrado}</p>
                <p><strong>📍 Ubicación:</strong> ${data.loc} - ${capitalize(data.dep)}</p>
                <p><strong>📞 Teléfono:</strong> ${data.tlf}</p>
                <p><strong>✅ Trabajos completados:</strong> ${trabajosCompletados}</p>
                ${data.calCount ? `<p><strong>👥 Calificado por:</strong> ${data.calCount} personas</p>` : ''}
                ${tipo === 'personalizado' ? '<p><small>✨ Servicio personalizado</small></p>' : ''}
                <!-- ${indicadorRelevancia} -->
            </div>
            <div class="card-footer">
                <button onclick="contactarTrabajador('${data.tlf}', '${data.n}')">
                    📞 Contactar
                </button>
                <button onclick="calificarTrabajador('${id}', '${data.n}')">
                    ⭐ Calificar
                </button>
                <button onclick="marcarTrabajoCompletado('${id}', '${data.n}')">
                    ✅ Completado
                </button>
            </div>
        `;
        resultsList.appendChild(card);
    });

    const zonaMsg = zona ? ` en zona ${zona}` : '';
    
    // Mensaje inteligente según los resultados
    let mensajeInteligente = '';
    const mejorResultado = trabajadores[0];
    
    if (mejorResultado.puntuacion >= 100) {
        mensajeInteligente = `🎯 Encontrados ${trabajadores.length} aliados relevantes para "${query}"`;
    } else if (mejorResultado.puntuacion >= 50) {
        mensajeInteligente = `✅ Encontrados ${trabajadores.length} aliados relacionados con "${query}"`;
    } else {
        mensajeInteligente = `🔍 Encontrados ${trabajadores.length} aliados (búsqueda ampliada)`;
    }
    
    mostrarMensaje(`${mensajeInteligente} en ${capitalize(departamento)}${zonaMsg}`, "success");
}

// Contactar aliado - VERSIÓN MEJORADA CON WHATSAPP
function contactarTrabajador(telefono, nombre) {
    const opcion = confirm(`¿Cómo quieres contactar a ${nombre}?\n\nTeléfono: ${telefono}\n\n• Aceptar: Llamada telefónica\n• Cancelar: Enviar WhatsApp`);
    
    if (opcion === true) {
        // Llamada telefónica - funciona en móviles
        const telefonoLimpio = telefono.replace(/[\s\+\(\)\-]/g, '');
        window.open(`tel:${telefonoLimpio}`, '_self');
    } else if (opcion === false) {
        // WhatsApp - funciona en móviles y computadora
        const mensaje = `Hola ${nombre}, vi tu perfil en AliadoApp y me interesa tus servicios.`;
        const whatsappURL = `https://wa.me/${telefono.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`;
        window.open(whatsappURL, '_blank');
    }
}

// Calificar aliado
async function calificarTrabajador(trabajadorId, nombreTrabajador) {
    const calificacion = prompt(`Califica a ${nombreTrabajador}:\n\nDel 1 al 5 estrellas (5 = Excelente)`);
    
    if (!calificacion) return;
    
    const calNum = parseInt(calificacion);
    if (isNaN(calNum) || calNum < 1 || calNum > 5) {
        mostrarMensaje("❌ La calificación debe ser un número del 1 al 5", "error");
        return;
    }

    const comentario = prompt('Comentario opcional (presiona Cancelar si no quieres comentar):');

    try {
        const trabajadorRef = db.collection('trabajadores').doc(trabajadorId);
        const trabajadorDoc = await trabajadorRef.get();
        
        if (!trabajadorDoc.exists) {
            mostrarMensaje("❌ Aliado no encontrado", "error");
            return;
        }

        const trabajador = trabajadorDoc.data();

        // Calcular nueva calificación promedio
        const nuevoCount = (trabajador.calCount || 0) + 1;
        const sumaActual = (trabajador.cal || 0) * (trabajador.calCount || 0);
        const nuevoPromedio = (sumaActual + calNum) / nuevoCount;

        await trabajadorRef.update({
            cal: nuevoPromedio,
            calCount: nuevoCount,
            ultAct: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Guardar calificación individual
        await db.collection('calificaciones').add({
            trab: trabajadorId,
            cal: calNum,
            com: comentario || '',
            f: firebase.firestore.FieldValue.serverTimestamp(),
            nombreTrab: nombreTrabajador
        });

        mostrarMensaje(`✅ ¡Calificación ${calNum}⭐ enviada!`, "success");
        
        // Refrescar búsqueda si hay resultados visibles
        setTimeout(() => buscarTrabajadores(), 1000);
        
    } catch (error) {
        console.error('❌ Error calificando:', error);
        mostrarMensaje("❌ Error al enviar calificación", "error");
    }
}

// Marcar trabajo como completado
async function marcarTrabajoCompletado(trabajadorId, nombreTrabajador) {
    const confirmacion = confirm(`¿Marcar trabajo como COMPLETADO para ${nombreTrabajador}?\n\nEsto aumentará su contador de trabajos completados.`);
    
    if (!confirmacion) return;

    try {
        const trabajadorRef = db.collection('trabajadores').doc(trabajadorId);
        
        // Incrementar el contador de trabajos completados
        await trabajadorRef.update({
            trComp: firebase.firestore.FieldValue.increment(1),
            ultAct: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        mostrarMensaje(`✅ Trabajo completado registrado para ${nombreTrabajador}`, "success");
        
        // Refrescar búsqueda para mostrar el nuevo contador
        setTimeout(() => buscarTrabajadores(), 1000);
        
    } catch (error) {
        console.error('❌ Error marcando trabajo:', error);
        mostrarMensaje("❌ Error al registrar trabajo completado", "error");
    }
}

// Cargar estadísticas
async function cargarEstadisticas() {
    try {
        const snapshot = await db.collection('trabajadores').get();
        const total = snapshot.size;
        
        let topRated = 0;
        let totalTrabajos = 0;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.cal >= 4.0) topRated++;
            totalTrabajos += data.trComp || 0;
        });

        document.getElementById('totalTrabajadores').textContent = total;
        document.getElementById('topRated').textContent = topRated;
        document.getElementById('totalTrabajos').textContent = totalTrabajos;
        
    } catch (error) {
        console.error('❌ Error cargando estadísticas:', error);
    }
}

// Utilidades
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function limpiarFormulario() {
    document.getElementById('regNombre').value = '';
    document.getElementById('regTipo').value = '';
    document.getElementById('regDepartamento').value = '';
    document.getElementById('regUbicacion').value = '';
    document.getElementById('regTelefono').value = '';
    document.getElementById('regOtrosEspecifico').value = '';
    document.getElementById('campoOtrosContainer').style.display = 'none';
}

// Inicializar cuando carga la página
document.addEventListener('DOMContentLoaded', initApp);