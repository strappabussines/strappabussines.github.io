// --- Datos de ejemplo precargados ---
const EXAMPLE_OWNERS = [
  { id: 1, lot: "A1", name: "Ana López", email: "ana@ejemplo.com", phone: "1122334455", altPhone: "1199887766", identified: "DNI 12345678" },
  { id: 2, lot: "B2", name: "Carlos Pérez", email: "carlos@ejemplo.com", phone: "1133445566", altPhone: "", identified: "DNI 87654321" },
  { id: 3, lot: "C3", name: "María García", email: "maria@ejemplo.com", phone: "1144556677", altPhone: "1155443322", identified: "DNI 11223344" }
];

const EXAMPLE_PAYMENTS = [
  { id: 1, ownerId: 1, month: "2025-07", amount: 15000, method: "Transferencia", fecha: "15/07/2025", receipt: "REC-001" },
  { id: 2, ownerId: 2, month: "2025-07", amount: 15000, method: "Efectivo", fecha: "20/07/2025", receipt: "REC-002" }
];

const EXPENSA_MENSUAL = 15000;
const MESES_NOMBRES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Variables globales para edición
let editingOwnerId = null;
let editingPaymentId = null;
let currentDashboardMonth = new Date().toISOString().slice(0,7);
let selectedMonths = []; // Para almacenar los meses seleccionados para pago múltiple

// --- Utilidades de almacenamiento ---
function getOwners() {
  return JSON.parse(localStorage.getItem("owners") || "[]");
}

function setOwners(owners) {
  localStorage.setItem("owners", JSON.stringify(owners));
}

function getPayments() {
  return JSON.parse(localStorage.getItem("payments") || "[]");
}

function setPayments(payments) {
  localStorage.setItem("payments", JSON.stringify(payments));
}

// --- Inicialización con datos de ejemplo ---
function preloadData() {
  if (!localStorage.getItem("owners")) setOwners(EXAMPLE_OWNERS);
  if (!localStorage.getItem("payments")) setPayments(EXAMPLE_PAYMENTS);
}

// --- Alertas animadas ---
function showAlert(msg, type = "success") {
  const alert = document.createElement("div");
  alert.className = `alert ${type}`;
  alert.textContent = msg;
  document.getElementById("alert-container").appendChild(alert);
  setTimeout(() => alert.remove(), 3000);
}

// --- Navegación entre secciones (CORREGIDO) ---
function showSection(section) {
  console.log(`Cambiando a sección: ${section}`);
  
  // Ocultar todas las secciones
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  
  // Mostrar la sección seleccionada
  const targetSection = document.getElementById(`${section}-section`);
  if (targetSection) {
    targetSection.classList.add("active");
  } else {
    console.error(`Sección no encontrada: ${section}-section`);
    return;
  }
  
  // Actualizar botones de navegación
  document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(btn => {
    const btnText = btn.textContent.toLowerCase();
    if (btnText.includes(section) || 
        (section === "dashboard" && btnText.includes("dashboard")) ||
        (section === "owners" && btnText.includes("propietarios")) ||
        (section === "payments" && btnText.includes("pagos")) ||
        (section === "reports" && btnText.includes("reportes"))) {
      btn.classList.add("active");
    }
  });
  
  // Renderizar la sección correspondiente
  switch(section) {
    case "dashboard":
      renderDashboard();
      break;
    case "owners":
      renderOwners();
      break;
    case "payments":
      renderPayments();
      break;
    case "reports":
      renderReportResult();
      break;
    default:
      console.error(`Sección desconocida: ${section}`);
  }
  
  // IMPORTANTE: Reconfigurar eventos después de renderizar
  setupFormEvents();
}

// Hacer la función global para que funcione desde el HTML
window.showSection = showSection;

