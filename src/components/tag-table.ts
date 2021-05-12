import { LitElement, html, css, TemplateResult } from 'lit';
import { property, customElement } from 'lit/decorators.js';

// TODO: Move to a types file
export interface TableColumn {
  id: string;
  header: string;
  render: TableColumnRenderer;
}
export type TableCellValue = string | number | TemplateResult;
export type TableColumnRenderer = (cellData: any) => TemplateResult;
export type TableHeader = string;
export type TableRow = TableColumn[];

@customElement('tag-table')
export class Table extends LitElement {
  @property({ type: Array }) columns: TableColumn[] = [];
  @property({ type: Array }) data: any[] = [{}];
  
  static get styles() {
    return css``;
  }

  render() {
    return html`
      <table>
        ${this.renderTableHeader(this.columns)}
        <tbody>
          ${this.data.map(item => this.renderTableRow(item))}
        </tbody>
      </table>
    `;
  }

  private renderTableHeader(columns: TableColumn[]): TemplateResult {
    return html`
      <thead>
        ${columns.map((col: TableColumn) => this.renderTableHeaderCell(col))}
      </thead>
    `;
  }

  private renderTableRow(data: any) {
    return html`
      <tr>
        ${this.columns.map(
          (col: TableColumn, colIndex: number) => this.renderTableCell(data, colIndex))}
      </tr>
    `;
  }

  private renderTableCell(cellData: any, colIndex: number) {
    return html`
      <td>
        ${this.columns[colIndex].render(cellData)}
      </td>
    `;
  }

  private renderTableHeaderCell(col: TableColumn) {
    return html`
      <th>
        ${col?.header || ''}
      </th>
    `;
  }
}