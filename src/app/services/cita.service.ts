import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class CitaService {

  private api = `${environment.apiUrl}/api/terapia/cita`;

  constructor(private http: HttpClient) {}

  crearCita(payload: any) {
    return this.http.post(this.api, payload);
  }

   getCitasByDoctor(doctorId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/doctor/${doctorId}`);
  }
  
    listarPorPaciente(idPaciente: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/paciente/${idPaciente}`);
  }
}