// --- Dashboard ---
function renderDashboard() {
  const owners = getOwners();
  const payments = getPayments();
  const filterMonth = currentDashboardMonth;

  // Estadísticas
  const totalOwners = owners.length;
  const pagosMes = payments.filter(p => p.month === filterMonth);
  const recaudado = pagosMes.reduce((sum, p) => sum + Number(p.amount), 0);
  const pagosPendientes = owners.filter(o => !payments.some(p => p.ownerId === o.id && p.month === filterMonth)).length;
  const vencidos = owners.filter(o => {
    const lastPaid = payments.filter(p => p.ownerId === o.id).sort((a,b) => b.month.localeCompare(a.month))[0];
    return !lastPaid || lastPaid.month < filterMonth;
  }).length;

  document.getElementById("stat-owners").textContent = `Propietarios: ${totalOwners}`;
  document.getElementById("stat-pending").textContent = `Pagos Pendientes: ${pagosPendientes}`;
  document.getElementById("stat-collected").textContent = `Recaudado: $${recaudado.toLocaleString()}`;
  document.getElementById("stat-overdue").textContent = `Vencidos: ${vencidos}`;

  // Tabla resumen con orden modificado (Lote, Apellido y nombre, etc.)
  let html = `<table><tr>
    <th>Lote</th><th>Apellido y nombre</th><th>Mes</th><th>Estado</th><th>Monto</th><th>Comprobante</th>
  </tr>`;
  owners.forEach(o => {
    const pago = payments.find(p => p.ownerId === o.id && p.month === filterMonth);
    let estado = pago ? "Pagado" : "Pendiente";
    let color = pago ? "success" : "error";
    html += `<tr>
      <td>${o.lot}</td>
      <td>${o.name}</td>
      <td>${filterMonth}</td>
      <td><span class="alert ${color}" style="padding:0.3em 0.8em;font-size:0.9em;border-radius:5px">${estado}</span></td>
      <td>${pago ? "$"+pago.amount.toLocaleString() : "-"}</td>
      <td>${pago ? pago.receipt || "-" : "-"}</td>
    </tr>`;
  });
  html += `</table>`;
  document.getElementById("dashboard-table").innerHTML = html;
}

// --- Gestión de Propietarios (orden modificado) ---
function renderOwners() {
  const owners = getOwners();
  let html = `<table><tr>
    <th>Lote</th><th>Apellido y nombre</th><th>Correo electrónico</th><th>Teléfono</th><th>Teléfono alternativo</th><th>Identificado</th><th>Acciones</th>
  </tr>`;
  
  owners.forEach(o => {
    if (editingOwnerId === o.id) {
      html += `<tr>
        <td><input type="text" id="edit-lot" value="${o.lot}"></td>
        <td><input type="text" id="edit-name" value="${o.name}"></td>
        <td><input type="email" id="edit-email" value="${o.email}"></td>
        <td><input type="tel" id="edit-phone" value="${o.phone}"></td>
        <td><input type="tel" id="edit-alt-phone" value="${o.altPhone || ''}"></td>
        <td><input type="text" id="edit-identified" value="${o.identified || ''}"></td>
        <td>
          <button class="edit-btn" onclick="saveEditOwner(${o.id})">Guardar</button>
          <button class="delete-btn" onclick="cancelEditOwner()">Cancelar</button>
        </td>
      </tr>`;
    } else {
      html += `<tr>
        <td>${o.lot}</td>
        <td>${o.name}</td>
        <td>${o.email}</td>
        <td>${o.phone}</td>
        <td>${o.altPhone || "-"}</td>
        <td>${o.identified || "-"}</td>
        <td>
          <button class="edit-btn" onclick="startEditOwner(${o.id})">Modificar</button>
          <button class="delete-btn" onclick="deleteOwner(${o.id})">Eliminar</button>
        </td>
      </tr>`;
    }
  });
  html += `</table>`;
  document.getElementById("owners-table").innerHTML = html;
  updateOwnerSelect();

  if (editingOwnerId !== null) {
    const inputs = [
      document.getElementById("edit-lot"),
      document.getElementById("edit-name"),
      document.getElementById("edit-email"),
      document.getElementById("edit-phone"),
      document.getElementById("edit-alt-phone"),
      document.getElementById("edit-identified")
    ];
    inputs.forEach(input => {
      if (input) {
        input.addEventListener("keydown", function(e) {
          if (e.key === "Enter") {
            saveEditOwner(editingOwnerId);
          } else if (e.key === "Escape") {
            cancelEditOwner();
          }
        });
      }
    });
    if (inputs[0]) inputs[0].focus();
  }
}

