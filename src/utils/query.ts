import { Request } from "express";

export interface PaginationQuery {
  page: number;
  limit: number;
}

export interface SortQuery {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface FilterQuery {
  [key: string]: any;
}

export interface SearchQuery {
  searchTerm?: string;
}

export interface ParsedQuery {
  pagination: PaginationQuery;
  sort: SortQuery;
  search: SearchQuery;
  filter: FilterQuery;
}

function parseQuery(
  req: Request,
  options?: { maxLimit?: number; defaultLimit?: number },
) {
  const {
    page = "1",
    limit = "10",
    sortBy,
    sortOrder,
    searchTerm,
    ...rest
  } = req.query;
  const maxLimit = options?.maxLimit || 100;
  const defaultLimit = options?.defaultLimit || 10;

  let pageNum = parseInt(page as string, 10);
  let limitNum = parseInt(limit as string, 10);
  if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
  if (isNaN(limitNum) || limitNum < 1) limitNum = defaultLimit;
  if (limitNum > maxLimit) limitNum = maxLimit;

  const filter: FilterQuery = { ...rest };

  return {
    pagination: { page: pageNum, limit: limitNum },
    sort: {
      sortBy: typeof sortBy === "string" ? sortBy : undefined,
      sortOrder: sortOrder === "desc" ? "desc" : "asc",
    },
    search: {
      searchTerm: typeof searchTerm === "string" ? searchTerm : undefined,
    },
    filter,
  } as ParsedQuery;
}

function buildPrismaQuery(
  parsed: ParsedQuery,
  options?: {
    searchFields?: string[];
    sortFields?: string[];
    filterFields?: string[];
  },
) {
  const { pagination, sort, search, filter } = parsed;
  const searchFields = options?.searchFields || [];
  const sortFields = options?.sortFields || [];
  const filterFields = options?.filterFields || [];
  const where: any = {};

  if (search.searchTerm && searchFields.length) {
    where.OR = searchFields.map((field) => ({
      [field]: {
        contains: search.searchTerm,
        mode: "insensitive",
      },
    }));
  }

  Object.entries(filter).forEach(([key, value]) => {
    if (value === undefined) return;
    if (filterFields.length && !filterFields.includes(key)) return;

    // Handle multiple value filtering (category, priority, and status)
    if (
      (key === "category" || key === "priority" || key === "status") &&
      typeof value === "string" &&
      value.includes(",")
    ) {
      // Split comma-separated values
      const values = value
        .split(",")
        .map((val: string) => val.trim())
        .filter(Boolean);
      where[key] = { in: values };
    } else {
      // Single value
      where[key] = value;
    }
  });

  const isSortable =
    sort.sortBy && (!sortFields.length || sortFields.includes(sort.sortBy));
  const orderBy = isSortable
    ? { [sort.sortBy as string]: sort.sortOrder || "asc" }
    : undefined;

  const skip = (pagination.page - 1) * pagination.limit;
  const take = pagination.limit;

  return { where, orderBy, skip, take };
}

function buildMeta(total: number, pagination: PaginationQuery) {
  const totalPages = Math.ceil(total / pagination.limit) || 1;
  return {
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages,
    hasNextPage: pagination.page < totalPages,
    hasPreviousPage: pagination.page > 1,
  };
}

export { buildMeta, buildPrismaQuery, parseQuery };
