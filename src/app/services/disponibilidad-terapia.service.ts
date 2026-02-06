import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DisponibilidadDoctorService {

  private baseUrl = `${environment.apiUrl}/api/terapia/disponibilidad`;

  constructor(private http: HttpClient) {}

  // 🔹 lista TODO (no lo usaremos para citas)
  listarTodo(): Observable<any[]> {
    return this.http.get<any[]>(this.baseUrl);
  }

  // 🔹 listar por mes/año (PARA CALENDARIO)
  listarPorMesAnio(mes: number, anio: number): Observable<any[]> {
    const params = new HttpParams()
      .set('mes', mes)
      .set('anio', anio);

    return this.http.get<any[]>(`${this.baseUrl}/listar`, { params });
  }

  listarPorDoctor(idDoctor: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.baseUrl}/doctor/${idDoctor}`
    );
  }

}
