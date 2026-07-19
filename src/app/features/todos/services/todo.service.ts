import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TodoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/todos';

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
  completed: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTodoPayload {
  title: string;
  completed?: boolean;
}

export type UpdateTodoPayload = Partial<CreateTodoPayload>;
