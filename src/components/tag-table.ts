import { LitElement, html, css, TemplateResult } from 'lit';
import { property, customElement, state } from 'lit/decorators.js';

// TODO: Move to a types file
export interface TableColumn<T> {
  id: string;
  header: string;
  render: TableColumnRenderer<T>;
}
export interface TablePaginationState {
  curPage: number;
  pageSize: number;
}

export type TableCellValue = string | number | TemplateResult;
export type TableColumnRenderer<T> = (cellData: T) => TemplateResult;
export type TableHeader = string;
export type TableRow<T> = TableColumn<T>[];
export type TablePaginationClickHandler = (paginationState: TablePaginationState) => Promise<any[]>;
// export type TableOnClickHandler = ((paginationState: TablePaginationState) => Promise<any[]>) | undefined;

@customElement('tag-table')
export class Table<T> extends LitElement {
  @property({ type: Array }) columns: TableColumn<T>[] = [];
  @property({ type: Array }) data: any[] = [{}];
  @property({ attribute: false }) onClickNext: TablePaginationClickHandler | undefined;
  @property({ attribute: false }) onClickPrev: TablePaginationClickHandler | undefined;

  @state() paginationState: TablePaginationState = {
    curPage: 0,
    pageSize: 100,
  };
  
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
      ${this.renderTablePagination()}
    `;
  }

  private nextClickHandler() {
    this.paginationState.curPage += 1;

    if(this.onClickNext) {
      this.onClickNext(this.paginationState)
      .then((items) => {
        this.data = items;
      });
    }
  }

  private prevClickHandler() {
    this.paginationState.curPage -= 1;

    if (this.onClickPrev) {
      this.onClickPrev(this.paginationState)
      .then(items => {
        this.data = items;
      });
    }
  }

  private renderTableHeader(columns: TableColumn<T>[]): TemplateResult {
    return html`
      <thead>
        ${columns.map((col: TableColumn<T>) => this.renderTableHeaderCell(col))}
      </thead>
    `;
  }

  private renderTableRow(data: T) {
    return html`
      <tr>
        ${this.columns.map(
          col => this.renderTableCell(data, col)
        )}
      </tr>
    `;
  }

  private renderTableCell(cellData: any, col: TableColumn<T>) {
    return html`
      <td>
        ${col.render(cellData)}
      </td>
    `;
  }

  private renderTableHeaderCell(col: TableColumn<T>) {
    return html`
      <th>
        ${col?.header || ''}
      </th>
    `;
  }

  // TODO: Move to a new component
  private renderTablePagination() {
    return html`
      <div>
        ${this.renderTablePaginationNavigateLink(this.prevClickHandler, 'Prev', this.paginationState.curPage > 0)}
        ${this.renderTablePaginationNavigateLink(this.nextClickHandler, 'Next', this.data.length >= this.paginationState.pageSize )}
      </div>
    `;
  }

  private renderTablePaginationNavigateLink(handler: Function, text: string, enabled: boolean = true) {
    if (enabled) {
      return html`
        <a href="javascript:void(0)" @click=${handler}>${text}</a>
      `;
    }

    return html`
      ${text}
    `;
  }
}