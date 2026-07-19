function parsePagination(query, { defaultSize = 20, maxSize = 50 } = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(maxSize, Math.max(1, Number(query.page_size) || defaultSize));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

module.exports = { parsePagination };
