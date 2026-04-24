import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { UsuarioModalComponent } from './components/usuario-modal/usuario-modal.component';
import { UsuarioDetalle, UsuarioResumen } from './usuario.interfaces';
import { UsuarioService } from './usuario.service';

@Component({
  selector: 'app-usuario-list',
  standalone: true,
  imports: [UsuarioModalComponent],
  templateUrl: './usuario-list.component.html',
})
export class UsuarioListComponent implements OnInit {
  private readonly usuarioService = inject(UsuarioService);
  private readonly destroyRef = inject(DestroyRef);

  readonly usuarios = signal<UsuarioResumen[]>([]);
  readonly searchTerm = signal('');
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly isModalOpen = signal(false);
  readonly selectedUsuario = signal<UsuarioDetalle | undefined>(undefined);

  readonly openActionMenuUsuarioId = signal<number | null>(null);
  readonly loadingDetalleUsuarioId = signal<number | null>(null);
  readonly deletingUsuarioIds = signal<Set<number>>(new Set<number>());

  readonly filteredUsuarios = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return this.usuarios();
    }

    return this.usuarios().filter((usuario) => {
      const nombre = this.toText(usuario.nombre).toLowerCase();
      const nombreRol = this.toText(usuario.nombre_rol).toLowerCase();
      const idUsuario = String(this.toNumber(usuario.id_usuario));

      return nombre.includes(term) || nombreRol.includes(term) || idUsuario.includes(term);
    });
  });

  readonly totalRegistros = computed(() => this.usuarios().length);
  readonly totalFiltrados = computed(() => this.filteredUsuarios().length);

  ngOnInit(): void {
    this.loadUsuarios();
  }

  loadUsuarios(): void {
    this.errorMessage.set(null);
    this.isLoading.set(true);

    this.usuarioService
      .getUsuarios()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.usuarios.set(response.data ?? []);
          this.openActionMenuUsuarioId.set(null);
        },
        error: () => {
          this.usuarios.set([]);
          this.openActionMenuUsuarioId.set(null);
          this.errorMessage.set('No se pudo cargar el listado de personal.');
        },
      });
  }

  onSearchInput(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    this.searchTerm.set(input.value);
    this.openActionMenuUsuarioId.set(null);
  }

  openCreateModal(): void {
    this.selectedUsuario.set(undefined);
    this.isModalOpen.set(true);
    this.openActionMenuUsuarioId.set(null);
  }

  openEditModal(usuario: UsuarioResumen): void {
    const idUsuario = this.toNumber(usuario.id_usuario);
    if (idUsuario <= 0) {
      return;
    }

    this.openActionMenuUsuarioId.set(null);
    this.errorMessage.set(null);
    this.loadingDetalleUsuarioId.set(idUsuario);

    this.usuarioService
      .getUsuarioDetalle(idUsuario)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingDetalleUsuarioId.set(null)),
      )
      .subscribe({
        next: (response) => {
          this.selectedUsuario.set(response.data);
          this.isModalOpen.set(true);
        },
        error: () => {
          this.errorMessage.set('No se pudo cargar el detalle del usuario.');
        },
      });
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedUsuario.set(undefined);
  }

  handleSaved(): void {
    this.closeModal();
    this.loadUsuarios();
  }

  toggleActionMenu(idUsuario: number): void {
    const current = this.openActionMenuUsuarioId();
    this.openActionMenuUsuarioId.set(current === idUsuario ? null : idUsuario);
  }

  isActionMenuOpen(idUsuario: number): boolean {
    return this.openActionMenuUsuarioId() === idUsuario;
  }

  isDetalleLoading(idUsuario: number): boolean {
    return this.loadingDetalleUsuarioId() === idUsuario;
  }

  isDeleting(idUsuario: number): boolean {
    return this.deletingUsuarioIds().has(idUsuario);
  }

  deleteUsuario(usuario: UsuarioResumen): void {
    const idUsuario = this.toNumber(usuario.id_usuario);
    if (idUsuario <= 0 || this.isDeleting(idUsuario)) {
      return;
    }

    this.openActionMenuUsuarioId.set(null);

    const nombre = this.toText(usuario.nombre) || `ID ${idUsuario}`;
    const confirmed = window.confirm(`Se desactivara el usuario ${nombre}. Desea continuar?`);

    if (!confirmed) {
      return;
    }

    this.errorMessage.set(null);
    this.deletingUsuarioIds.update((current) => {
      const next = new Set(current);
      next.add(idUsuario);
      return next;
    });

    this.usuarioService
      .desactivarUsuario(idUsuario)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.deletingUsuarioIds.update((current) => {
            const next = new Set(current);
            next.delete(idUsuario);
            return next;
          });
        }),
      )
      .subscribe({
        next: () => {
          this.loadUsuarios();
        },
        error: () => {
          this.errorMessage.set('No se pudo desactivar el usuario.');
        },
      });
  }

  getObrasActivasPlaceholder(): string {
    return '-';
  }

  getDisplayValue(value: string | null | undefined): string {
    const normalized = this.toText(value);
    return normalized || '-';
  }

  trackByUsuario(index: number, usuario: UsuarioResumen): number | string {
    return usuario.id_usuario ?? `${usuario.nombre}-${index}`;
  }

  private toNumber(value: number | string | null | undefined): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toText(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }

    return value.trim();
  }
}
