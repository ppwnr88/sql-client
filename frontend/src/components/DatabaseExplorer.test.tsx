import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatabaseExplorer } from './DatabaseExplorer';
import { listDatabases, listMetadata } from '../services/api';

vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return {
    ...actual,
    listDatabases: vi.fn(),
    listMetadata: vi.fn(),
  };
});

const connection = {
  id: 'conn_1',
  name: 'local',
  type: 'mysql' as const,
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
};

describe('DatabaseExplorer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listDatabases).mockResolvedValue(['app']);
    vi.mocked(listMetadata).mockImplementation(async (_connection, resource) => {
      if (resource === 'tables') return [{ name: 'users', schema: 'app' }];
      if (resource === 'columns') {
        return [{
          name: 'id',
          dataType: 'int',
          nullable: false,
          primaryKey: true,
          ordinalPosition: 1,
        }];
      }
      return [];
    });
  });

  it('lazy loads tables and columns, selects database, and inserts identifiers', async () => {
    const user = userEvent.setup();
    const onSelectDatabase = vi.fn();
    const onInsertIdentifier = vi.fn();
    render(
      <DatabaseExplorer
        connections={[connection]}
        activeConnectionId=""
        activeDatabase=""
        collapsed={false}
        mobileOpen={false}
        onCollapse={vi.fn()}
        onCloseMobile={vi.fn()}
        onSelectDatabase={onSelectDatabase}
        onInsertIdentifier={onInsertIdentifier}
      />
    );

    expect(listDatabases).not.toHaveBeenCalled();
    await user.click(screen.getByText('local'));
    await user.click(screen.getByText('Databases'));
    await screen.findByText('app');
    expect(listDatabases).toHaveBeenCalledTimes(1);

    await user.click(screen.getByText('app'));
    expect(onSelectDatabase).toHaveBeenCalledWith('conn_1', 'app');
    await user.click(screen.getByText('Tables'));
    await screen.findByText('users');

    await user.click(screen.getByText('users'));
    await user.click(screen.getByText('Columns'));
    await screen.findByText('id');
    await user.dblClick(screen.getByText('id'));

    expect(listMetadata).toHaveBeenCalledWith(expect.objectContaining({ database: 'app' }), 'tables', undefined);
    expect(listMetadata).toHaveBeenCalledWith(expect.objectContaining({ database: 'app' }), 'columns', undefined, 'users');
    expect(onInsertIdentifier).toHaveBeenCalledWith(connection, ['id']);
  });

  it('shows a retry action after a lazy-load error', async () => {
    vi.mocked(listDatabases)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(['app']);
    const user = userEvent.setup();
    render(
      <DatabaseExplorer
        connections={[connection]}
        activeConnectionId=""
        activeDatabase=""
        collapsed={false}
        mobileOpen={false}
        onCollapse={vi.fn()}
        onCloseMobile={vi.fn()}
        onSelectDatabase={vi.fn()}
        onInsertIdentifier={vi.fn()}
      />
    );

    await user.click(screen.getByText('local'));
    await user.click(screen.getByText('Databases'));
    await screen.findByText('Load failed · retry');
    await user.click(screen.getByText('Load failed · retry'));

    await waitFor(() => expect(listDatabases).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('app')).toBeInTheDocument();
  });
});
