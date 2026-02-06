import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Terapista } from '../models/terapista.model';

@Injectable({
  providedIn: 'root',
})
export class TerapistaService {
  
  private url = `${environment.apiUrl}/api/terapia/doctor`;

  constructor(private http: HttpClient) { }

  getTerapista() {
    return this.http.get<Terapista[]>(this.url);
  }
}