// Funciones de edición de propietarios
window.startEditOwner = function(id) {
  editingOwnerId = id;
  renderOwners();
};

window.cancelEditOwner = function() {
  editingOwnerId = null;
  renderOwners();
};

window.saveEditOwner = function(id) {
  const lot = document.getElementById("edit-lot").value.trim();
  const name = document.getElementById("edit-name").value.trim();
  const email = document.getElementById("edit-email").value.trim();
  const phone = document.getElementById("edit-phone").value.trim();
  const altPhone = document.getElementById("edit-alt-phone").value.trim();
  const identified = document.getElementById("edit-identified").value.trim();
  
  if (!lot || !name || !email || !phone) {
    showAlert("Complete todos los campos obligatorios", "error");
    return;
  }
  
  let owners = getOwners();
  if (owners.some(o => o.lot === lot && o.id !== id)) {
    showAlert("Ya existe un propietario con ese lote", "error");
    return;
  }
  
  owners = owners.map(o => o.id === id ? { ...o, lot, name, email, phone, altPhone, identified } : o);
  setOwners(owners);
  showAlert("Propietario modificado correctamente", "success");
  editingOwnerId = null;
  renderOwners();
  renderDashboard();
  renderPayments();
};

window.deleteOwner = function(id) {
  if (confirm("¿Está seguro que desea eliminar este propietario? También se eliminarán todos sus pagos.")) {
    let owners = getOwners();
    let payments = getPayments();
    owners = owners.filter(o => o.id !== id);
    payments = payments.filter(p => p.ownerId !== id);
    setOwners(owners);
    setPayments(payments);
    showAlert("Propietario eliminado correctamente", "success");
    renderOwners();
    renderDashboard();
    renderPayments();
  }
};

// --- Actualizar select de propietarios ---
function updateOwnerSelect() {
  const owners = getOwners();
  const select = document.getElementById("payment-owner");
  if (select) {
    select.innerHTML = `<option value="">Seleccione propietario</option>`;
    owners.forEach(o => {
      select.innerHTML += `<option value="${o.id}">${o.name} (${o.lot})</option>`;
    });
  }
}

// --- Mostrar deuda anual del lote seleccionado ---
function showDebtPanel() {
  const ownerId = Number(document.getElementById("payment-owner").value);
  if (!ownerId) {
    showAlert("Seleccione un propietario primero", "error");
    return;
  }

  const owner = getOwners().find(o => o.id === ownerId);
  const payments = getPayments().filter(p => p.ownerId === ownerId);
  const currentYear = new Date().getFullYear();
  
  let html = `<h4>Lote: ${owner.lot} - ${owner.name}</h4>`;
  html += `<div class="debt-grid">`;
  
  // Generar los 12 meses del año
  for (let i = 0; i < 12; i++) {
    const monthStr = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
    const payment = payments.find(p => p.month === monthStr);
    const isPaid = !!payment;
    const status = isPaid ? 'paid' : 'pending';
    const statusText = isPaid ? 'PAGADO' : 'PENDIENTE';
    
    html += `<div class="month-card ${status}" onclick="toggleMonthSelection('${monthStr}')">
      <input type="checkbox" id="month-${monthStr}" ${isPaid ? 'disabled' : ''}>
      <strong>${MESES_NOMBRES[i]} ${currentYear}</strong><br>
      <span>${statusText}</span><br>
      <span>$${EXPENSA_MENSUAL.toLocaleString()}</span>
      ${isPaid ? `<br><small>Pagado: ${payment.fecha}</small>` : ''}
    </div>`;
  }
  
  html += `</div>`;
  document.getElementById("debt-details").innerHTML = html;
  document.getElementById("debt-panel").style.display = "block";
  selectedMonths = []; // Resetear selección
}

