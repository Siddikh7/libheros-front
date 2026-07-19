import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { Todo, TodoService } from '../services/todo.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-todo-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatCheckboxModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
  ],
  templateUrl: './todo-list.component.html',
  styleUrl: './todo-list.component.scss'
})
export class TodoListComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly todoService = inject(TodoService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  todos: Todo[] = [];
  isSubmitting = false;
  readonly displayedColumns = ['title', 'completed', 'actions'];
  readonly todoForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
  });

  ngOnInit(): void {
    this.loadTodos();
  }

  addTodo(): void {
    if (this.todoForm.invalid) {
      this.todoForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const { title } = this.todoForm.getRawValue();

    this.todoService.createTodo({ title }).subscribe({
      next: (newTask) => {
        this.todos = [...this.todos, newTask];
        this.todoForm.reset();
        this.isSubmitting = false;
      },
      error: (err) => {
        console.error('Erreur lors de la création:', err);
        this.isSubmitting = false;
      },
    });
  }

  toggleTodo(todo: Todo): void {
    const previousStatus = todo.completed;
    todo.completed = !todo.completed;

    this.todoService.updateTodo(todo.id, { completed: todo.completed }).subscribe({
      next: (updatedTodo) => {
        this.todos = this.todos.map((item) => (item.id === updatedTodo.id ? updatedTodo : item));
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour:', err);
        todo.completed = previousStatus;
      },
    });
  }

  deleteTodo(todoId: string | number): void {
    this.todoService.deleteTodo(todoId).subscribe({
      next: () => {
        this.todos = this.todos.filter((todo) => todo.id !== todoId);
      },
      error: (err) => {
        console.error('Erreur lors de la suppression:', err);
      },
    });
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }

  trackByTodoId(_index: number, todo: Todo): string | number {
    return todo.id;
  }

  private loadTodos(): void {
    this.todoService.getTodos().subscribe({
      next: (todos) => {
        this.todos = todos;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des tâches:', err);
      },
    });
  }

}
