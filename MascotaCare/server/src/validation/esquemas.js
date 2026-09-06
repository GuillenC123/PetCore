const { campo, cadena, enumeracion, identificador, correo, password, fecha, fechaHora } = require('./reglas');

const mascota = {
  nombre: cadena(120, 2),
  raza: cadena(120),
  especie: cadena(60),
  // La edad se guarda como texto (por ejemplo, "3 años" o "6 meses").
  edad: cadena(60),
  estado: enumeracion(['saludable', 'vacuna_pendiente', 'en_tratamiento']),
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
  cita,
  crearCita: { ...cita, mascota_id: identificador },
  recordatorio,
  paramsId: { id: identificador },
  filtroCitas: { mascota_id: identificador },
  filtroRecordatorios: { solo_pendientes: enumeracion(['true', 'false']) },
};