// --- Alternar selección de mes ---
window.toggleMonthSelection = function(monthStr) {
  const checkbox = document.getElementById(`month-${monthStr}`);
  if (!checkbox || checkbox.disabled) return; // No permitir seleccionar meses ya pagados
  
  checkbox.checked = !checkbox.checked;
  const card = checkbox.parentElement;
  
  if (checkbox.checked) {
    card.classList.add('selected');
    if (!selectedMonths.includes(monthStr)) {
      selectedMonths.push(monthStr);
    }
  } else {
    card.classList.remove('selected');
    selectedMonths = selectedMonths.filter(m => m !== monthStr);
  }
  
  console.log("Meses seleccionados:", selectedMonths);
};

// --- Registro de Pagos ---
function renderPayments() {
  updateOwnerSelect();
  const payments = getPayments();
  const owners = getOwners();
  
  let html = `<table><tr>
    <th>Propietario</th><th>Lote</th><th>Mes</th><th>Monto</th><th>Método</th><th>Fecha</th><th>Comprobante N°</th><th>Acciones</th>
  </tr>`;
  
  payments.sort((a,b) => b.month.localeCompare(a.month));
  payments.forEach(p => {
    const owner = owners.find(o => o.id === p.ownerId);
    if (editingPaymentId === p.id) {
      html += `<tr>
        <td>${owner ? owner.name : "Eliminado"}</td>
        <td>${owner ? owner.lot : "-"}</td>
        <td>${p.month}</td>
        <td>$${p.amount.toLocaleString()}</td>
        <td>${p.method}</td>
        <td>
          <input type="date" id="edit-payment-date" value="${formatDateForInput(p.fecha)}">
        </td>
        <td>${p.receipt || "-"}</td>
        <td>
          <button class="edit-btn" onclick="saveEditPayment(${p.id})">Guardar</button>
          <button class="delete-btn" onclick="cancelEditPayment()">Cancelar</button>
        </td>
      </tr>`;
    } else {
      html += `<tr>
        <td>${owner ? owner.name : "Eliminado"}</td>
        <td>${owner ? owner.lot : "-"}</td>
        <td>${p.month}</td>
        <td>$${p.amount.toLocaleString()}</td>
        <td>${p.method}</td>
        <td>${p.fecha || "-"}</td>
        <td>${p.receipt || "-"}</td>
        <td>
          <button class="edit-btn" onclick="startEditPayment(${p.id})">Editar Fecha</button>
          <button class="delete-btn" onclick="deletePayment(${p.id})">Eliminar</button>
        </td>
      </tr>`;
    }
  });
  html += `</table>`;
  document.getElementById("payments-table").innerHTML = html;

  if (editingPaymentId !== null) {
    const input = document.getElementById("edit-payment-date");
    if (input) {
      input.addEventListener("keydown", function(e) {
        if (e.key === "Enter") {
          saveEditPayment(editingPaymentId);
        } else if (e.key === "Escape") {
          cancelEditPayment();
        }
      });
      input.focus();
    }
  }
}

// Funciones de edición de pagos
window.startEditPayment = function(id) {
  editingPaymentId = id;
  renderPayments();
};

window.cancelEditPayment = function() {
  editingPaymentId = null;
  renderPayments();
};

window.saveEditPayment = function(id) {
  const input = document.getElementById("edit-payment-date");
  let fecha = input.value;
  
  if (!fecha) {
    showAlert("Debe ingresar una fecha", "error");
    return;
  }
  
  fecha = fecha.split('-').reverse().join('/');
  let payments = getPayments();
  payments = payments.map(p => p.id === id ? { ...p, fecha } : p);
  setPayments(payments);
  showAlert("Fecha actualizada correctamente", "success");
  editingPaymentId = null;
  renderPayments();
  renderReportResult();
  renderDashboard();
};

