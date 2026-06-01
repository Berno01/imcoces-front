import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthSessionService } from '../auth/auth-session.service';
import { SucursalService } from '../shared/sucursal/sucursal.service';

type SidebarIcon = 'dashboard' | 'inventory' | 'pos' | 'works' | 'people' | 'logout';

interface SidebarItem {
  id: string;
  label: string;
  route: string;
  icon: SidebarIcon;
}

interface SidebarChild {
  label: string;
  route: string;
}

interface SidebarSection extends SidebarItem {
  children: SidebarChild[];
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './layout.component.html',
})
export class LayoutComponent {
  private readonly router = inject(Router);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly sucursalService = inject(SucursalService);

  isSidebarExpanded = false;
  openSectionId: string | null = null;

  readonly sucursalOptions = computed(() => this.sucursalService.sucursales());
  readonly selectedSucursalId = computed(() => this.sucursalService.selectedSucursalId() ?? 0);
  readonly isBranchLoading = computed(() => this.sucursalService.loading());

  get userName(): string {
    const usuario = this.authSessionService.usuario();
    if (!usuario) {
      return 'Usuario';
    }

    const nombres =
      this.toText(usuario['nombres']) ??
      this.toText(usuario['nombre']) ??
      this.toText(usuario['login']);
    const apellidos = this.toText(usuario['apellidos']) ?? this.toText(usuario['apellido']);

    if (nombres && apellidos) {
      return `${nombres} ${apellidos}`;
    }

    if (nombres) {
      return nombres;
    }

    return 'Usuario';
  }

  get userRole(): string {
    const roleId = this.authSessionService.idRol();

    if (roleId === 1) {
      return 'Administrador';
    }

    if (roleId === 2) {
      return 'Supervisor';
    }

    if (roleId) {
      return `Rol ${roleId}`;
    }

    return 'Sin rol';
  }

  get userInitials(): string {
    const parts = this.userName
      .split(' ')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (parts.length === 0) {
      return 'US';
    }

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  get isLogoutLoading(): boolean {
    return this.authSessionService.isLogoutLoading();
  }

  get isRefreshLoading(): boolean {
    return this.authSessionService.isRefreshLoading();
  }

  readonly iconPaths: Record<SidebarIcon, string> = {
    dashboard:
      'M3.75 3h16.5v16.5H3.75V3Zm1.5 1.5v6h6v-6h-6Zm7.5 0v6h6v-6h-6Zm-7.5 7.5v6h6v-6h-6Zm7.5 0v6h6v-6h-6Z',
    inventory: 'M3 7.5 12 3l9 4.5-9 4.5L3 7.5Zm0 4.5 9 4.5 9-4.5M3 16.5 12 21l9-4.5',
    pos: 'M3.75 6.75h16.5M6.75 3.75v3m10.5-3v3M5.25 9.75h13.5a1.5 1.5 0 0 1 1.5 1.5v6a3 3 0 0 1-3 3h-10.5a3 3 0 0 1-3-3v-6a1.5 1.5 0 0 1 1.5-1.5Zm3 3.75h7.5',
    works:
      'M3.75 21h16.5M6.75 21V6.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75V21m0-9.75h4.5a.75.75 0 0 1 .75.75V21M9 10.5h1.5m-1.5 3h1.5',
    people:
      'M16.5 18.75v-1.5a4.5 4.5 0 0 0-4.5-4.5h-3a4.5 4.5 0 0 0-4.5 4.5v1.5M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 2.25a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-1.5 9.75v-1.125a3.375 3.375 0 0 0-2.58-3.28',
    logout:
      'M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m-3-3H21m0 0-2.25-2.25M21 12l-2.25 2.25',
  };

  readonly standaloneItems: SidebarItem[] = [
    { id: 'dashboard', label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
    { id: 'punto-venta', label: 'Punto de Venta', route: '/punto-de-venta', icon: 'pos' },
    { id: 'personal', label: 'Personal', route: '/personal', icon: 'people' },
  ];

  readonly accordionSections: SidebarSection[] = [
    {
      id: 'inventario',
      label: 'Inventario',
      route: '/inventario',
      icon: 'inventory',
      children: [
        { label: 'Materiales', route: '/inventario/materiales' },
        { label: 'Herramientas', route: '/inventario/herramientas' },
        { label: 'Ingresos', route: '/inventario/ingresos' },
      ],
    },
    {
      id: 'obras',
      label: 'Obra',
      route: '/obra',
      icon: 'works',
      children: [
        { label: 'Inicio', route: '/obra' },
        { label: 'Deudores', route: '/obra/deudores' },
      ],
    },
  ];

  constructor() {
    this.syncOpenSectionToCurrentRoute();
  }

  onSidebarMouseEnter(): void {
    this.isSidebarExpanded = true;
  }

  onSidebarMouseLeave(): void {
    this.isSidebarExpanded = false;
  }

  onSectionClick(section: SidebarSection): void {
    this.openSectionId = this.openSectionId === section.id ? null : section.id;
    void this.router.navigateByUrl(section.route);
  }

  isSectionOpen(sectionId: string): boolean {
    return this.openSectionId === sectionId;
  }

  isSectionActive(section: SidebarSection): boolean {
    const currentUrl = this.router.url;
    return (
      currentUrl === section.route ||
      section.children.some((child) => currentUrl.startsWith(child.route))
    );
  }

  logout(): void {
    if (this.authSessionService.isLogoutLoading()) {
      return;
    }

    this.authSessionService.logout().subscribe(() => {
      void this.router.navigateByUrl('/login');
    });
  }

  onSucursalChange(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }

    const idSucursal = Number(target.value);
    if (!Number.isFinite(idSucursal) || idSucursal < 0) {
      return;
    }

    this.sucursalService.setSelectedSucursal(idSucursal);
  }

  private syncOpenSectionToCurrentRoute(): void {
    const activeSection = this.accordionSections.find((section) => this.isSectionActive(section));
    this.openSectionId = activeSection?.id ?? null;
  }

  private toText(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
}
