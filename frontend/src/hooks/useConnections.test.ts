import { renderHook, act } from '@testing-library/react';
import { useConnections } from './useConnections';

// jsdom provides localStorage; reset between tests
beforeEach(() => localStorage.clear());

describe('useConnections', () => {
  const base = {
    name: 'local',
    type: 'mysql' as const,
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'test',
  };

  it('starts with an empty list when localStorage is empty', () => {
    const { result } = renderHook(() => useConnections());
    expect(result.current.connections).toEqual([]);
  });

  it('loads persisted connections from localStorage on mount', () => {
    const stored = [{ ...base, id: 'conn_1' }];
    localStorage.setItem('sql_client_connections', JSON.stringify(stored));
    const { result } = renderHook(() => useConnections());
    expect(result.current.connections).toHaveLength(1);
    expect(result.current.connections[0].name).toBe('local');
  });

  it('addConnection appends a new connection and persists it', () => {
    const { result } = renderHook(() => useConnections());

    let added: ReturnType<typeof result.current.addConnection>;
    act(() => {
      added = result.current.addConnection(base);
    });

    expect(result.current.connections).toHaveLength(1);
    expect(result.current.connections[0].id).toBeDefined();
    expect(added!.name).toBe('local');

    const persisted = JSON.parse(localStorage.getItem('sql_client_connections') ?? '[]');
    expect(persisted).toHaveLength(1);
  });

  it('addConnection generates unique ids for each connection', () => {
    const { result } = renderHook(() => useConnections());
    act(() => {
      result.current.addConnection(base);
      result.current.addConnection({ ...base, name: 'staging' });
    });
    const ids = result.current.connections.map((c) => c.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('updateConnection patches the correct connection', () => {
    const { result } = renderHook(() => useConnections());
    let conn: ReturnType<typeof result.current.addConnection>;
    act(() => { conn = result.current.addConnection(base); });

    act(() => {
      result.current.updateConnection(conn!.id, { name: 'updated', host: '10.0.0.1' });
    });

    const updated = result.current.connections.find((c) => c.id === conn!.id);
    expect(updated?.name).toBe('updated');
    expect(updated?.host).toBe('10.0.0.1');
    expect(updated?.database).toBe('test'); // unchanged fields preserved
  });

  it('updateConnection does nothing for an unknown id', () => {
    const { result } = renderHook(() => useConnections());
    act(() => { result.current.addConnection(base); });
    const before = result.current.connections[0].name;

    act(() => { result.current.updateConnection('no-such-id', { name: 'ghost' }); });

    expect(result.current.connections[0].name).toBe(before);
  });

  it('deleteConnection removes the correct entry and persists', () => {
    const { result } = renderHook(() => useConnections());
    let c1: ReturnType<typeof result.current.addConnection>;
    let c2: ReturnType<typeof result.current.addConnection>;
    act(() => {
      c1 = result.current.addConnection(base);
      c2 = result.current.addConnection({ ...base, name: 'staging' });
    });

    act(() => { result.current.deleteConnection(c1!.id); });

    expect(result.current.connections).toHaveLength(1);
    expect(result.current.connections[0].id).toBe(c2!.id);

    const persisted = JSON.parse(localStorage.getItem('sql_client_connections') ?? '[]');
    expect(persisted).toHaveLength(1);
  });

  it('importConnections merges incoming connections with existing ones', () => {
    const { result } = renderHook(() => useConnections());
    act(() => { result.current.addConnection(base); });

    act(() => {
      result.current.importConnections([{ ...base, name: 'imported' }]);
    });

    expect(result.current.connections).toHaveLength(2);
    expect(result.current.connections.some((c) => c.name === 'imported')).toBe(true);
    // imported entries also get generated ids
    const importedConn = result.current.connections.find((c) => c.name === 'imported');
    expect(importedConn?.id).toMatch(/^conn_/);
  });

  it('importConnections with empty array does not change existing connections', () => {
    const { result } = renderHook(() => useConnections());
    act(() => { result.current.addConnection(base); });

    act(() => { result.current.importConnections([]); });

    expect(result.current.connections).toHaveLength(1);
  });

  it('exportConnections triggers a file download without id fields', async () => {
    // Render the hook BEFORE mocking createElement so React internals are unaffected
    const { result } = renderHook(() => useConnections());
    act(() => { result.current.addConnection(base); });

    // Now stub URL and the anchor element
    const createObjectURL = vi.fn().mockReturnValue('blob:url');
    const revokeObjectURL = vi.fn();
    const clickMock = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    const anchorSpy = vi.spyOn(document, 'createElement').mockReturnValueOnce({
      href: '',
      download: '',
      click: clickMock,
    } as unknown as HTMLAnchorElement);

    act(() => { result.current.exportConnections(); });

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:url');

    // Verify the blob was created with application/json type
    const blobArg: Blob = createObjectURL.mock.calls[0][0];
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe('application/json');

    // Read blob content via FileReader (jsdom does not support Blob.text())
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(blobArg);
    });
    const parsed = JSON.parse(text);
    expect(parsed.connections).toHaveLength(1);
    expect(parsed.connections[0].id).toBeUndefined();
    expect(parsed.connections[0].name).toBe('local');

    anchorSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('exportConnection downloads only the selected connection', async () => {
    const { result } = renderHook(() => useConnections());
    let selectedId = '';
    act(() => {
      selectedId = result.current.addConnection({ ...base, name: 'local dev' }).id;
      result.current.addConnection({ ...base, name: 'staging' });
    });

    const createObjectURL = vi.fn().mockReturnValue('blob:url');
    const revokeObjectURL = vi.fn();
    const anchor = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const anchorSpy = vi.spyOn(document, 'createElement').mockReturnValueOnce(
      anchor as unknown as HTMLAnchorElement
    );

    act(() => { result.current.exportConnection(selectedId); });

    expect(anchor.click).toHaveBeenCalledTimes(1);
    expect(anchor.download).toBe('sql-client-local-dev.json');

    const blobArg: Blob = createObjectURL.mock.calls[0][0];
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(blobArg);
    });
    const parsed = JSON.parse(text);
    expect(parsed.connections).toHaveLength(1);
    expect(parsed.connections[0].id).toBeUndefined();
    expect(parsed.connections[0].name).toBe('local dev');

    anchorSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});
