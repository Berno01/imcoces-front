import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ProformaService {
  async generateFromTemplate(templateUrl: string, data: {
    fecha: string;
    cliente: string;
    lineas: Array<{ cantidad: number | null; descripcion: string | null; precio: number | null; subtotal: number | null }>;
    total: number;
  }): Promise<Blob> {
    // dynamic imports to avoid bundling issues if package not installed
    const [{ default: XlsxPopulate }, { saveAs }] = await Promise.all([
      // @ts-ignore
      import('xlsx-populate/browser/xlsx-populate'),
      // @ts-ignore
      import('file-saver'),
    ]);

    const resp = await fetch(templateUrl);
    if (!resp.ok) {
      throw new Error('No se pudo cargar la plantilla de Excel');
    }

    const buffer = await resp.arrayBuffer();
    const workbook = await XlsxPopulate.fromDataAsync(buffer);
    const worksheet = workbook.sheet(0);
    if (!worksheet) {
      throw new Error('Plantilla inválida: hoja no encontrada');
    }

    // Fecha en H7
    worksheet.cell('H7').value(this.sanitizeText(data.fecha));

    // Cliente en C14
    worksheet.cell('C14').value(this.sanitizeText(data.cliente));

    // Filas 20..37 -> C (cantidad), D (descripcion), G (precio unitario), H (subtotal)
    for (let i = 0; i < 18; i++) {
      const row = 20 + i;
      const linea = data.lineas[i];

      worksheet.cell(`C${row}`).value(this.sanitizeNumber(linea?.cantidad ?? null));
      worksheet.cell(`D${row}`).value(this.sanitizeText(linea?.descripcion ?? null));
      worksheet.cell(`G${row}`).value(this.sanitizeNumber(linea?.precio ?? null));
      worksheet.cell(`H${row}`).value(this.sanitizeNumber(linea?.subtotal ?? null));
    }

    // Total en H39
    worksheet.cell('H39').value(this.sanitizeNumber(data.total));

    const blob = await workbook.outputAsync({ type: 'blob' });

    // Trigger download
    saveAs(blob, `proforma_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.xlsx`);

    return blob as Blob;
  }

  private sanitizeText(value: string | null): string | null {
    if (value === null) {
      return null;
    }

    const cleaned = value
      // XML 1.0 valid chars: https://www.w3.org/TR/xml/#charsets
      .replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD]/g, '')
      .replace(/[\r\n\t]+/g, ' ')
      .trim();

    return cleaned.length > 0 ? cleaned : null;
  }

  private sanitizeNumber(value: number | null): number | null {
    if (value === null) {
      return null;
    }

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return null;
    }

    return numeric;
  }
}
