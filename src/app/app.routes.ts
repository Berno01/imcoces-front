import { Routes } from '@angular/router';
import { authGuard, guestOnlyGuard, roleGuard } from './auth/auth.guard';
import { LoginComponent } from './auth/login.component';
import { HerramientaCatalogComponent } from './herramientas/herramienta-catalog.component';
import { IngresoFlowComponent } from './ingresos/ingreso-flow.component';
import { IngresoHistoryComponent } from './ingresos/ingreso-history.component';
import { LayoutComponent } from './layout/layout.component';
import { MaterialCatalogComponent } from './materiales/material-catalog.component';
import { ModulePlaceholderComponent } from './pages/module-placeholder.component';
import { UsuarioListComponent } from './personal/usuario-list.component';
import { VentaFlowComponent } from './ventas/venta-flow.component';
import { UnauthorizedComponent } from './pages/unauthorized.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [guestOnlyGuard],
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

      {
        path: 'no-autorizado',
        component: UnauthorizedComponent,
      },

      {
        path: 'dashboard',
        component: ModulePlaceholderComponent,
        canActivate: [roleGuard],
        data: { title: 'Dashboard', allowedRoles: [1, 2] },
      },

      {
        path: 'inventario',
        component: ModulePlaceholderComponent,
        canActivate: [roleGuard],
        data: { title: 'Inventario', allowedRoles: [1, 2] },
      },
      {
        path: 'inventario/materiales',
        canActivate: [roleGuard],
        component: MaterialCatalogComponent,
        data: { allowedRoles: [1, 2] },
      },
      {
        path: 'inventario/herramientas',
        canActivate: [roleGuard],
        component: HerramientaCatalogComponent,
        data: { allowedRoles: [1, 2] },
      },
      {
        path: 'inventario/ingresos',
        canActivate: [roleGuard],
        component: IngresoFlowComponent,
        data: { allowedRoles: [1, 2] },
      },
      {
        path: 'inventario/ingresos/historial',
        canActivate: [roleGuard],
        component: IngresoHistoryComponent,
        data: { allowedRoles: [1, 2] },
      },

      {
        path: 'punto-de-venta',
        canActivate: [roleGuard],
        component: VentaFlowComponent,
        data: { allowedRoles: [1, 2] },
      },
      {
        path: 'punto-de-venta/historial',
        canActivate: [roleGuard],
        component: VentaFlowComponent,
        data: { allowedRoles: [1, 2] },
      },

      {
        path: 'obras',
        canActivate: [roleGuard],
        component: ModulePlaceholderComponent,
        data: { title: 'Obras', allowedRoles: [1, 2] },
      },
      {
        path: 'obras/obras',
        canActivate: [roleGuard],
        component: ModulePlaceholderComponent,
        data: { title: 'Obras', allowedRoles: [1, 2] },
      },
      {
        path: 'obras/control-de-deudores',
        canActivate: [roleGuard],
        component: ModulePlaceholderComponent,
        data: { title: 'Control de Deudores', allowedRoles: [1, 2] },
      },

      {
        path: 'personal',
        canActivate: [roleGuard],
        component: UsuarioListComponent,
        data: { allowedRoles: [1, 2] },
      },
    ],
  },
  { path: '**', redirectTo: '/dashboard' },
];
