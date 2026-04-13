import { Routes } from '@angular/router';
import { HerramientaCatalogComponent } from './herramientas/herramienta-catalog.component';
import { IngresoFlowComponent } from './ingresos/ingreso-flow.component';
import { IngresoHistoryComponent } from './ingresos/ingreso-history.component';
import { LayoutComponent } from './layout/layout.component';
import { MaterialCatalogComponent } from './materiales/material-catalog.component';
import { ModulePlaceholderComponent } from './pages/module-placeholder.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

      { path: 'dashboard', component: ModulePlaceholderComponent, data: { title: 'Dashboard' } },

      { path: 'inventario', component: ModulePlaceholderComponent, data: { title: 'Inventario' } },
      {
        path: 'inventario/materiales',
        component: MaterialCatalogComponent,
      },
      {
        path: 'inventario/herramientas',
        component: HerramientaCatalogComponent,
      },
      {
        path: 'inventario/ingresos',
        component: IngresoFlowComponent,
      },
      {
        path: 'inventario/ingresos/historial',
        component: IngresoHistoryComponent,
      },

      {
        path: 'punto-de-venta',
        component: ModulePlaceholderComponent,
        data: { title: 'Punto de Venta' },
      },

      { path: 'obras', component: ModulePlaceholderComponent, data: { title: 'Obras' } },
      { path: 'obras/obras', component: ModulePlaceholderComponent, data: { title: 'Obras' } },
      {
        path: 'obras/control-de-deudores',
        component: ModulePlaceholderComponent,
        data: { title: 'Control de Deudores' },
      },

      { path: 'personal', component: ModulePlaceholderComponent, data: { title: 'Personal' } },
    ],
  },
  { path: '**', redirectTo: '' },
];
