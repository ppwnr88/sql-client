import { fireEvent, render } from '@testing-library/react';
import { ResultTable } from './ResultTable';

const result = {
  columns: ['id'],
  rows: [{ id: 1 }, { id: 2 }],
  rowCount: 2,
  returnedRowCount: 2,
  totalRowCount: 4,
  truncated: true,
  duration: 1,
};

describe('ResultTable', () => {
  it('requests the next batch when scrolling near the bottom', () => {
    const onLoadMore = vi.fn();
    const { container } = render(<ResultTable result={result} onLoadMore={onLoadMore} />);
    const wrap = container.querySelector('.result-table-wrap') as HTMLDivElement;

    Object.defineProperties(wrap, {
      scrollHeight: { value: 1000, configurable: true },
      clientHeight: { value: 400, configurable: true },
      scrollTop: { value: 550, configurable: true },
    });
    fireEvent.scroll(wrap);

    expect(onLoadMore).toHaveBeenCalled();
  });
});
