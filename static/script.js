// 1. Seleccionar el contenedor SVG (sin cambios)
const svg = d3.select("#mapa-mental"),
    width = +svg.attr("width"),
    height = +svg.attr("height");

// 2. Configurar el layout del árbol (sin cambios)
const treemap = d3.tree()
    .size([height, width - 160]);

// Función para actualizar la visualización (la crearemos ahora)
function update(source) {
    // **PALETA DE COLORES PARA SECCIONES:**
    const coloresSeccion = d3.scaleOrdinal(d3.schemeCategory10);
    // console.log("Función update() llamada. Nodo 'source':", source); // NUEVO console.log AL INICIO

    // console.log("Selección SVG inicial (svg.select('#mapa-mental')):", svg.node());

    // **ACCION 7: ASEGURAR QUE EXISTAN <g class="nodes"> y <g class="links">**
    // Verificar si el grupo 'nodes' existe, crearlo si no
    if (svg.select(".nodes").empty()) {
        svg.append("g").attr("class", "nodes");
        console.log("Grupo <g class='nodes'> creado programáticamente."); // Mensaje de log
    }
    // Verificar si el grupo 'links' existe, crearlo si no
    if (svg.select(".links").empty()) {
        svg.append("g").attr("class", "links");
        console.log("Grupo <g class='links'> creado programáticamente."); // Mensaje de log
    }

    const duration = 750; // Duración de las transiciones (animaciones)

    // Calcular el nuevo layout del árbol
    const treeData = treemap(root);
    // console.log("treeData:", treeData); // NUEVO console.log para treeData

    // Calcular nuevos nodos y enlaces
    const nodes = treeData.descendants();
    // console.log("Nodos (descendants):", nodes); // NUEVO console.log para nodes
    const links = treeData.links();
    // console.log("Enlaces (links):", links); // NUEVO console.log para links

    // Ajuste crítico: Recalcular posiciones más precisamente
    nodes.forEach(d => {
        // Limitar la profundidad horizontal para prevenir superposiciones
        d.y = d.depth * 180;  // Espaciado horizontal más controlado
    });

    // Nodos... (parte de actualización de nodos - entraremos en detalle luego)
    let node = svg.select(".nodes").selectAll(".node")
        .data(nodes, d => d.id || (d.id = Math.random())); // Añadir key única

    // console.log("Selección de nodos (antes de enter):", node); // NUEVO console.log para la selección de nodos

    // Enter nodos
    const nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${source.y0},${source.x0})`) // Posición inicial desde el nodo "fuente" de la transición
        .on("click", click); // Añadimos el event listener onclick a cada nodo7

    // Ajustes adicionales de posicionamiento
    nodeEnter.transition()
        .duration(duration)
        .attr("transform", d => `translate(${d.y},${d.x})`);

    // console.log("Selección enter de nodos:", nodeEnter); // NUEVO console.log para nodeEnter

    nodeEnter.append("circle")
        .attr("r", 10) // Radio inicial muy pequeño para la animación de "aparición"
        // MODIFICACIÓN COLOR DE RELLENO DEL CÍRCULO (POR SECCIÓN) - LÓGICA SIMPLIFICADA Y UNIFICADA CON TONO SUAVE:
        .style("fill", d => {
            if (d.depth === 0) { // Nodo raíz (Bases de Datos Notion) - blanco
                return "#fff";
            } else if (!d.children && !d._children) { // **NUEVA CONDICIÓN UNIFICADA: SI ES NODO HOJA (SIN HIJOS), TONO SUAVE DEL COLOR DEL PADRE**
                // **OBTENER TONO MÁS SUAVE DEL COLOR DEL PADRE (PARA NODOS HOJA):**
                if (d.parent && d.parent.data && d.parent.data.childrenColor) {
                    const colorPadre = d.parent.data.childrenColor;
                    const colorSuave = d3.color(colorPadre).brighter(0.7); // Ajustar brillo (0.7 es un ejemplo)
                    return colorSuave.hex(); // Devolver el color hexadecimal más suave
                } else {
                    return "#fff"; // Blanco si no hay color padre para suavizar (por si acaso)
                }
            } else if (d.depth === 1) { // Nodo de sección principal (hijo de la raíz) - COLOR DE SECCIÓN NORMAL (SI NO ES HOJA)
                let indexSeccion = -1;
                if (source.children) {
                    indexSeccion = source.children.indexOf(d);
                }
                return coloresSeccion(indexSeccion >= 0 ? indexSeccion : 0); // Color de sección normal
            }
            else { // Nodos INTERMEDIOS DENTRO de secciones (profundidad > 1, CON hijos) - HEREDAR COLOR
                return d.parent && d.parent.data && d.parent.data.childrenColor ? d.parent.data.childrenColor : "#fff"; // Herencia de color del padre
            }
        })
        // GUARDAR EL COLOR DE LA SECCIÓN EN EL NODO (PARA HERENCIA) - SE MANTIENE IGUAL:
        .each(function(d) {
            if (d.depth === 1) { // Si es un nodo de sección principal, guardar su color
                let indexSeccion = -1;
                if (source.children) {
                    indexSeccion = source.children.indexOf(d);
                }
                d.data.childrenColor = coloresSeccion(indexSeccion >= 0 ? indexSeccion : 0); // Guardar color en data para herencia
            }
        })
        .attr('cursor', 'pointer');

    nodeEnter.append("text")
        .attr("dy", "-1.2em")
        .attr("x", -10)
        .attr("text-anchor", d => d.children ? "end" : "start")
        .text(d => d.data.name)
        .style("fill-opacity", 1e-6); // Opacidad inicial muy baja para animación de "aparición"

    // Update nodos
    const nodeUpdate = nodeEnter.merge(node); // Merge enter y update selecciones

    nodeUpdate.transition() // Animación de transición al actualizar
        .duration(duration)
        .attr("transform", d => `translate(${d.y},${d.x})`); // Nueva posición

    nodeUpdate.select("circle")
        .attr("r", 10) // Radio final del círculo
        // MODIFICACIÓN COLOR DE RELLENO DEL CÍRCULO EN UPDATE (HERENCIA) - LÓGICA SIMPLIFICADA Y UNIFICADA CON TONO SUAVE:
        .style("fill", d => {
            if (d.depth === 0) { // Nodo raíz - blanco
                return "#fff";
            } else if (!d.children && !d._children) { // **NUEVA CONDICIÓN UNIFICADA: SI ES NODO HOJA (SIN HIJOS), TONO SUAVE DEL COLOR DEL PADRE - MISMA LÓGICA QUE EN nodeEnter**
                // **OBTENER TONO MÁS SUAVE DEL COLOR DEL PADRE (PARA NODOS HOJA):**
                if (d.parent && d.parent.data && d.parent.data.childrenColor) {
                    const colorPadre = d.parent.data.childrenColor;
                    const colorSuave = d3.color(colorPadre).brighter(0.7); // Ajustar brillo (0.7 es un ejemplo)
                    return colorSuave.hex(); // Devolver el color hexadecimal más suave
                } else {
                    return "#fff"; // Blanco si no hay color padre para suavizar (por si acaso)
                }
            } else if (d.depth === 1) { // Nodo de sección principal (hijo de la raíz) - COLOR DE SECCIÓN NORMAL (SI NO ES HOJA)
                // COLOR DE SECCIÓN NORMAL (PARA BASES PRINCIPALES CON HIJOS):
                return d.data.childrenColor ? d.data.childrenColor : coloresSeccion(0); // Usar color guardado o un color por defecto si no se guardó
            }
            else { // Nodos INTERMEDIOS DENTRO de secciones (profundidad > 1, CON hijos) - HEREDAR COLOR
                return d.parent && d.parent.data && d.parent.data.childrenColor ? d.parent.data.childrenColor : "#fff"; // Herencia de color del padre
            }
        })
        .attr('cursor', 'pointer');

    nodeUpdate.select("text")
        .transition() // Animación de transición al actualizar
        .duration(duration)
        .attr("fill-opacity", 1); // Opacidad final del texto


    // Exit nodos
    const nodeExit = node.exit().transition() // Animación de transición al desaparecer
        .duration(duration)
        .attr("transform", d => `translate(${d.parent.y},${d.parent.x})`) // Posición final hacia el nodo "fuente" de la transición
        .remove(); // Eliminar los nodos que ya no están en los datos

    nodeExit.select("circle")
        .attr("r", 1e-6); // Radio final muy pequeño para la animación de "desaparición"

    nodeExit.select("text")
        .style("fill-opacity", 1e-6); // Opacidad final muy baja para la animación de "desaparición"


    // Enlaces... (parte de actualización de enlaces - entraremos en detalle luego)
    let link = svg.select(".links").selectAll(".link")
        .data(links); // Key function para identificar enlaces existentes

    // console.log("Selección de enlaces (antes de enter):", link); // NUEVO console.log para la selección de enlaces


    // Enter enlaces
    const linkEnter = link.enter().append("path")
        .attr("class", "link")
        .attr('d', d3.linkHorizontal() // Forma inicial del enlace (desde el nodo "fuente")
            .x(d => source.y0)
            .y(d => source.x0));

    // console.log("Selección enter de enlaces:", linkEnter); // NUEVO console.log para linkEnter

    // Update enlaces
    const linkUpdate = linkEnter.merge(link);

    linkUpdate.transition() // Animación de transición al actualizar
        .duration(duration)
        .attr('d', d3.linkHorizontal() // Nueva forma del enlace
            .x(d => d.y)
            .y(d => d.x));


    // Exit enlaces
    const linkExit = link.exit().transition() // Animación de transición al desaparecer
        .duration(duration)
        .attr('d', d3.linkHorizontal() // Forma final del enlace (hacia el nodo "fuente")
            .x(d => d.parent.y)
            .y(d => d.parent.x))
        .remove();


    // Guardar las posiciones antiguas para la transición (animación)
    nodes.forEach(d => {
        d.x0 = d.x;
        d.y0 = d.y;
    });
}


// Función click para expandir/contraer nodos
function click(event, d) {
    d3.select(this).select("circle").style("fill", d._children ? "lightsteelblue" : "#fff"); // Cambiar color al expandir/contraer

    if (d.children) {
        d._children = d.children; // Guarda los hijos actuales en _children (para restaurarlos al expandir)
        d.children = null;        // Oculta los hijos (colapsa)
    } else {
        d.children = d._children; // Restaura los hijos desde _children (expande)
        d._children = null;       // Limpia _children
    }
    update(d); // Llama a la función de actualización de la visualización, pasando el nodo clicado como "fuente" para la animación
}



// // 3. Cargar los datos JSON y dibujar el mapa mental INICIAL
// d3.json("relaciones_data.json").then(data => {
//     console.log("**** Data RECIBIDA de relaciones_data.json: ****", data); // **NUEVO LOG - INSPECT DATA**
//     root = d3.hierarchy(data[0]); // **MODIFICACIÓN CLAVE: Pasar data[0] en lugar de data**
//     console.log("**** Estructura 'root' DESPUÉS de d3.hierarchy(): ****", root);
//     console.log("    root.children:", root.children);
//     console.log("    ANTES de root.children.forEach - root.children:", root.children);
//     console.log("    ANTES de root.children.forEach - root:", root);


//     root.x0 = height / 2;
//     root.y0 = 0;


//     if (root.children && Array.isArray(root.children)) {
//         root.children.forEach(collapse);
//     } else {
//         console.warn("root.children is undefined or not an array. Skipping collapse initial nodes.");
//     }

//     update(root);

d3.json("/api/datos").then(data => { 
    root = d3.hierarchy(data[0]);  
    update(root);
});



// Función para COLAPSAR recursivamente un nodo y sus descendientes
function collapse(d) {
    if (d.children) {
        d._children = d.children; // Guarda los hijos en _children
        d._children.forEach(collapse); // Aplica collapse recursivamente a los hijos
        d.children = null;         // Oculta los hijos
    }
}