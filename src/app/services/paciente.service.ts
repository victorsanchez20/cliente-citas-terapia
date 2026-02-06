import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Paciente } from '../models/paciente.model';
import { environment } from '../../environments/environment';



@Injectable({
  providedIn: 'root',
})
export class PacienteService {

  private url = `${environment.apiUrl}/api/terapia/paciente`;

  constructor(private http: HttpClient) { }

  getPacienteById(dni: string) {
    return this.http.get<Paciente>(`${this.url}/${dni}`);
  }
}