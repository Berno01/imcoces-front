import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  signal
} from '@angular/core';

export type SmartSelectItem = Record<string, unknown>;

export interface SmartSelectCreatePayload {
  nombre: string;
  codigo?: string;
}

export interface SmartSelectUpdatePayload extends SmartSelectCreatePayload {
  id: number;
}

@Component({
  selector: 'app-smart-select',
  standalone: true,
  templateUrl: './smart-select.component.html'
})
export class SmartSelectComponent {
  @Input({ required: true }) items: SmartSelectItem[] = [];
  @Input() displayKey = 'nombre';
  @Input() valueKey = 'id';
  @Input() showColorSwatch = false;
  @Input() placeholder = 'Seleccionar...';
  @Input() selectedValue: number | null = null;

  @Output() readonly selectionChange = new EventEmitter<number>();
  @Output() readonly onCreate = new EventEmitter<SmartSelectCreatePayload>();
  @Output() readonly onUpdate = new EventEmitter<SmartSelectUpdatePayload>();
  @Output() readonly onDelete = new EventEmitter<number>();

  readonly isOpen = signal(false);
  readonly isCreating = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly draftName = signal('');
  readonly draftColor = signal('#2563eb');

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (!target) {
      return;
    }

    if (!this.host.nativeElement.contains(target)) {
      this.closeDropdown();
    }
  }

  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.isOpen.update((current) => !current);

    if (!this.isOpen()) {
      this.resetInlineState();
    }
  }

  closeDropdown(): void {
    this.isOpen.set(false);
    this.resetInlineState();
  }

  selectItem(item: SmartSelectItem, event: MouseEvent): void {
    event.stopPropagation();

    const id = this.getItemId(item);
    if (id === null) {
      return;
    }

    this.selectedValue = id;
    this.selectionChange.emit(id);
    this.closeDropdown();
  }

  startCreate(event: MouseEvent): void {
    event.stopPropagation();
    this.isCreating.set(true);
    this.editingId.set(null);
    this.draftName.set('');
    this.draftColor.set('#2563eb');
  }

  startEdit(item: SmartSelectItem, event: MouseEvent): void {
    event.stopPropagation();

    const id = this.getItemId(item);
    if (id === null) {
      return;
    }

    this.isCreating.set(false);
    this.editingId.set(id);
    this.draftName.set(this.getItemLabel(item));
    this.draftColor.set(this.getItemColor(item));
  }

  saveInline(event: MouseEvent): void {
    event.stopPropagation();

    const nombre = this.draftName().trim();
    if (!nombre) {
      return;
    }

    const codigo = this.showColorSwatch ? this.normalizeColor(this.draftColor()) : undefined;

    if (this.isCreating()) {
      this.onCreate.emit({ nombre, codigo });
      this.resetInlineState();
      return;
    }

    const id = this.editingId();
    if (id === null) {
      return;
    }

    this.onUpdate.emit({ id, nombre, codigo });
    this.resetInlineState();
  }

  cancelInline(event: MouseEvent): void {
    event.stopPropagation();
    this.resetInlineState();
  }

  requestDelete(item: SmartSelectItem, event: MouseEvent): void {
    event.stopPropagation();

    const id = this.getItemId(item);
    if (id === null) {
      return;
    }

    this.onDelete.emit(id);
  }

  onDraftNameInput(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    this.draftName.set(input.value);
  }

  onDraftColorInput(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    this.draftColor.set(this.normalizeColor(input.value));
  }

  isEditingItem(item: SmartSelectItem): boolean {
    const id = this.getItemId(item);
    return id !== null && this.editingId() === id;
  }

  isSelected(item: SmartSelectItem): boolean {
    const id = this.getItemId(item);
    return id !== null && this.selectedValue === id;
  }

  get selectedLabel(): string {
    if (this.selectedValue === null) {
      return this.placeholder;
    }

    const selectedItem = this.items.find((item) => this.getItemId(item) === this.selectedValue);
    return selectedItem ? this.getItemLabel(selectedItem) : this.placeholder;
  }

  getItemLabel(item: SmartSelectItem): string {
    const preferred = item[this.displayKey];
    if (typeof preferred === 'string' && preferred.trim()) {
      return preferred;
    }

    const fallbackKeys = ['nombre_categoria', 'nombre_color', 'nombre'];
    for (const key of fallbackKeys) {
      const value = item[key];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }

    return 'Sin nombre';
  }

  getItemColor(item: SmartSelectItem): string {
    const colorKeys = ['codigo_color', 'codigo'];
    for (const key of colorKeys) {
      const value = item[key];
      if (typeof value === 'string' && value.trim()) {
        return this.normalizeColor(value);
      }
    }

    return '#9ca3af';
  }

  trackByItem(index: number, item: SmartSelectItem): number | string {
    const id = this.getItemId(item);
    return id ?? `item-${index}`;
  }

  private getItemId(item: SmartSelectItem): number | null {
    const value = item[this.valueKey];

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private normalizeColor(colorValue: string): string {
    if (!colorValue) {
      return '#9ca3af';
    }

    const value = colorValue.trim();
    const withHash = value.startsWith('#') ? value : `#${value}`;
    const isHex = /^#[0-9a-fA-F]{6}$/.test(withHash);

    return isHex ? withHash : '#9ca3af';
  }

  private resetInlineState(): void {
    this.isCreating.set(false);
    this.editingId.set(null);
    this.draftName.set('');
    this.draftColor.set('#2563eb');
  }
}
