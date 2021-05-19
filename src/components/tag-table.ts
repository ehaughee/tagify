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
// export type TableOnClickHandler = ((paginationState: TablePaginationState) => Promise<any[]>) | undefined;

@customElement('tag-table')
export class Table<T> extends LitElement {
  @property({ type: Array }) columns: TableColumn<T>[] = [];
  @property({ type: Array }) data: any[] = [{}];

  @state() paginationState: TablePaginationState = {
    curPage: 1,
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
      <div>
        <a href="javascript:void(0)" @click=${this.prevClickHandler}>Prev</a>
        <a href="javascript:void(0)" @click=${this.nextClickHandler}>Next</a>
      </div>
    `;
  }

  private nextClickHandler() {
    this.paginationState.curPage += 1;
    this.dispatchEvent(new CustomEvent('nextClick', {
      detail: this.paginationState,
    }));
    console.log(this.paginationState);
    // if(this.onClickNext) {}
    //   this.onClickNext(this.paginationState)
    //   .then(items => {
    //     console.log(items);
    //   });
    // }
  }

  private prevClickHandler() {
    // if (this.onClickPrev) {
    //   this.onClickPrev(this.paginationState)
    //   .then(items => {
    //     console.log(items);
    //   });
    // }

    this.paginationState.curPage -= 1;
    this.dispatchEvent(new CustomEvent('prevClick', {
      detail: this.paginationState,
    }));
    console.log(this.paginationState);
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
}