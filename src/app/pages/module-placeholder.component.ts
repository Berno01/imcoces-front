import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-module-placeholder',
  standalone: true,
  template: `
    <section
      class="mx-auto flex max-w-3xl flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-8 py-16 text-center shadow-sm"
    >
      <div
        class="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"
      >
        <svg
          class="h-7 w-7"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M7.5 3h9m-9 18h9m-10.5-3h12a1.5 1.5 0 0 0 1.5-1.5V7.5A1.5 1.5 0 0 0 18 6H6a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 6 18Z"
          ></path>
        </svg>
      </div>
      <h1 class="text-3xl font-bold text-slate-900">{{ title }}</h1>
      <p class="mt-3 max-w-xl text-slate-500">
        Vista de ejemplo para comprobar el LayoutComponent, el router-outlet y el comportamiento del
        menu lateral.
      </p>
    </section>
  `,
})
export class ModulePlaceholderComponent {
  private readonly route = inject(ActivatedRoute);

  get title(): string {
    const routeTitle = this.route.snapshot.data['title'];
    return typeof routeTitle === 'string' ? routeTitle : 'Modulo';
  }
}
