import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";


@Injectable({ providedIn: 'root' })
export class HorarioDoctorService {

  private baseUrl = `${environment.apiUrl}/horarios`;

  constructor(private http: HttpClient) {}


  getHorasDisponiblesPorFecha(
    doctorId: number,
    fecha: string
  ) {
    return this.http.get<string[]>(
      `${this.baseUrl}/horas-disponibles`,
      {
        params: {
          doctorId,
          fecha
        }
      }
    );
  }

  // 🔹 horas reales del doctor (BD)
  getHorasPorDoctor(doctorId: number): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.baseUrl}/doctor/${doctorId}`
    );
  }

  // 🔹 fechas disponibles según hora elegida
  getFechasDisponibles(
    doctorId: number,
    hora: string
  ): Observable<string[]> {

    const params = new HttpParams()
      .set('doctorId', doctorId)
      .set('hora', hora.substring(0, 5)); // "07:00"

    return this.http.get<string[]>(
      `${this.baseUrl}/fechas-disponibles`,
      { params }
    );
  }
}
