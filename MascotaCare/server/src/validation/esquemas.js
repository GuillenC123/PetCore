const { campo, cadena, enumeracion, identificador, correo, password, fecha, fechaHora } = require('./reglas');

const peso = campo((valor) => typeof valor === 'number' && Number.isFinite(valor) && valor > 0,
 'Ingresa un peso mayor que cero en kg.', { nullable: true });
const diaPasado = (valor) => fecha(valor) && valor <= new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
const mascota = {
 peso,
 sexo: enumeracion(['macho', 'hembra', 'desconocido']),
 nacimiento: campo((valor) => typeof valor === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(valor)
  && diaPasado(valor.split('/').reverse().join('-')), 'Ingresa un nacimiento válido que no sea futuro.', { nullable: true }),
 alergias: cadena(1000, 0),
 condiciones: cadena(1000, 0),
  nombre: cadena(120, 2),
  raza: cadena(120),
  especie: cadena(60),
  // La edad se guarda como texto (por ejemplo, "3 años" o "6 meses").
  edad: cadena(60),
  estado: enumeracion(['saludable', 'malestar', 'vacuna_pendiente', 'en_tratamiento']),
  imagen: cadena(500, 0, { nullable: true }),
};
const cita = {
  titulo: cadena(200),
  fecha_hora: campo(fechaHora, 'Ingresa una fecha y hora ISO válida con zona horaria.'),
  doctor: cadena(200, 0, { nullable: true }),
  clinica: cadena(200, 0, { nullable: true }),
  estado: enumeracion(['confirmado', 'pendiente', 'programado', 'cancelado', 'completado']),
};
const recordatorio = {
  titulo: cadena(200),
  descripcion: cadena(300, 0, { nullable: true }),
  vence_en: campo(fecha, 'Ingresa una fecha válida con formato AAAA-MM-DD.'),
  completado: campo((valor) => typeof valor === 'boolean', 'Debe ser true o false (booleano).'),
};

module.exports = {
  registro: { nombre: cadena(120, 2), correo, password },
  login: { correo, password },
  mascota,
  peso: { peso: { ...peso, nullable: false }, fecha: campo(diaPasado, "Ingresa una fecha válida que no sea futura (AAAA-MM-DD).") },
  cita,
  crearCita: { ...cita, mascota_id: identificador },
  recordatorio,
  paramsId: { id: identificador },
  filtroCitas: { mascota_id: identificador },
  filtroRecordatorios: { solo_pendientes: enumeracion(['true', 'false']) },
};
