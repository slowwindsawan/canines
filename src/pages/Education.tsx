import React, { useEffect, useState } from 'react';
import { BookOpen, ArrowRight, Clock, Search } from 'lucide-react';
import { jwtRequest } from '../env';

type Article = {
  id: string;
  title: string;
  summary?: string;
  content?: string;
  category?: string;
  author_id?: string | null;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

const categories = [
  { id: 'all', name: 'All Articles' },
  { id: 'Digestive Health', name: 'Digestive Health' },
  { id: 'Supplements', name: 'Supplements' },
  { id: 'Lifestyle', name: 'Lifestyle' },
  { id: 'Nutrition', name: 'Nutrition' },
];

const PAGE_SIZE = 3; // load 3 articles per click

const Education: React.FC = () => {
  // listing
  const [articles, setArticles] = useState<Article[]>([]);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // detail
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [query, setQuery] = useState<string>('');
  const [author, setAuthor] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // ui state
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to build query string
  const buildQueryString = (pageNum: number) => {
    const params = new URLSearchParams();
    params.append('page', String(pageNum));
    params.append('page_size', String(PAGE_SIZE));

    // only append filters when they are set
    if (query.trim()) params.append('search', query.trim());
    if (selectedCategory !== 'all') params.append('category', selectedCategory);
    if (author.trim()) params.append('author_id', author.trim());
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);

    return params.toString();
  };

  // initial load: first page unfiltered
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const qs = buildQueryString(1);
        const resp: Article[] = await jwtRequest(`/admin/articles?${qs}`, 'GET');
        setArticles(resp || []);
        setPage(1);
        setHasMore((resp?.length ?? 0) >= PAGE_SIZE);
      } catch (e) {
        console.error(e);
        setError('Failed to load articles.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fetch page from server; reset=true means replace list (used for new search)
  const fetchPage = async (pageNum: number, reset = false) => {
    if (!reset && !hasMore) return;
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const qs = buildQueryString(pageNum);
      const resp: Article[] = await jwtRequest(`/admin/articles?${qs}`, 'GET');
      const items = resp || [];

      if (reset) {
        setArticles(items);
        setPage(1);
      } else {
        setArticles((prev) => [...prev, ...items]);
        setPage(pageNum);
      }

      // If server returned fewer than PAGE_SIZE -> no more
      setHasMore(items.length >= PAGE_SIZE);
    } catch (e) {
      console.error(e);
      setError('Failed to load articles.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // load more handler
  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    const nextPage = page + 1;
    void fetchPage(nextPage, false);
  };

  // search (requires query + category selected)
  const onSearchClick = () => {
    if (!query.trim() || selectedCategory === 'all') {
      setError('Please enter a search query and select a category before searching.');
      return;
    }
    setError(null);
    // Use page 1 and reset list
    void fetchPage(1, true);
  };

  const onResetFilters = () => {
    setQuery('');
    setAuthor('');
    setDateFrom('');
    setDateTo('');
    setSelectedCategory('all');
    setError(null);
    // reload first page unfiltered
    void fetchPage(1, true);
  };

  // open article detail (server GET)
  const openArticle = async (id: string) => {
    setSelectedArticleId(id);
    setSelectedArticle(null);
    setLoadingDetail(true);
    try {
      const article: Article = await jwtRequest(`/admin/articles/${id}`, 'GET');
      setSelectedArticle(article);
    } catch (e) {
      console.error(e);
      setError('Failed to load article.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDetail = () => {
    setSelectedArticleId(null);
    setSelectedArticle(null);
  };

  // render detail
  if (selectedArticleId) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={closeDetail}
            className="mb-6 flex items-center space-x-2 text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            <span>Back to Articles</span>
          </button>

          <article className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            {loadingDetail ? (
              <div className="text-center py-12">Loading article…</div>
            ) : selectedArticle ? (
              <>
                <div className="mb-6">
                  <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                      {selectedArticle.category}
                    </span>
                    <span>•</span>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        {selectedArticle.published_at
                          ? `${Math.max(
                              1,
                              Math.round((Date.now() - new Date(selectedArticle.published_at).getTime()) / 60000)
                            )} min ago`
                          : 'Unpublished'}
                      </span>
                    </div>
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">{selectedArticle.title}</h1>
                  <p className="text-lg text-gray-600">{selectedArticle.summary}</p>
                </div>

                <div className="prose prose-emerald max-w-none">
                  <p className="text-gray-700 leading-relaxed">
                    {selectedArticle.content || `This article has no full content available.`}
                  </p>

                  <div className="mt-8 text-sm text-gray-500">
                    <div>Author ID: {selectedArticle.author_id ?? '—'}</div>
                    <div>Published at: {selectedArticle.published_at ?? '—'}</div>
                    <div>Created at: {selectedArticle.created_at ?? '—'}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-red-600">Article not found.</div>
            )}
          </article>
        </div>
      </div>
    );
  }

  // main list render
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BookOpen className="h-12 w-12 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Educational Resources</h1>
          <p className="text-lg text-gray-600">Expert guidance for your dog's health and wellbeing</p>
        </div>

        {/* Articles grid */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {selectedCategory === 'all' ? 'All Articles' : `${selectedCategory} Articles`}
          </h2>

          {loading ? (
            <div className="text-center py-12">Loading articles…</div>
          ) : articles.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
              <p className="text-gray-600">Try updating your filters or reset.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((article) => (
                  <div
                    key={article.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => openArticle(article.id)}
                  >
                    <div className="p-6">
                      <div className="flex items-center space-x-2 text-sm mb-3">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                          {article.category ?? '—'}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">{article.summary}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Clock className="h-4 w-4" />
                          <span>{article.published_at ? new Date(article.published_at).toLocaleDateString() : 'Unpublished'}</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-emerald-600" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* manual load more button */}
              {hasMore ? (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="px-5 py-2 rounded-lg bg-brand-midgrey text-white hover:bg-brand-charcoal transition disabled:opacity-60"
                  >
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              ) : (
                <div className="mt-6 text-center text-sm text-gray-500">You've reached the end.</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Education;
