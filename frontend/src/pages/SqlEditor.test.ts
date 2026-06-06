import { quoteIdentifier } from './SqlEditor';

describe('quoteIdentifier', () => {
  it('quotes and escapes identifiers for every supported dialect', () => {
    expect(quoteIdentifier('user`table', 'mysql')).toBe('`user``table`');
    expect(quoteIdentifier('user"table', 'postgresql')).toBe('"user""table"');
    expect(quoteIdentifier('user]table', 'mssql')).toBe('[user]]table]');
  });
});
