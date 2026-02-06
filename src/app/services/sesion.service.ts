import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SesionService {

  private baseUrl = `${environment.apiUrl}/api/sesiones`;

  constructor(private http: HttpClient) {}

  getHorasDisponibles(
    idTerapista: number,
    fecha: string
  ): Observable<string[]> {

    const params = new HttpParams()
      .set('terapista', idTerapista)
      .set('fecha', fecha);

    return this.http.get<string[]>(
      `${this.baseUrl}/horas-disponibles`,
      { params }
    );
  }
}
