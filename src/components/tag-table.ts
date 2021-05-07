import { LitElement, html, css, TemplateResult } from 'lit';
import { property, customElement } from 'lit/decorators.js';

// TODO: Move to a types file
export type TableHeader = string;
export type TableCell = string;
export type TableRow = TableCell[];
export type TableCellRenderer = (cell: TableCell) => TemplateResult<any>;

@customElement('tag-table')
export class Table extends LitElement {
  @property({ type: Array }) headers: TableHeader[] = [];
  @property({ type: Array }) items: TableRow[] = [];
  
  static get styles() {
    return css``;
  }

  render() {
    return html`
      <table>
        ${this.renderTableHeader(this.headers)}
        <tbody>
          ${this.items.map(i => this.renderTableRow(i, this.renderTableCell))}
        </tbody>
      </table>
    `;
  }

  private renderTableHeader(headers: TableHeader[]) {
    return html`
      <thead>
        ${this.renderTableRow(headers, this.renderTableHeaderCell)}
      </thead>
    `;
  }

  private renderTableRow(cells: TableCell[] | TableHeader[], cellRenderer: TableCellRenderer) {
    return html`
      <tr>
        ${cells.map(cell => cellRenderer(cell))}
      </tr>
    `;
  }

  private renderTableCell(cell: TableCell) {
    return html`
      <td>
        ${cell}
      </td>
    `;
  }

  private renderTableHeaderCell(cell: TableCell) {
    return html`
      <th>
        ${cell}
      </th>
    `;
  }
}