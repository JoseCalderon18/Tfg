declare module 'jspdf' {
  export default class jsPDF {
    constructor(options?: Record<string, unknown>);
    addPage(): void;
    addImage(imageData: string, format: string, x: number, y: number, width: number, height: number): void;
    save(filename: string): void;
    setFontSize(size: number): void;
    text(text: string, x: number, y: number): void;
  }
}

declare module 'jspdf-autotable' {
  import jsPDF from 'jspdf';

  type AutoTableOptions = Record<string, unknown>;

  export default function autoTable(doc: jsPDF, options: AutoTableOptions): void;
}
