import { clampMaxRows, loadMaxRows, quoteIdentifier, saveMaxRows } from './SqlEditor';

describe('quoteIdentifier', () => {
  it('quotes and escapes identifiers for every supported dialect', () => {
    expect(quoteIdentifier('user`table', 'mysql')).toBe('`user``table`');
    expect(quoteIdentifier('user"table', 'postgresql')).toBe('"user""table"');
    expect(quoteIdentifier('user]table', 'mssql')).toBe('[user]]table]');
  });
});

describe('max rows', () => {
  beforeEach(() => localStorage.clear());

  it('clamps values to the supported range', () => {
    expect(clampMaxRows(0)).toBe(1);
    expect(clampMaxRows(250.4)).toBe(250);
    expect(clampMaxRows(20000)).toBe(10000);
    expect(clampMaxRows(Number.NaN)).toBe(200);
  });

  it('persists and loads the shared browser setting', () => {
    expect(loadMaxRows()).toBe(200);
    expect(saveMaxRows(500)).toBe(500);
    expect(loadMaxRows()).toBe(500);
  });
});