// Función para eliminar pago
window.deletePayment = function(id) {
  if (confirm("¿Está seguro que desea eliminar este pago?")) {
    let payments = getPayments();
    payments = payments.filter(p => p.id !== id);
    setPayments(payments);
    showAlert("Pago eliminado correctamente", "success");
    renderPayments();
    renderDashboard();
    renderReportResult();
  }
};

// Función para formatear fecha
function formatDateForInput(fecha) {
  if (!fecha) return "";
  const parts = fecha.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
  }
  return fecha;
}

// --- Generar PDF de pago individual ---
function generatePaymentPDF(payment, owner) {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Encabezado
    doc.setFontSize(18);
    doc.text("COMPROBANTE DE PAGO", 105, 20, { align: 'center' });
    doc.text("Barrio Privado - Expensas", 105, 30, { align: 'center' });
    
    // Línea separadora
    doc.line(20, 35, 190, 35);
    
    // Información del pago
    doc.setFontSize(12);
    doc.text("DATOS DEL PAGO:", 20, 50);
    
    doc.setFontSize(10);
    doc.text(`Lote: ${owner.lot}`, 20, 60);
    doc.text(`Propietario: ${owner.name}`, 20, 70);
    doc.text(`Email: ${owner.email}`, 20, 80);
    doc.text(`Teléfono: ${owner.phone}`, 20, 90);
    if (owner.altPhone) {
      doc.text(`Tel. Alternativo: ${owner.altPhone}`, 20, 100);
    }
    if (owner.identified) {
      doc.text(`Identificado: ${owner.identified}`, 20, 110);
    }
    
    doc.text(`Mes: ${payment.month}`, 120, 60);
    doc.text(`Monto: $${payment.amount.toLocaleString()}`, 120, 70);
    doc.text(`Método: ${payment.method}`, 120, 80);
    doc.text(`Fecha: ${payment.fecha}`, 120, 90);
    doc.text(`Comprobante N°: ${payment.receipt}`, 120, 100);
    
    // Línea separadora
    doc.line(20, 120, 190, 120);
    
    // Pie
    doc.setFontSize(8);
    doc.text(`Generado el: ${new Date().toLocaleDateString('es-AR')} a las ${new Date().toLocaleTimeString('es-AR')}`, 20, 130);
    
    // Guardar
    doc.save(`Comprobante_${payment.receipt}_${owner.name.replace(/\s+/g, '_')}.pdf`);
    
  } catch (error) {
    showAlert("Error al generar PDF del comprobante", "error");
    console.error("Error PDF:", error);
  }
}

// --- Envío automático de comprobante (simulado) ---
function sendReceiptByEmail(owner, payment) {
  // Aquí se implementaría el envío real del comprobante por email
  // Por ahora solo mostramos una alerta simulando el envío
  showAlert(`Comprobante enviado a ${owner.email}`, "success");
  console.log(`Enviando comprobante a: ${owner.email}`, { owner, payment });
}

