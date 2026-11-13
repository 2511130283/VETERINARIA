
// ========================================
// ELEMENTOS DEL HTML
// ========================================

// MASCOTAS
const formularioMascota = document.getElementById("formMascota");
const tablaMascotas = document.getElementById("tablaMascotas");
const botonCancelarMascota = document.getElementById("btnCancelar");

// VETERINARIOS
const formularioVeterinario = document.getElementById("formVeterinario");
const tablaVeterinarios = document.getElementById("tablaVeterinarios");
const botonCancelarVeterinario = document.getElementById("btnCancelarVeterinario");

// CONSULTAS
const formularioConsulta = document.getElementById("formConsulta");
const tablaConsultas = document.getElementById("tablaConsultas");
const botonCancelarConsulta = document.getElementById("btnCancelarConsulta");

// LISTAS
let registrosMascotas = [];
let registrosVeterinarios = [];
let registrosConsultas = [];


// ========================================
// FUNCIONES GENERALES
// ========================================

function mostrarError(error) {
    console.error(error);
    alert("Ocurrió un error: " + error.message);
}

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caracter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caracter]);
}

function limpiarFormulario(formulario) {
    formulario.reset();

    const campoId = formulario.querySelector('input[type="hidden"]');
    if (campoId) campoId.value = "";
}


// ========================================
// MÓDULO DE MASCOTAS
// ========================================

async function cargarMascotas() {
    const { data, error } = await db
        .from("mascotas")
        .select(`
            id,
            nombre,
            especie,
            raza,
            edad,
            sexo,
            dueno_id,
            duenos (
                id,
                nombre,
                dni,
                telefono
            )
        `)
        .order("id", { ascending: false });

    if (error) {
        mostrarError(error);
        return;
    }

    registrosMascotas = data || [];
    mostrarMascotas();
    actualizarEstadisticas();
    cargarOpcionesMascotas();
}


function mostrarMascotas() {
    tablaMascotas.innerHTML = "";

    registrosMascotas.forEach(mascota => {
        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td>${mascota.id}</td>
            <td>${escaparHTML(mascota.nombre)}</td>
            <td>${escaparHTML(mascota.especie)}</td>
            <td>${escaparHTML(mascota.raza)}</td>
            <td>${escaparHTML(mascota.edad)}</td>
            <td>${escaparHTML(mascota.sexo)}</td>
            <td>${escaparHTML(mascota.duenos?.nombre)}</td>
            <td>
                <button type="button" onclick="editarMascota(${mascota.id})">Editar</button>
                <button type="button" onclick="eliminarMascota(${mascota.id})">Eliminar</button>
            </td>
        `;

        tablaMascotas.appendChild(fila);
    });
}


formularioMascota.addEventListener("submit", async function(evento) {
    evento.preventDefault();

    const id = document.getElementById("mascotaId").value;

    const nombreDueno = document.getElementById("nombreDueno").value.trim();
    const dni = document.getElementById("dni").value.trim();
    const telefono = document.getElementById("telefono").value.trim();

    const nombre = document.getElementById("nombreMascota").value.trim();
    const especie = document.getElementById("especie").value;
    const raza = document.getElementById("raza").value.trim();
    const edad = document.getElementById("edad").value;
    const sexo = document.getElementById("sexo").value;

    if (!nombreDueno || !nombre || !especie) {
        alert("Completa los campos obligatorios.");
        return;
    }

    // Buscar si el dueño ya existe por DNI
    let duenoId = null;

    if (dni) {
        const { data: duenoExistente, error: errorBusqueda } = await db
            .from("duenos")
            .select("id")
            .eq("dni", dni)
            .maybeSingle();

        if (errorBusqueda) {
            mostrarError(errorBusqueda);
            return;
        }

        if (duenoExistente) {
            duenoId = duenoExistente.id;
        }
    }

    // Crear o actualizar dueño
    if (duenoId) {
        const { error } = await db
            .from("duenos")
            .update({
                nombre: nombreDueno,
                dni: dni || null,
                telefono: telefono || null
            })
            .eq("id", duenoId);

        if (error) {
            mostrarError(error);
            return;
        }
    } else {
        const { data, error } = await db
            .from("duenos")
            .insert([{
                nombre: nombreDueno,
                dni: dni || null,
                telefono: telefono || null
            }])
            .select("id")
            .single();

        if (error) {
            mostrarError(error);
            return;
        }

        duenoId = data.id;
    }

    const datosMascota = {
        nombre,
        especie,
        raza: raza || null,
        edad: edad ? Number(edad) : null,
        sexo: sexo || null,
        dueno_id: duenoId
    };

    let resultado;

    if (id) {
        resultado = await db
            .from("mascotas")
            .update(datosMascota)
            .eq("id", id);
    } else {
        resultado = await db
            .from("mascotas")
            .insert([datosMascota]);
    }

    if (resultado.error) {
        mostrarError(resultado.error);
        return;
    }

    alert(id ? "Mascota actualizada correctamente." : "Mascota registrada correctamente.");

    limpiarFormulario(formularioMascota);
    await cargarMascotas();
});


function editarMascota(id) {
    const mascota = registrosMascotas.find(item => item.id === id);

    if (!mascota) return;

    document.getElementById("mascotaId").value = mascota.id;
    document.getElementById("nombreMascota").value = mascota.nombre || "";
    document.getElementById("especie").value = mascota.especie || "";
    document.getElementById("raza").value = mascota.raza || "";
    document.getElementById("edad").value = mascota.edad ?? "";
    document.getElementById("sexo").value = mascota.sexo || "";

    document.getElementById("nombreDueno").value = mascota.duenos?.nombre || "";
    document.getElementById("dni").value = mascota.duenos?.dni || "";
    document.getElementById("telefono").value = mascota.duenos?.telefono || "";

    document.getElementById("mascotas").scrollIntoView({ behavior: "smooth" });
}


async function eliminarMascota(id) {
    if (!confirm("¿Deseas eliminar esta mascota?")) return;

    const { error } = await db
        .from("mascotas")
        .delete()
        .eq("id", id);

    if (error) {
        mostrarError(error);
        return;
    }

    alert("Mascota eliminada correctamente.");
    await cargarMascotas();
    await cargarConsultas();
}


botonCancelarMascota.addEventListener("click", () => {
    limpiarFormulario(formularioMascota);
});


// ========================================
// MÓDULO DE VETERINARIOS
// ========================================

async function cargarVeterinarios() {
    const { data, error } = await db
        .from("veterinarios")
        .select("*")
        .order("id", { ascending: false });

    if (error) {
        mostrarError(error);
        return;
    }

    registrosVeterinarios = data || [];
    mostrarVeterinarios();
    actualizarEstadisticas();
    cargarOpcionesVeterinarios();
}


function mostrarVeterinarios() {
    tablaVeterinarios.innerHTML = "";

    registrosVeterinarios.forEach(veterinario => {
        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td>${veterinario.id}</td>
            <td>${escaparHTML(veterinario.nombre)}</td>
            <td>${escaparHTML(veterinario.dni)}</td>
            <td>${escaparHTML(veterinario.telefono)}</td>
            <td>${escaparHTML(veterinario.correo)}</td>
            <td>
                <button type="button" onclick="editarVeterinario(${veterinario.id})">Editar</button>
                <button type="button" onclick="eliminarVeterinario(${veterinario.id})">Eliminar</button>
            </td>
        `;

        tablaVeterinarios.appendChild(fila);
    });
}


