import React, { useEffect, useRef } from 'react';
import { QueryResult } from '../services/api';

interface ResultTableProps {
  result: QueryResult;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
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

export function ResultTable({ result, isLoadingMore = false, onLoadMore }: ResultTableProps): React.ReactElement {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = wrapRef.current;
    if (element && onLoadMore && !isLoadingMore && element.scrollHeight <= element.clientHeight) {
      onLoadMore();
    }
  }, [isLoadingMore, onLoadMore, result.rows.length]);

  if (result.columns.length === 0 || result.rows.length === 0) {
    return (
      <div className="result-empty">
        <span>Query returned no rows</span>
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="result-table-wrap"
      onScroll={(event) => {
        const element = event.currentTarget;
        if (
          onLoadMore
          && !isLoadingMore
          && element.scrollHeight - element.scrollTop - element.clientHeight < 120
        ) {
          onLoadMore();
        }
      }}
    >
      <table className="result-table">
        <thead>
          <tr>
            <th style={{ color: 'var(--main-muted)', width: '40px', textAlign: 'right' }}>#</th>
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
                  color: 'var(--main-muted)',
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
      {isLoadingMore && (
        <div className="result-load-more">
          <span className="spinner spinner-dark" />
          Loading more rows...
        </div>
      )}
    </div>
  );
}
