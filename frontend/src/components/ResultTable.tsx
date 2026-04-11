import React from 'react';
import { QueryResult } from '../services/api';

interface ResultTableProps {
  result: QueryResult;
}

function formatCellValue(value: unknown): { display: string; isNull: boolean } {
  if (value === null || value === undefined) {
    return { display: 'NULL', isNull: true };
  }
  if (typeof value === 'boolean') {
    return { display: value ? 'true' : 'false', isNull: false };
  }
  if (value instanceof Date) {
    return { display: value.toISOString(), isNull: false };
  }
  if (typeof value === 'object') {
    return { display: JSON.stringify(value), isNull: false };
  }
  return { display: String(value), isNull: false };
}

export function ResultTable({ result }: ResultTableProps): React.ReactElement {
  if (result.columns.length === 0 || result.rows.length === 0) {
    return (
      <div className="result-empty">
        <span>Query returned no rows</span>
      </div>
    );
  }

  return (
    <div className="result-table-wrap">
      <table className="result-table">
        <thead>
          <tr>
            <th style={{ color: '#8b949e', width: '40px', textAlign: 'right' }}>#</th>
            {result.columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, rowIdx) => (
            <tr key={rowIdx}>
              <td
                style={{
                  color: '#8b949e',
                  textAlign: 'right',
                  userSelect: 'none',
                  width: '40px',
                  paddingRight: '12px',
                }}
              >
                {rowIdx + 1}
              </td>
              {result.columns.map((col) => {
                const { display, isNull } = formatCellValue(row[col]);
                return (
                  <td key={col} className={isNull ? 'null-value' : ''} title={display}>
                    {display}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