formularioVeterinario.addEventListener("submit", async function(evento) {
    evento.preventDefault();

    const id = document.getElementById("veterinarioId").value;

    const datos = {
        nombre: document.getElementById("nombreVeterinario").value.trim(),
        dni: document.getElementById("dniVeterinario").value.trim() || null,
        telefono: document.getElementById("telefonoVeterinario").value.trim() || null,
        correo: document.getElementById("correoVeterinario").value.trim() || null
    };

    if (!datos.nombre) {
        alert("Ingresa el nombre del veterinario.");
        return;
    }

    let resultado;

    if (id) {
        resultado = await db
            .from("veterinarios")
            .update(datos)
            .eq("id", id);
    } else {
        resultado = await db
            .from("veterinarios")
            .insert([datos]);
    }

    if (resultado.error) {
        mostrarError(resultado.error);
        return;
    }

    alert(id ? "Veterinario actualizado correctamente." : "Veterinario registrado correctamente.");

    limpiarFormulario(formularioVeterinario);
    await cargarVeterinarios();
});


function editarVeterinario(id) {
    const veterinario = registrosVeterinarios.find(item => item.id === id);

    if (!veterinario) return;

    document.getElementById("veterinarioId").value = veterinario.id;
    document.getElementById("nombreVeterinario").value = veterinario.nombre || "";
    document.getElementById("dniVeterinario").value = veterinario.dni || "";
    document.getElementById("telefonoVeterinario").value = veterinario.telefono || "";
    document.getElementById("correoVeterinario").value = veterinario.correo || "";

    document.getElementById("veterinarios").scrollIntoView({ behavior: "smooth" });
}


async function eliminarVeterinario(id) {
    if (!confirm("¿Deseas eliminar este veterinario?")) return;

    const { error } = await db
        .from("veterinarios")
        .delete()
        .eq("id", id);

    if (error) {
        mostrarError(error);
        return;
    }

    alert("Veterinario eliminado correctamente.");
    await cargarVeterinarios();
    await cargarConsultas();
}


botonCancelarVeterinario.addEventListener("click", () => {
    limpiarFormulario(formularioVeterinario);
});


// ========================================
// MÓDULO DE CONSULTAS
// ========================================

async function cargarConsultas() {
    const { data, error } = await db
        .from("consultas")
        .select(`
            *,
            mascotas (id, nombre),
            veterinarios (id, nombre)
        `)
        .order("id", { ascending: false });

    if (error) {
        mostrarError(error);
        return;
    }

    registrosConsultas = data || [];
    mostrarConsultas();
    actualizarEstadisticas();
}


