'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, TrendingUp, BookOpen, Loader2, Plus, Sparkles } from 'lucide-react'

interface HotItem {
  id: string
  title: string
  excerpt: string
  hot_value: number
  url: string
}

interface SearchResult {
  id: string
  title: string
  excerpt: string
  url: string
  author?: { name: string }
  voteup_count?: number
}

export default function DiscoverClient() {
  const [hotList, setHotList] = useState<HotItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedGenre, setSelectedGenre] = useState('悬疑')

  const genres = ['悬疑', '言情', '科幻', '奇幻']

  useEffect(() => {
    fetchHotList()
  }, [])

  const fetchHotList = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/zhihu/hot')
      const data = await response.json()
      setHotList(data.hotList || [])
    } catch (error) {
      console.error('Error fetching hot list:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const response = await fetch(`/api/zhihu/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()
      setSearchResults(data.results || [])
    } catch (error) {
      console.error('Error searching:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleGenerateStory = async (
    sourceTitle?: string,
    sourceExcerpt?: string,
    genre?: string
  ) => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/stories/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre: genre || selectedGenre,
          sourceTitle,
          sourceExcerpt,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // 跳转到故事页面
        window.location.href = `/story/${data.story.id}`
      } else {
        alert(data.error || '生成失败')
      }
    } catch (error) {
      console.error('Error generating story:', error)
      alert('生成失败，请重试')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* 头部 */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回
          </Link>
          <h1 className="font-semibold text-slate-900">发现故事素材</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 搜索区域 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            从知乎搜索故事灵感
          </h2>

          {/* 类型选择 */}
          <div className="flex gap-2 mb-4">
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  selectedGenre === genre
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>

          {/* 搜索框 */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜索知乎内容..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {isSearching ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                '搜索'
              )}
            </button>
          </div>

          {/* 快速生成按钮 */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={() => handleGenerateStory(undefined, undefined, selectedGenre)}
              disabled={isGenerating}
              className="w-full py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl hover:from-primary-600 hover:to-accent-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  正在生成...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  根据热门{selectedGenre}内容自动生成剧本
                </>
              )}
            </button>
          </div>
        </div>

        {/* 搜索结果 */}
        {searchResults.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              搜索结果
            </h2>
            <div className="space-y-4">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <h3 className="font-medium text-slate-900 mb-2">
                    {result.title}
                  </h3>
                  <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                    {result.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-400">
                      {result.author?.name && `作者：${result.author.name}`}
                      {result.voteup_count && ` · ${result.voteup_count} 赞同`}
                    </div>
                    <button
                      onClick={() =>
                        handleGenerateStory(result.title, result.excerpt, selectedGenre)
                      }
                      disabled={isGenerating}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      生成剧本
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 热榜 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-slate-900">知乎热榜</h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : hotList.length > 0 ? (
            <div className="space-y-4">
              {hotList.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-900 mb-2">
                        {item.title}
                      </h3>
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                        {item.excerpt}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-slate-400">
                          热度：{(item.hot_value / 10000).toFixed(1)}万
                        </div>
                        <button
                          onClick={() =>
                            handleGenerateStory(item.title, item.excerpt, selectedGenre)
                          }
                          disabled={isGenerating}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                          <BookOpen className="w-4 h-4" />
                          改编成剧本
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">暂无热榜数据</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
