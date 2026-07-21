import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TodoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/todos`;

  getTodos(): Observable<Todo[]> {
    return this.http.get<Todo[]>(this.apiUrl);
  }

  getTodo(id: string | number): Observable<Todo> {
    return this.http.get<Todo>(`${this.apiUrl}/${id}`);
  }

  createTodo(payload: CreateTodoPayload): Observable<Todo> {
    return this.http.post<Todo>(this.apiUrl, payload);
  }

  updateTodo(id: string | number, payload: UpdateTodoPayload): Observable<Todo> {
    return this.http.patch<Todo>(`${this.apiUrl}/${id}`, payload);
  }

  deleteTodo(id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}

export interface Todo {
  id: string | number;
  title: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateTodoPayload {
  title: string;
  isCompleted?: boolean;
}

export type UpdateTodoPayload = Partial<CreateTodoPayload>;