// --- Reportes con búsqueda por lote ---
function renderReportResult() {
  const monthInput = document.getElementById("report-month");
  const lotInput = document.getElementById("report-lot");
  const month = monthInput ? monthInput.value || new Date().toISOString().slice(0,7) : new Date().toISOString().slice(0,7);
  const searchLot = lotInput ? lotInput.value.trim() : "";
  
  const owners = getOwners();
  const payments = getPayments().filter(p => p.month === month);
  
  let filteredOwners = owners;
  if (searchLot) {
    filteredOwners = owners.filter(o => o.lot.toLowerCase().includes(searchLot.toLowerCase()));
  }
  
  let html = `<h3>📊 Reporte de ${month}${searchLot ? ` - Lote: ${searchLot}` : ''}</h3>`;
  
  if (searchLot && filteredOwners.length === 1) {
    // Mostrar reporte detallado para un lote específico
    const owner = filteredOwners[0];
    const ownerPayments = getPayments().filter(p => p.ownerId === owner.id);
    const currentYear = new Date().getFullYear();
    
    html += `<div class="lot-report">
      <h4>Lote ${owner.lot} - ${owner.name}</h4>
      <div class="payment-status">
        <div class="status-column pending-column">
          <h5>Meses Pendientes</h5>
          <ul class="month-list">`;
    
    let pendingMonths = [];
    let paidMonths = [];
    
    for (let i = 0; i < 12; i++) {
      const monthStr = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
      const payment = ownerPayments.find(p => p.month === monthStr);
      
      if (payment) {
        paidMonths.push(`<li>${MESES_NOMBRES[i]} ${currentYear} - $${payment.amount.toLocaleString()} (${payment.fecha})</li>`);
      } else {
        pendingMonths.push(`<li>${MESES_NOMBRES[i]} ${currentYear} - $${EXPENSA_MENSUAL.toLocaleString()}</li>`);
      }
    }
    
    html += pendingMonths.length > 0 ? pendingMonths.join('') : '<li>No hay meses pendientes</li>';
    html += `</ul>
        </div>
        <div class="status-column paid-column">
          <h5>Meses Pagados</h5>
          <ul class="month-list">`;
    
    html += paidMonths.length > 0 ? paidMonths.join('') : '<li>No hay meses pagados</li>';
    html += `</ul>
        </div>
      </div>
    </div>`;
  } else {
    // Mostrar reporte general
    html += `<table id="report-table"><tr>
      <th>Lote</th><th>Apellido y nombre</th><th>Estado</th><th>Monto</th><th>Fecha</th><th>Comprobante</th>
    </tr>`;
    
    let totalPagado = 0, totalPendiente = 0;
    filteredOwners.forEach(o => {
      const pago = payments.find(p => p.ownerId === o.id);
      let estado, monto, fecha, comprobante;
      if (pago) {
        estado = `<span class="alert success" style="padding:0.3em 0.8em;font-size:0.9em;border-radius:5px">Pagado</span>`;
        monto = "$" + pago.amount.toLocaleString();
        fecha = pago.fecha || "-";
        comprobante = pago.receipt || "-";
        totalPagado += pago.amount;
      } else {
        estado = `<span class="alert error" style="padding:0.3em 0.8em;font-size:0.9em;border-radius:5px">Pendiente</span>`;
        monto = "-";
        fecha = "-";
        comprobante = "-";
        totalPendiente += EXPENSA_MENSUAL;
      }
      html += `<tr>
        <td>${o.lot}</td>
        <td>${o.name}</td>
        <td>${estado}</td>
        <td>${monto}</td>
        <td>${fecha}</td>
        <td>${comprobante}</td>
      </tr>`;
    });
    html += `</table>`;
    html += `<div class="stats">
      <div class="stat">💰 Total Pagado: $${totalPagado.toLocaleString()}</div>
      <div class="stat">⏳ Total Pendiente: $${totalPendiente.toLocaleString()}</div>
      <div class="stat">📈 Porcentaje Cobrado: ${filteredOwners.length > 0 ? Math.round((payments.filter(p => filteredOwners.some(o => o.id === p.ownerId)).length / filteredOwners.length) * 100) : 0}%</div>
    </div>`;
  }
  
  document.getElementById("report-result").innerHTML = html;
}

