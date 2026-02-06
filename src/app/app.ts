import { ChangeDetectorRef, Component, signal } from '@angular/core';
import { PacienteService } from './services/paciente.service';
import { Paciente } from './models/paciente.model';
import { FormsModule } from '@angular/forms';
import { NgIf, NgForOf, NgFor, JsonPipe, NgClass, DatePipe } from '@angular/common';
import { TerapistaService } from './services/terapista.service';
import { Terapista } from './models/terapista.model';
import { SesionService } from './services/sesion.service';
import { HorarioDoctorService } from './services/horario-doctor.service';
import { DisponibilidadDoctorService } from './services/disponibilidad-terapia.service';
import { CitaService } from './services/cita.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';


@Component({
  selector: 'app-root',
  imports: [FormsModule, NgIf, NgForOf],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {

  // RAW de disponibilidad del doctor seleccionado
 disponibilidadRaw: { fecha: string; hora: string; idDoctor: number; idTurno: number; id_turno: {
    hora_inicio: string;
    hora_fin: string;
    codigo: 'M1' | 'T1' | 'MT1';
  };}[] = [];


  dni: string = '';
  paciente?: Paciente;
  terapistas: Terapista[] = [];

  step: 1 | 2 | 3 = 1;

  doctorSeleccionado: number | null = null;

  fechasDisponibles: string[] = [];
  fechaSeleccionada: string | null = null;

  terapistaSeleccionado?: Terapista;

  horasDisponibles: string[] = [];
  horaSeleccionada?: string;
  horasDoctor: string[] = [];

  citasExistentes: any[] = [];

  diasDisponibles: string[] = [];
  diaSeleccionado?: string;

  diasVista: string[] = [];

  constructor(
    private pacienteService: PacienteService,
    private terapistaService: TerapistaService,
    private horarioDoctorService: HorarioDoctorService,
    private disponibilidadService: DisponibilidadDoctorService,
    private citaService: CitaService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {
    this.cargarTerapistas();
  }

  buscarPaciente() {
    if (this.dni.length !== 8) return;

    this.pacienteService.getPacienteById(this.dni).subscribe({
      next: (data) => {
        if (data && data.id) {
          const pacienteId = data.id;

          // 1. Usamos el nuevo endpoint específico para este paciente
          this.http.get<any[]>(`${environment.apiUrl}/api/terapia/sesion/paciente/${pacienteId}`).subscribe({
            next: (sesiones) => {
              const hoy = new Date();
              // Normalizamos hoy a las 00:00:00 para comparar solo el día (hoy es 5 de febrero)
              const hoyTime = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
              
              let tieneCitaVigente = false;
              let fechaBloqueo = "";

              sesiones.forEach(s => {
                if (s.fecha) {
                  // Según tu JSON, la fecha viene como "2026-02-18T08:00:00"
                  const fechaSesion = new Date(s.fecha);
                  // Normalizamos la fecha de la sesión a las 00:00:00 para la comparación
                  const fechaSesionTime = new Date(fechaSesion.getFullYear(), fechaSesion.getMonth(), fechaSesion.getDate()).getTime();

                  // 2. Si la sesión es hoy o en el futuro (ej. 18, 21 o 27 de febrero)
                  if (fechaSesionTime >= hoyTime) {
                    tieneCitaVigente = true;
                    fechaBloqueo = s.fecha.split('T')[0]; // Guardamos "YYYY-MM-DD" para el aviso
                  }
                }
              });

              if (tieneCitaVigente) {
                alert(`🚫 BLOQUEO: El paciente ya tiene sesiones programadas. La próxima es el ${fechaBloqueo}. No puede solicitar una nueva cita hasta finalizar las actuales.`);
                this.limpiar();
              } else {
                this.paciente = data;
                this.step = 2;
              }
            },
            error: (err) => {
              console.error('Error al consultar sesiones:', err);
              // Si hay error (ej. 404 porque no tiene sesiones), lo dejamos pasar
              this.paciente = data;
              this.step = 2;
            }
          });
        }
      },
      error: () => {
        alert('Paciente no encontrado');
        this.limpiar();
      }
    });
  }

  cargarTerapistas() {
    this.terapistaService.getTerapista().subscribe({
      next: (data) => {
        this.terapistas = data.map(t => ({
          ...t,
        }));

        this.cdr.detectChanges();
      },
      error: () => {
        alert('Error al cargar los datos');
      }
    })
  }

  siguiente() {
    if (this.step < 3) this.step++;
  }

  anterior() {
    if (this.step > 1) this.step--;
  }

  limpiar() {
    this.dni = '';
    this.paciente = undefined;
  }

  agregarNumero(num: string) {
    if (this.dni.length < 8) {
      this.dni += num;
    }
  }

  borrar() {
    this.dni = this.dni.slice(0, -1);
  }

  filtrarHorasPorTurno(horas: string[], turno: string): string[] {
    return horas.filter(h => {
      const hora = parseInt(h.split(':')[0], 10);

      if (turno === 'M') return hora >= 7 && hora < 13;
      if (turno === 'T') return hora >= 13 && hora < 19;
      if (turno === 'MT') return hora >= 7 && hora < 19;

      return false;
    });
  }

  // 1. Asegúrate de tener inyectado un servicio para sesiones o usa el de cita si ya tiene el método
  seleccionarTerapista(t: Terapista) {
    if (!t.id) return;
    this.terapistaSeleccionado = t;
    this.horaSeleccionada = undefined;
    this.diasVista = [];

    // A. Cargar disponibilidad del doctor (lo que ya tenías)
    this.disponibilidadService.listarPorDoctor(t.id).subscribe(data => {
      const hoyISO = new Date().toISOString().substring(0, 10);
      this.disponibilidadRaw = data.filter(d => d.fecha >= hoyISO);
    });

    // B. NUEVO: Cargar TODAS las sesiones del sistema para evitar el choque global
    this.http.get<any[]>(`${environment.apiUrl}/api/terapia/sesion`).subscribe(sesiones => {
      // Guardamos todas las sesiones existentes en el sistema
      this.citasExistentes = sesiones; 

      // C. Cargar las horas maestras del doctor
      this.horarioDoctorService.getHorasPorDoctor(t.id!).subscribe(horas => {
        this.horasDoctor = horas;
        this.cdr.detectChanges();
      });
    });
  }

  verificarSiHoraTieneDisponibilidad(hora: string): boolean {
    if (!this.disponibilidadRaw || this.disponibilidadRaw.length === 0) return false;

    const tiempoSeleccionado = this.convertirAMinutos(hora);

    // Solo es "disponible" si existe AL MENOS una fecha en la que el doctor
    // trabaje en ese rango Y no tenga cita agendada.
    return this.disponibilidadRaw.some(d => {
      // 1. ¿El doctor trabaja a esta hora ese día?
      const [hIni, mIni] = d.id_turno.hora_inicio.split(':').map(Number);
      const [hFin, mFin] = d.id_turno.hora_fin.split(':').map(Number);
      const estaEnTurno = tiempoSeleccionado >= (hIni * 60 + mIni) && tiempoSeleccionado < (hFin * 60 + mFin);
      
      if (!estaEnTurno) return false;

      // 2. ¿Hay alguna cita grabada que coincida EXACTAMENTE con este doctor, fecha y hora?
      const ocupada = this.citasExistentes.some(cita => 
        cita.sesiones?.some((s: any) => {
          // Normalizamos las fechas para comparar (YYYY-MM-DD)
          const fSesion = s.fecha.split(' ')[0]; 
          const hSesionStr = s.fecha.split(' ')[1]; // HH:mm:ss
          const tiempoOcupado = this.convertirAMinutos(hSesionStr);

          // Si es el mismo día y la misma hora (o diferencia < 30 min)
          return fSesion === d.fecha && Math.abs(tiempoOcupado - tiempoSeleccionado) < 30;
        })
      );
      
      return !ocupada; // Retorna true si el día está libre
    });
  }

  private convertirAMinutos(horaStr: string): number {
    const [h, m] = horaStr.split(':').map(Number);
    return h * 60 + m;
  }

  buscarFechasDisponibles() {
    if (!this.terapistaSeleccionado?.id || !this.horaSeleccionada) return;

    const dias: string[] = [];
    const hoy = new Date();
    let offset = 0;

    while (dias.length < 7) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + offset);

      const fechaISO = fecha.toISOString().substring(0, 10);

      this.horarioDoctorService
        .getHorasDisponiblesPorFecha(
          this.terapistaSeleccionado.id,
          fechaISO
        )
        .subscribe(horas => {
          if (horas.includes(this.horaSeleccionada!)) {
            dias.push(
              fecha.toLocaleDateString('es-PE', {
                weekday: 'long',
                day: '2-digit',
                month: '2-digit'
              })
            );
            this.diasVista = [...dias];
            this.cdr.detectChanges();
          }
        });
        console.log(this.diasVista);

      offset++;
    }
  }

  seleccionarHora(hora: string) {
    this.horaSeleccionada = hora;
    const tiempoSeleccionado = this.convertirAMinutos(hora);

    // Filtramos la disponibilidad
    const fechasValidas = this.disponibilidadRaw.filter(d => {
      // ¿El doctor trabaja a esta hora?
      const [hIni, mIni] = d.id_turno.hora_inicio.split(':').map(Number);
      const [hFin, mFin] = d.id_turno.hora_fin.split(':').map(Number);
      const enTurno = tiempoSeleccionado >= (hIni * 60 + mIni) && tiempoSeleccionado < (hFin * 60 + mFin);
      if (!enTurno) return false;

      // ¿Esta fecha y hora ya están en el sistema (en cualquier cita/doctor)?
      const yaExisteEnBD = this.citasExistentes.some(s => {
        // Tu Sesion.java devuelve 'fecha' (LocalDateTime)
        // Lo normalizamos para comparar: YYYY-MM-DD y HH:mm
        const fSesion = s.fecha.split('T')[0];
        const hSesion = s.fecha.split('T')[1].substring(0, 5);
        
        return fSesion === d.fecha && hSesion === hora;
      });

      return !yaExisteEnBD; // Si ya existe, se elimina de la lista
    });

    // Solo mostramos los días que sobrevivieron al filtro
    this.diasVista = fechasValidas.map(d => this.formatearFecha(d.fecha)).slice(0, 8);
    this.cdr.detectChanges();
  }

  cargarFechasDisponibles() {
    if (!this.doctorSeleccionado) return;

    const hoy = new Date();
    const mes = hoy.getMonth() + 1;
    const anio = hoy.getFullYear();

    this.disponibilidadService
      .listarPorMesAnio(mes, anio)
      .subscribe(data => {

        const fechas = data
          .filter(d => d.idDoctor === this.doctorSeleccionado)
          .map(d => d.fecha);

        // eliminar duplicados
        this.fechasDisponibles = [...new Set(fechas)];
      });
  }

  formatearFecha(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-');

    const f = new Date(
      Number(anio),
      Number(mes) - 1,
      Number(dia)
    );

    return f.toLocaleDateString('es-PE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit'
    });
  }

  guardarCita() {

    if (!this.paciente || !this.terapistaSeleccionado || !this.horaSeleccionada) {
      alert('Faltan datos');
      return;
    }

    // VALIDACIÓN DE EMERGENCIA
    if (this.diasVista.length === 0) {
      alert('No hay fechas disponibles para este horario. Por favor elija otra hora.');
      return;
    }

    const sesiones = this.diasVista.map((dia, index) => {
      const fechaISO = this.obtenerFechaISO(dia);

      return {
        numero_sesion: index + 1,
        fecha: `${fechaISO} ${this.horaSeleccionada}:00`,
        estado: 1
      };
    });

    const payload = {
      paciente: this.paciente.id,
      doctor: this.terapistaSeleccionado.id,
      fecha_creacion: new Date().toISOString().substring(0, 10),
      numero_cita: sesiones.length,
      sesiones: sesiones
    };

    console.log('📦 Enviando cita:', payload);

    this.citaService.crearCita(payload).subscribe({
      next: () => {
        this.step = 1;
        this.limpiar();
      },
      error: err => {
        console.error(err);
        alert('❌ Error al guardar la cita');
      }
    });
  }

  obtenerFechaISO(texto: string): string {
    const partes = texto.match(/(\d{2})\/(\d{2})/);
    if (!partes) throw new Error('Fecha inválida');

    const dia = partes[1];
    const mes = partes[2];
    const anio = new Date().getFullYear();

    return `${anio}-${mes}-${dia}`;
  }


  fechaActual: string = new Date().toLocaleDateString('es-PE');
  mostrarModalConfirmacion = false;
  limpiarTodo() {
    this.dni = '';
    this.paciente = undefined;
    this.terapistaSeleccionado = undefined;
    this.horaSeleccionada = undefined;
    this.diasVista = [];
    this.disponibilidadRaw = [];
    this.citasExistentes = [];
  }
  confirmarGuardado() {
    this.mostrarModalConfirmacion = true;
  }
  ejecutarGuardado() {
    if (!this.paciente || !this.terapistaSeleccionado || !this.horaSeleccionada) return;

    const sesiones = this.diasVista.map((dia, index) => {
      const fechaISO = this.obtenerFechaISO(dia);
      return {
        numero_sesion: index + 1,
        fecha: `${fechaISO} ${this.horaSeleccionada}:00`,
        estado: 1
      };
    });

    const payload = {
      paciente: this.paciente.id,
      doctor: this.terapistaSeleccionado.id,
      fecha_creacion: new Date().toISOString().substring(0, 10),
      numero_cita: sesiones.length,
      sesiones: sesiones
    };

    this.citaService.crearCita(payload).subscribe({
      next: () => {
        // 1. Cerramos el modal
        this.mostrarModalConfirmacion = false;
        
        // 2. Limpiamos y volvemos al paso 1
        this.step = 1;
        this.limpiar();
        
        // 3. Reseteamos selecciones anteriores
        this.terapistaSeleccionado = undefined;
        this.horaSeleccionada = undefined;
        this.diasVista = [];

        // 4. 🔥 ESTA ES LA CLAVE: Forzamos a Angular a actualizar la pantalla AHORA
        this.cdr.detectChanges(); 

        alert('✅ Cita registrada correctamente');
      },
      error: err => {
        console.error(err);
        alert('❌ Error al guardar la cita');
      }
    });
  }
  cerrarModal() {
    this.mostrarModalConfirmacion = false;
  }
}