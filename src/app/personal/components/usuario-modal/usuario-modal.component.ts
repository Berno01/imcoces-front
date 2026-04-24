import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  UsuarioCreatePayload,
  UsuarioDetalle,
  UsuarioPersisted,
  UsuarioRol,
  UsuarioUpdatePayload,
} from '../../usuario.interfaces';
import { UsuarioService } from '../../usuario.service';

interface UsuarioFormControls {
  nombre: FormControl<string | null>;
  apellidos: FormControl<string | null>;
  num_cel: FormControl<string | null>;
  id_rol: FormControl<number | null>;
  login: FormControl<string | null>;
  password: FormControl<string | null>;
}

type UsuarioFormGroup = FormGroup<UsuarioFormControls>;

@Component({
  selector: 'app-usuario-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './usuario-modal.component.html',
})
export class UsuarioModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly usuarioService = inject(UsuarioService);

  private usuarioToEditInternal?: UsuarioDetalle;

  @Input()
  set usuarioToEdit(value: UsuarioDetalle | undefined) {
    this.usuarioToEditInternal = value;
    this.applyPasswordValidators();
    this.patchFormForEdit(value);
  }

  get usuarioToEdit(): UsuarioDetalle | undefined {
    return this.usuarioToEditInternal;
  }

  @Output('close') readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<UsuarioPersisted>();

  readonly roles = signal<UsuarioRol[]>([]);
  readonly isLoadingRoles = signal(false);
  readonly isSaving = signal(false);
  readonly showPassword = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form: UsuarioFormGroup = this.fb.group<UsuarioFormControls>({
    nombre: this.fb.control<string | null>(null, {
      validators: [Validators.required],
    }),
    apellidos: this.fb.control<string | null>(null, {
      validators: [Validators.required],
    }),
    num_cel: this.fb.control<string | null>(null, {
      validators: [Validators.required],
    }),
    id_rol: this.fb.control<number | null>(null, {
      validators: [Validators.required],
    }),
    login: this.fb.control<string | null>(null, {
      validators: [Validators.required],
    }),
    password: this.fb.control<string | null>(null, {
      validators: [],
    }),
  });

  ngOnInit(): void {
    this.loadRoles();
    this.applyPasswordValidators();

    if (this.usuarioToEditInternal) {
      this.patchFormForEdit(this.usuarioToEditInternal);
    }
  }

  close(): void {
    this.closed.emit();
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((state) => !state);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.isSaving.set(true);

    const payload = this.buildCreatePayload();
    const usuarioId = this.toNumber(this.usuarioToEditInternal?.id_usuario);

    if (usuarioId > 0) {
      const updatePayload: UsuarioUpdatePayload = {
        id_usuario: usuarioId,
        ...payload,
      };

      this.usuarioService
        .updateUsuario(updatePayload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response) => {
            this.isSaving.set(false);
            this.saved.emit(response.data);
            this.close();
          },
          error: () => {
            this.isSaving.set(false);
            this.errorMessage.set('No se pudo actualizar el usuario.');
          },
        });
      return;
    }

    this.usuarioService
      .createUsuario(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isSaving.set(false);
          this.saved.emit(response.data);
          this.close();
        },
        error: () => {
          this.isSaving.set(false);
          this.errorMessage.set('No se pudo crear el usuario.');
        },
      });
  }

  private loadRoles(): void {
    this.isLoadingRoles.set(true);

    this.usuarioService
      .loadRoles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (roles) => {
          this.roles.set(roles);
          this.isLoadingRoles.set(false);

          if (roles.length === 0 && this.usuarioService.rolesError()) {
            this.errorMessage.set(this.usuarioService.rolesError());
          }
        },
        error: () => {
          this.isLoadingRoles.set(false);
          this.errorMessage.set('No se pudo cargar el catalogo de roles.');
        },
      });
  }

  private applyPasswordValidators(): void {
    const passwordControl = this.form.controls.password;

    if (this.usuarioToEditInternal?.id_usuario) {
      passwordControl.setValidators([Validators.minLength(8)]);
    } else {
      passwordControl.setValidators([Validators.required, Validators.minLength(8)]);
    }

    passwordControl.updateValueAndValidity({ emitEvent: false });
  }

  private patchFormForEdit(usuario: UsuarioDetalle | undefined): void {
    if (!usuario) {
      this.form.reset({
        nombre: null,
        apellidos: null,
        num_cel: null,
        id_rol: null,
        login: null,
        password: null,
      });
      return;
    }

    this.form.patchValue({
      nombre: this.toText(usuario.nombre),
      apellidos: this.toText(usuario.apellidos),
      num_cel: this.toText(usuario.num_cel),
      id_rol: this.toNumber(usuario.id_rol),
      login: this.toText(usuario.login),
      // El backend no devuelve la contrasena en detalle, por eso se inicializa vacia.
      password: '',
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private buildCreatePayload(): UsuarioCreatePayload {
    return {
      nombre: this.toText(this.form.controls.nombre.value),
      apellidos: this.toText(this.form.controls.apellidos.value),
      num_cel: this.toText(this.form.controls.num_cel.value),
      id_rol: this.toNumber(this.form.controls.id_rol.value),
      login: this.toText(this.form.controls.login.value),
      password: this.toText(this.form.controls.password.value),
    };
  }

  private toText(value: string | null | undefined): string {
    if (typeof value !== 'string') {
      return '';
    }

    return value.trim();
  }

  private toNumber(value: number | null | undefined): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
