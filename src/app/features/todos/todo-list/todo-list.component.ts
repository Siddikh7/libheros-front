import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { Todo, TodoService } from '../services/todo.service';
import { AuthService } from '../../../core/auth/auth.service';
import {
  ConfirmDeleteDialogComponent,
  ConfirmDeleteDialogData,
} from './confirm-delete-dialog.component';

type TodoFilter = 'all' | 'pending' | 'completed';
type TodoSortOrder = 'desc' | 'asc';

@Component({
  selector: 'app-todo-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatCheckboxModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
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
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly todos = signal<Todo[]>([]);
  readonly selectedFilter = signal<TodoFilter>('all');
  readonly searchTerm = signal('');
  readonly sortOrder = signal<TodoSortOrder>('desc');
  readonly editingTodoId = signal<Todo['id'] | null>(null);
  readonly filteredTodos = computed(() => {
    const filter = this.selectedFilter();
    const query = this.searchTerm().trim().toLowerCase();
    const sortOrder = this.sortOrder();
    const todos = this.todos();

    const filtered = todos
      .filter((todo) => {
        if (filter === 'pending' && todo.isCompleted) {
          return false;
        }

        if (filter === 'completed' && !todo.isCompleted) {
          return false;
        }

        if (!query) {
          return true;
        }

        return todo.title.toLowerCase().includes(query);
      })
      .slice();

    return filtered.sort((left, right) => {
      const leftDate = new Date(left.createdAt).getTime();
      const rightDate = new Date(right.createdAt).getTime();

      return sortOrder === 'desc' ? rightDate - leftDate : leftDate - rightDate;
    });
  });
  isSubmitting = false;
  readonly displayedColumns = ['title', 'createdAt', 'status', 'actions'];
  readonly editingTitle = this.fb.nonNullable.control('', [Validators.required, Validators.minLength(3)]);
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
        this.todos.update((currentTodos) => [...currentTodos, newTask]);
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
    const previousTodos = this.todos().map((item) => ({ ...item }));
    const nextStatus = !todo.isCompleted;

    this.todos.update((currentTodos) =>
      currentTodos.map((item) =>
        item.id === todo.id ? { ...item, isCompleted: nextStatus } : item,
      ),
    );

    this.todoService.updateTodo(todo.id, { isCompleted: nextStatus }).subscribe({
      next: (updatedTodo) => {
        this.todos.update((currentTodos) =>
          currentTodos.map((item) => (item.id === updatedTodo.id ? updatedTodo : item)),
        );
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour:', err);
        this.todos.set(previousTodos);
        this.notify('Erreur de synchronisation. Statut restauré.', true);
      },
    });
  }

  setFilter(filter: TodoFilter): void {
    this.selectedFilter.set(filter);
  }

  setSearchTerm(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.searchTerm.set(value);
  }

  setSortOrder(order: TodoSortOrder): void {
    this.sortOrder.set(order);
  }

  startEdit(todo: Todo): void {
    this.editingTodoId.set(todo.id);
    this.editingTitle.setValue(todo.title);
    this.editingTitle.markAsPristine();
    this.editingTitle.markAsUntouched();
  }

  cancelEdit(): void {
    this.editingTodoId.set(null);
    this.editingTitle.reset('');
  }

  saveEdit(todo: Todo): void {
    if (this.editingTitle.invalid) {
      this.editingTitle.markAsTouched();
      return;
    }

    const title = this.editingTitle.getRawValue().trim();
    if (title === todo.title) {
      this.cancelEdit();
      return;
    }

    this.todoService.updateTodo(todo.id, { title }).subscribe({
      next: (updatedTodo) => {
        this.todos.update((currentTodos) =>
          currentTodos.map((item) => (item.id === updatedTodo.id ? updatedTodo : item)),
        );
        this.cancelEdit();
        this.notify('Titre mis à jour avec succès.');
      },
      error: (err) => {
        console.error('Erreur lors de la modification du titre:', err);
        this.notify('Erreur : impossible de modifier le titre.', true);
      },
    });
  }

  confirmDelete(todo: Todo): void {
    const dialogData: ConfirmDeleteDialogData = {
      title: todo.title,
    };

    this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '420px',
      data: dialogData,
      disableClose: true,
    }).afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.deleteTodo(todo.id);
      }
    });
  }

  private deleteTodo(todoId: string | number): void {
    this.todoService.deleteTodo(todoId).subscribe({
      next: () => {
        this.todos.update((currentTodos) => currentTodos.filter((todo) => todo.id !== todoId));
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
        this.todos.set(todos);
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
