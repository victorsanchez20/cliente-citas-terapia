import { Component, signal } from '@angular/core';
//import { RouterOutlet } from '@angular/router';
import { PacienteService } from './services/paciente.service';
import { Paciente } from './models/paciente.model';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [FormsModule, NgIf],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  dni: string = '';
  paciente?: Paciente;

  constructor(private pacienteService: PacienteService) {}

  buscarPaciente() {
    if (this.dni.length !== 8) return;

    this.pacienteService.getPacienteById(this.dni).subscribe({
      next: (data) => {
        this.paciente = data;
        console.log(data);
      },
      error: () => {
        this.dni = '';
        this.paciente = undefined;
        alert('Paciente no encontrado');
      }
    });
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

}
