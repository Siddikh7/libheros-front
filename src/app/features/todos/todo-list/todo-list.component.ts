import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
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
    MatSnackBarModule,
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
  private readonly snackBar = inject(MatSnackBar);

  todos: Todo[] = [];
  isSubmitting = false;
  readonly displayedColumns = ['title', 'status', 'actions'];
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
        this.notify('Tâche ajoutée avec succès.');
      },
      error: (err) => {
        console.error('Erreur lors de la création:', err);
        this.isSubmitting = false;
        this.notify('Erreur : Impossible de créer la tâche.', true);
      },
    });
  }

  toggleTodo(todo: Todo): void {
    const previousStatus = todo.isCompleted;
    todo.isCompleted = !todo.isCompleted;

    this.todoService.updateTodo(todo.id, { isCompleted: todo.isCompleted }).subscribe({
      next: (updatedTodo) => {
        this.todos = this.todos.map((item) => (item.id === updatedTodo.id ? updatedTodo : item));
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour:', err);
        todo.isCompleted = previousStatus;
        this.notify('Erreur de synchronisation. Statut restauré.', true);
      },
    });
  }

  deleteTodo(todoId: string | number): void {
    this.todoService.deleteTodo(todoId).subscribe({
      next: () => {
        this.todos = this.todos.filter((todo) => todo.id !== todoId);
        this.notify('Tâche supprimée.');
      },
      error: (err) => {
        console.error('Erreur lors de la suppression:', err);
        this.notify('Erreur : Impossible de supprimer la tâche.', true);
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

  private notify(message: string, isError = false): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: isError ? ['error-snackbar'] : ['success-snackbar'],
    });
  }

}
