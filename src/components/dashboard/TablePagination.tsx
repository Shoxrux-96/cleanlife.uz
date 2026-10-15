import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface TablePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 30, 50]
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  const { t } = useLanguage();

  const startItem = totalItems === 0 ? 0 : (validPage - 1) * pageSize + 1;
  const endItem = Math.min(validPage * pageSize, totalItems);

  return (
    <div className="px-4 py-3 bg-stone-50 dark:bg-[#141210] border-t border-stone-200 dark:border-[#2D251D] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
      {/* Left: Info & Page size selector */}
      <div className="flex flex-wrap items-center gap-3 text-stone-600 dark:text-stone-300">
        <span>
          {t.dash.pg.showing} <strong className="font-bold text-stone-900 dark:text-white font-mono">{startItem}-{endItem}</strong> / {t.dash.pg.total}{' '}
          <strong className="font-bold text-stone-900 dark:text-white font-mono">{totalItems}</strong> {t.dash.pg.rows}
        </span>

        <div className="flex items-center gap-1.5 border-l border-stone-300 dark:border-[#2E2720] pl-3">
          <span>{t.dash.pg.perPage}</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="px-2 py-1 rounded-lg text-xs font-bold bg-white dark:bg-[#1C1814] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: Navigation Controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(Math.max(1, validPage - 1))}
          disabled={validPage === 1}
          className={`p-1.5 rounded-lg border border-stone-200 dark:border-[#2E2720] flex items-center justify-center transition-colors ${
            validPage === 1
              ? 'opacity-40 cursor-not-allowed text-stone-400'
              : 'hover:bg-white dark:hover:bg-[#201B16] text-[#1A1715] dark:text-[#FAF7F2] cursor-pointer'
          }`}
          title={t.dash.pg.prev}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page buttons */}
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((page) => {
              return page === 1 || page === totalPages || Math.abs(page - validPage) <= 1;
            })
            .map((page, idx, array) => {
              const prevPage = array[idx - 1];
              const showEllipsis = prevPage && page - prevPage > 1;

              return (
                <React.Fragment key={page}>
                  {showEllipsis && <span className="px-1 text-stone-400">...</span>}
                  <button
                    onClick={() => onPageChange(page)}
                    className={`min-w-[1.75rem] h-7 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer font-mono ${
                      validPage === page
                        ? 'bg-amber-500 text-black shadow-sm font-black'
                        : 'bg-white dark:bg-[#1C1814] border border-stone-200 dark:border-[#2E2720] text-[#7A6F62] dark:text-[#A69C8E] hover:text-black dark:hover:text-white hover:bg-stone-50 dark:hover:bg-[#251E18]'
                    }`}
                  >
                    {page}
                  </button>
                </React.Fragment>
              );
            })}
        </div>

        <button
          onClick={() => onPageChange(Math.min(totalPages, validPage + 1))}
          disabled={validPage === totalPages}
          className={`p-1.5 rounded-lg border border-stone-200 dark:border-[#2E2720] flex items-center justify-center transition-colors ${
            validPage === totalPages
              ? 'opacity-40 cursor-not-allowed text-stone-400'
              : 'hover:bg-white dark:hover:bg-[#201B16] text-[#1A1715] dark:text-[#FAF7F2] cursor-pointer'
          }`}
          title={t.dash.pg.next}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
