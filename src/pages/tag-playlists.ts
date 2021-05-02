import { LitElement, html, css } from 'lit';
import { property, customElement } from 'lit/decorators.js';

@customElement('tag-playlists')
export class AppRoot extends LitElement {
  @property({ type: Array }) headers: string[] = ['test', 'test2'];
  @property({ type: Array }) items: any[] = [['test-val', 'test-another-val'], ['3', '4']];
  
  static get styles() {
    return css``;
  }

  // TODO: Move this into a tag-table component and use global state or something
  render() {
    return html`
      <table>
        ${this.renderTableHeader(this.headers)}
        <tbody>
          ${this.items.map(i => this.renderTableRow(i))}
        </tbody>
      </table>
    `;
  }

  private renderTableHeader(headers: string[]) {
    return html`
      <thead>
        <tr>
          ${headers.map(h => html`
            <th>${h}</th>
          `)}
        </tr>
      </thead>
    `;
  }

  private renderTableRow(cells: []) {
    return html`
      <tr>
        ${cells.map(cell => this.renderTableCell(cell))}
      </tr>
    `;
  }

  private renderTableCell(cell: any) {
    return html`
      <td>
        ${cell}
      </td>
    `;
  }
}