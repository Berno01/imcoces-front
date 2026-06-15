declare module 'xlsx-populate/browser/xlsx-populate-no-encryption' {
  export interface Workbook {
    sheet(index: number): Sheet;
    outputAsync(options: { type: 'blob' }): Promise<Blob>;
  }

  export interface Sheet {
    cell(address: string): Cell;
  }

  export interface Cell {
    value(value: any): Cell;
  }

  export const fromDataAsync: (data: ArrayBuffer) => Promise<Workbook>;
  export default { fromDataAsync };
}