// --- Eventos de formularios (CORREGIDO) ---
function setupFormEvents() {
  console.log("Configurando eventos de formularios...");
  
  // Formulario de filtro de dashboard
  const dashboardForm = document.getElementById("dashboard-month-form");
  if (dashboardForm) {
    // Establecer mes actual por defecto
    const monthInput = document.getElementById("dashboard-month");
    if (monthInput) {
      monthInput.value = currentDashboardMonth;
    }
    
    // Remover eventos anteriores y agregar nuevo
    dashboardForm.replaceWith(dashboardForm.cloneNode(true));
    const newDashboardForm = document.getElementById("dashboard-month-form");
    newDashboardForm.addEventListener("submit", function(e) {
      e.preventDefault();
      currentDashboardMonth = document.getElementById("dashboard-month").value;
      renderDashboard();
    });
  }

  // Formulario de propietarios (orden modificado)
  const ownerForm = document.getElementById("owner-form");
  if (ownerForm) {
    // Remover eventos anteriores y agregar nuevo
    ownerForm.replaceWith(ownerForm.cloneNode(true));
    const newOwnerForm = document.getElementById("owner-form");
    newOwnerForm.addEventListener("submit", function(e) {
      e.preventDefault();
      const lot = document.getElementById("owner-lot").value.trim();
      const name = document.getElementById("owner-name").value.trim();
      const email = document.getElementById("owner-email").value.trim();
      const phone = document.getElementById("owner-phone").value.trim();
      const altPhone = document.getElementById("owner-alt-phone").value.trim();
      const identified = document.getElementById("owner-id").value.trim();
      
      if (!lot || !name || !email || !phone) {
        showAlert("Complete todos los campos obligatorios", "error");
        return;
      }
      
      let owners = getOwners();
      if (owners.some(o => o.lot === lot)) {
        showAlert("Ya existe un propietario con ese lote", "error");
        return;
      }
      
      const id = Date.now();
      owners.push({ id, lot, name, email, phone, altPhone, identified });
      setOwners(owners);
      showAlert("Propietario agregado correctamente", "success");
      this.reset();
      renderOwners();
      renderDashboard();
      renderPayments();
    });
  }

  // Botón para mostrar deuda anual
  const showDebtBtn = document.getElementById("show-debt-btn");
  if (showDebtBtn) {
    // Remover eventos anteriores y agregar nuevo
    showDebtBtn.replaceWith(showDebtBtn.cloneNode(true));
    const newShowDebtBtn = document.getElementById("show-debt-btn");
    newShowDebtBtn.addEventListener("click", showDebtPanel);
  }

  // Formulario de pagos múltiples
  const multiplePaymentForm = document.getElementById("multiple-payment-form");
  if (multiplePaymentForm) {
    // Remover eventos anteriores y agregar nuevo
    multiplePaymentForm.replaceWith(multiplePaymentForm.cloneNode(true));
    const newMultiplePaymentForm = document.getElementById("multiple-payment-form");
    newMultiplePaymentForm.addEventListener("submit", function(e) {
      e.preventDefault();
      
      if (selectedMonths.length === 0) {
        showAlert("Seleccione al menos un mes para pagar", "error");
        return;
      }
      
      const ownerId = Number(document.getElementById("payment-owner").value);
      const amount = Number(document.getElementById("payment-amount").value);
      const method = document.getElementById("payment-method").value;
      const receipt = document.getElementById("payment-receipt").value.trim();
      let fecha = document.getElementById("payment-date").value;
      
      if (!ownerId || !amount || !method || !receipt) {
        showAlert("Complete todos los campos obligatorios", "error");
        return;
      }
      
      let payments = getPayments();
      const owner = getOwners().find(o => o.id === ownerId);
      
      // Verificar que no existan pagos duplicados
      for (let month of selectedMonths) {
        if (payments.some(p => p.ownerId === ownerId && p.month === month)) {
          showAlert(`Ya existe un pago para ${month}`, "error");
          return;
        }
      }
      
      if (!fecha) {
        const hoy = new Date();
        fecha = hoy.toLocaleDateString('es-AR');
      } else {
        fecha = fecha.split('-').reverse().join('/');
      }
      
      // Registrar pagos para todos los meses seleccionados
      selectedMonths.forEach((month, index) => {
        const newPayment = { 
          id: Date.now() + index, 
          ownerId, 
          month, 
          amount, 
          method, 
          fecha, 
          receipt: `${receipt}-${index + 1}` 
        };
        payments.push(newPayment);
        
        // Generar PDF del comprobante
        generatePaymentPDF(newPayment, owner);
        
        // Enviar comprobante por email (simulado)
        sendReceiptByEmail(owner, newPayment);
      });
      
      setPayments(payments);
      showAlert(`${selectedMonths.length} pagos registrados correctamente`, "success");
      
      // Resetear formulario y ocultar panel
      this.reset();
      document.getElementById("debt-panel").style.display = "none";
      selectedMonths = [];
      
      renderPayments();
      renderDashboard();
    });
  }

  // Formulario de reportes
  const reportForm = document.getElementById("report-form");
  if (reportForm) {
    // Remover eventos anteriores y agregar nuevo
    reportForm.replaceWith(reportForm.cloneNode(true));
    const newReportForm = document.getElementById("report-form");
    newReportForm.addEventListener("submit", function(e) {
      e.preventDefault();
      renderReportResult();
    });
  }

  // Botón de PDF de pagos
  const pdfBtn = document.getElementById("download-pdf-btn");
  if (pdfBtn) {
    // Remover eventos anteriores y agregar nuevo
    pdfBtn.replaceWith(pdfBtn.cloneNode(true));
    const newPdfBtn = document.getElementById("download-pdf-btn");
    newPdfBtn.addEventListener("click", function() {
      const table = document.querySelector("#payments-table table");
      if (!table) {
        showAlert("No hay datos para exportar", "error");
        return;
      }
      
      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.text("Registro de Pagos - Barrio Privado", 14, 18);
        
        const fecha = new Date().toLocaleDateString('es-AR');
        doc.setFontSize(10);
        doc.text(`Generado el: ${fecha}`, 14, 28);

        doc.autoTable({
          html: table,
          startY: 35,
          theme: 'grid',
          headStyles: { fillColor: [45, 108, 223] },
          styles: { fontSize: 9 }
        });

        doc.save("Registro_Pagos.pdf");
        showAlert("PDF generado correctamente", "success");
      } catch (error) {
        showAlert("Error al generar PDF", "error");
        console.error("Error PDF:", error);
      }
    });
  }

  // Botón de PDF de reportes
  const reportPdfBtn = document.getElementById("download-report-pdf-btn");
  if (reportPdfBtn) {
    // Remover eventos anteriores y agregar nuevo
    reportPdfBtn.replaceWith(reportPdfBtn.cloneNode(true));
    const newReportPdfBtn = document.getElementById("download-report-pdf-btn");
    newReportPdfBtn.addEventListener("click", function() {
      const table = document.querySelector("#report-table");
      if (!table) {
        showAlert("Genere primero un reporte", "error");
        return;
      }
      
      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const monthInput = document.getElementById("report-month");
        const month = monthInput ? monthInput.value || new Date().toISOString().slice(0,7) : new Date().toISOString().slice(0,7);

        doc.setFontSize(16);
        doc.text(`Reporte Mensual - ${month}`, 14, 18);
        doc.text("Barrio Privado - Expensas", 14, 28);
        
        const fecha = new Date().toLocaleDateString('es-AR');
        doc.setFontSize(10);
        doc.text(`Generado el: ${fecha}`, 14, 38);

        doc.autoTable({
          html: table,
          startY: 45,
          theme: 'grid',
          headStyles: { fillColor: [45, 108, 223] },
          styles: { fontSize: 9 }
        });

        doc.save(`Reporte_${month}.pdf`);
        showAlert("Reporte PDF generado correctamente", "success");
      } catch (error) {
        showAlert("Error al generar PDF del reporte", "error");
        console.error("Error PDF:", error);
      }
    });
  }
  
  console.log("Eventos configurados correctamente");
}

// --- Inicialización (CORREGIDO) ---
document.addEventListener("DOMContentLoaded", function() {
  console.log("Iniciando aplicación...");
  
  try {
    preloadData();
    
    // Renderizar todas las secciones inicialmente
    renderDashboard();
    renderOwners();
    renderPayments();
    renderReportResult();
    
    // Configurar eventos
    setupFormEvents();
    
    // Mostrar dashboard por defecto
    showSection('dashboard');
    
    console.log("Aplicación iniciada correctamente");
  } catch (error) {
    console.error("Error al inicializar la aplicación:", error);
    showAlert("Error al inicializar la aplicación", "error");
  }
});