function mostrarConsultas() {
    tablaConsultas.innerHTML = "";

    registrosConsultas.forEach(consulta => {
        const fecha = consulta.fecha
            ? new Date(consulta.fecha).toLocaleString("es-PE")
            : "";

        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td>${consulta.id}</td>
            <td>${escaparHTML(consulta.mascotas?.nombre)}</td>
            <td>${escaparHTML(consulta.veterinarios?.nombre)}</td>
            <td>${escaparHTML(fecha)}</td>
            <td>${escaparHTML(consulta.diagnostico)}</td>
            <td>${escaparHTML(consulta.tratamiento)}</td>
            <td>${escaparHTML(consulta.costo)}</td>
            <td>${escaparHTML(consulta.estado)}</td>
            <td>
                <button type="button" onclick="editarConsulta(${consulta.id})">Editar</button>
                <button type="button" onclick="eliminarConsulta(${consulta.id})">Eliminar</button>
            </td>
        `;

        tablaConsultas.appendChild(fila);
    });
}


function cargarOpcionesMascotas() {
    const select = document.getElementById("mascotaConsulta");

    select.innerHTML = '<option value="">Seleccionar mascota</option>';

    registrosMascotas.forEach(mascota => {
        const opcion = document.createElement("option");
        opcion.value = mascota.id;
        opcion.textContent = mascota.nombre;
        select.appendChild(opcion);
    });
}


function cargarOpcionesVeterinarios() {
    const select = document.getElementById("veterinarioConsulta");

    select.innerHTML = '<option value="">Seleccionar veterinario</option>';

    registrosVeterinarios.forEach(veterinario => {
        const opcion = document.createElement("option");
        opcion.value = veterinario.id;
        opcion.textContent = veterinario.nombre;
        select.appendChild(opcion);
    });
}


formularioConsulta.addEventListener("submit", async function(evento) {
    evento.preventDefault();

    const id = document.getElementById("consultaId").value;

    const mascotaId = document.getElementById("mascotaConsulta").value;
    const veterinarioId = document.getElementById("veterinarioConsulta").value;

    const fecha = document.getElementById("fechaConsulta").value;
    const costo = document.getElementById("costoConsulta").value;

    const datos = {
        mascota_id: Number(mascotaId),
        veterinario_id: Number(veterinarioId),
        diagnostico: document.getElementById("diagnostico").value.trim() || null,
        tratamiento: document.getElementById("tratamiento").value.trim() || null,
        costo: costo === "" ? null : Number(costo),
        estado: document.getElementById("estadoConsulta").value
    };

    if (!mascotaId || !veterinarioId) {
        alert("Selecciona una mascota y un veterinario.");
        return;
    }

    if (fecha) {
        datos.fecha = new Date(fecha).toISOString();
    }

    let resultado;

    if (id) {
        resultado = await db
            .from("consultas")
            .update(datos)
            .eq("id", id);
    } else {
        resultado = await db
            .from("consultas")
            .insert([datos]);
    }

    if (resultado.error) {
        mostrarError(resultado.error);
        return;
    }

    alert(id ? "Consulta actualizada correctamente." : "Consulta registrada correctamente.");

    limpiarFormulario(formularioConsulta);
    await cargarConsultas();
});


function editarConsulta(id) {
    const consulta = registrosConsultas.find(item => item.id === id);

    if (!consulta) return;

    document.getElementById("consultaId").value = consulta.id;
    document.getElementById("mascotaConsulta").value = consulta.mascota_id;
    document.getElementById("veterinarioConsulta").value = consulta.veterinario_id;

    if (consulta.fecha) {
        const fecha = new Date(consulta.fecha);
        const fechaLocal = new Date(
            fecha.getTime() - fecha.getTimezoneOffset() * 60000
        ).toISOString().slice(0, 16);

        document.getElementById("fechaConsulta").value = fechaLocal;
    } else {
        document.getElementById("fechaConsulta").value = "";
    }

    document.getElementById("diagnostico").value = consulta.diagnostico || "";
    document.getElementById("tratamiento").value = consulta.tratamiento || "";
    document.getElementById("costoConsulta").value = consulta.costo ?? "";
    document.getElementById("estadoConsulta").value = consulta.estado || "Pendiente";

    document.getElementById("consultas").scrollIntoView({ behavior: "smooth" });
}


async function eliminarConsulta(id) {
    if (!confirm("¿Deseas eliminar esta consulta?")) return;

    const { error } = await db
        .from("consultas")
        .delete()
        .eq("id", id);

    if (error) {
        mostrarError(error);
        return;
    }

    alert("Consulta eliminada correctamente.");
    await cargarConsultas();
}


botonCancelarConsulta.addEventListener("click", () => {
    limpiarFormulario(formularioConsulta);
});


// ========================================
// ESTADÍSTICAS
// ========================================

function actualizarEstadisticas() {
    document.getElementById("totalMascotas").textContent =
        registrosMascotas.length;

    document.getElementById("totalVeterinarios").textContent =
        registrosVeterinarios.length;

    document.getElementById("totalConsultas").textContent =
        registrosConsultas.length;
}


// ========================================
// INICIAR SISTEMA
// ========================================

async function iniciarSistema() {
    await cargarMascotas();
    await cargarVeterinarios();
    await cargarConsultas();
}

iniciarSistema();
