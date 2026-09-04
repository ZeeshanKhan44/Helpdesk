import { useEffect, useState } from 'react';
import { Search, BookOpen, ThumbsUp, Eye, ArrowLeft, Lightbulb } from 'lucide-react';
import type { KnowledgeArticle } from '@/types';
import { fetchKnowledgeArticles } from '@/lib/agent';
import { supabase } from '@/lib/supabase';

export function KnowledgeBase() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [filtered, setFiltered] = useState<KnowledgeArticle[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selected, setSelected] = useState<KnowledgeArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await fetchKnowledgeArticles();
        if (active) {
          setArticles(data || []);
          setFiltered(data || []);
          setLoading(false);
        }
      } catch {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let result = articles;
    if (activeCategory !== 'all') {
      result = result.filter((a) => a.category === activeCategory);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q) ||
          a.tags.some((t) => t.includes(q)),
      );
    }
    setFiltered(result);
  }, [search, activeCategory, articles]);

  const categories = ['all', ...Array.from(new Set(articles.map((a) => a.category)))];

  async function openArticle(article: KnowledgeArticle) {
    setSelected(article);
    await supabase.from('knowledge_articles').update({ views: article.views + 1 }).eq('id', article.id);
  }

  async function markHelpful(article: KnowledgeArticle) {
    await supabase
      .from('knowledge_articles')
      .update({ helpful_count: article.helpful_count + 1 })
      .eq('id', article.id);
    setSelected({ ...article, helpful_count: article.helpful_count + 1 });
    setArticles((prev) =>
      prev.map((a) => (a.id === article.id ? { ...a, helpful_count: a.helpful_count + 1 } : a)),
    );
  }

  if (selected) {
    return (
      <div className="animate-fade-in max-w-3xl mx-auto">
        <button
          onClick={() => setSelected(null)}
          className="text-sm text-neutral-500 hover:text-neutral-700 font-medium flex items-center gap-1.5 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Knowledge Base
        </button>
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="badge bg-primary-100 text-primary-700 capitalize">{selected.category}</span>
          </div>
          <h2 className="text-2xl font-bold text-neutral-800">{selected.title}</h2>
          <div className="flex items-center gap-4 mt-3 text-xs text-neutral-400">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> {selected.views} views
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3.5 h-3.5" /> {selected.helpful_count} found this helpful
            </span>
          </div>
          <div className="mt-5 pt-5 border-t border-neutral-100">
            <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{selected.content}</p>
          </div>
          {selected.tags.length > 0 && (
            <div className="mt-5 pt-5 border-t border-neutral-100">
              <p className="text-xs font-semibold text-neutral-500 mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {selected.tags.map((tag) => (
                  <span key={tag} className="badge bg-neutral-100 text-neutral-500">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="mt-6 pt-5 border-t border-neutral-100 flex items-center justify-between">
            <p className="text-sm text-neutral-600">Was this article helpful?</p>
            <button onClick={() => markHelpful(selected)} className="btn-success">
              <ThumbsUp className="w-4 h-4" /> Yes, helpful
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-neutral-800">Knowledge Base</h2>
        <p className="text-sm text-neutral-500 mt-1">Self-service guides and answers to common questions</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          placeholder="Search articles, topics, or keywords..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Categories */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium capitalize transition-all ${
              activeCategory === cat
                ? 'bg-primary-600 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Articles */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-7 h-7 text-neutral-400" />
          </div>
          <p className="text-sm font-medium text-neutral-600">No articles found</p>
          <p className="text-xs text-neutral-400 mt-1">Try a different search term or category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((article) => (
            <button
              key={article.id}
              onClick={() => openArticle(article)}
              className="card p-5 text-left hover:border-primary-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="badge bg-primary-50 text-primary-600 capitalize mb-2">{article.category}</span>
                  <h3 className="text-sm font-semibold text-neutral-800 group-hover:text-primary-700 mt-1">
                    {article.title}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1.5 line-clamp-2">{article.content.split('\n')[0]}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0 group-hover:bg-primary-50 transition-colors">
                  <BookOpen className="w-5 h-5 text-neutral-400 group-hover:text-primary-600" />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3 text-xs text-neutral-400">
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> {article.views}
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsUp className="w-3.5 h-3.5" /> {article.helpful_count}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Hint */}
      <div className="card p-4 bg-primary-50/50 border-primary-100">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
          <p className="text-sm text-neutral-600">
            You can also ask the AI agent directly in any ticket chat. The agent will answer basic questions
            like how to change your password or how the VPN works without needing human approval.
          </p>
        </div>
      </div>
    </div>
  );
}
