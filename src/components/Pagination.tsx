"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, totalItems, pageSize, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  // Build page number buttons (show max 5)
  const pages: number[] = [];
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
  for (let i = startPage; i <= endPage; i++) pages.push(i);

  return (
    <div className="flex items-center justify-between px-2 py-3 text-sm text-gray-600">
      <span>
        Showing {start}–{end} of {totalItems}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={18} />
        </button>
        {startPage > 1 && (
          <>
            <button onClick={() => onPageChange(1)} className="h-9 min-w-[36px] px-3 rounded-lg hover:bg-gray-100">1</button>
            {startPage > 2 && <span className="px-1">…</span>}
          </>
        )}
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`h-9 min-w-[36px] px-3 rounded-lg font-medium ${p === currentPage ? "bg-[#7BC143] text-white" : "hover:bg-gray-100"}`}
          >
            {p}
          </button>
        ))}
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-1">…</span>}
            <button onClick={() => onPageChange(totalPages)} className="h-9 min-w-[36px] px-3 rounded-lg hover:bg-gray-100">{totalPages}</button>
          </>
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
