import { useState, useEffect, useMemo, Suspense, lazy } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, type AISite, type Category, type Ranking, type SiteWithCategory } from '../lib/supabase'
import { isSiteAvailableInChina } from '../data/domesticAvailableSites'
import { Search, TrendingUp, Star, Sparkles, DollarSign, Award, Activity, Menu, X, Globe, Calendar } from 'lucide-react'

// 懒加载组件
const AlternativeModal = lazy(() => import('../components/AlternativeModal'))

export default function HomePage() {
  const navigate = useNavigate()
  const [sites, setSites] = useState<SiteWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [rankings, setRankings] = useState<Record<string, Ranking[]>>({})
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  
  const [activeBoard, setActiveBoard] = useState<'global' | 'domestic'>('global')
  const [globalSearchTerm, setGlobalSearchTerm] = useState('')
  const [domesticSearchTerm, setDomesticSearchTerm] = useState('')
  const [activeRankType, setActiveRankType] = useState<string>('daily_activity')
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showAlternativeModal, setShowAlternativeModal] = useState<{show: boolean, tool: any, alternatives: any[]}>({show: false, tool: null, alternatives: []})

  // 统计数据
  const [stats, setStats] = useState({
    totalCount: 0,
    globalCount: 0,
    domesticCount: 0,
    categoryCount: 0
  })

  const rankTypes = [
    { key: 'daily_activity', label: '日活跃度', icon: Activity },
    { key: 'weekly_activity', label: '周活跃度', icon: TrendingUp },
    { key: 'monthly_activity', label: '月活跃度', icon: Calendar },
    { key: 'trending', label: '上升最快', icon: TrendingUp },
    { key: 'uniqueness', label: '奇葩度', icon: Sparkles },
    { key: 'innovation', label: '创新性', icon: Award },
    { key: 'user_rating', label: '用户评分', icon: Star },
    { key: 'free_products', label: '免费产品', icon: DollarSign },
  ]

  useEffect(() => {
    fetchData()
  }, [])

  // 监听榜单类型和board变化，确保数据正确加载
  useEffect(() => {
    if (!loading && Object.keys(rankings).length > 0) {
      const currentRankings = rankings[`${activeBoard}_${activeRankType}`]
      if (!currentRankings || currentRankings.length === 0) {
        loadRankingData()
      }
    }
  }, [activeBoard, activeRankType, loading, rankings])

  // 键盘导航支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAlternativeModal.show) {
        setShowAlternativeModal({show: false, tool: null, alternatives: []})
      }
      if (e.key >= '1' && e.key <= '8' && !showAlternativeModal.show) {
        const index = parseInt(e.key) - 1
        if (rankTypes[index]) {
          setActiveRankType(rankTypes[index].key)
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showAlternativeModal.show])

  async function fetchData() {
    try {
      setLoading(true)

      // 获取分类
      const { data: categoriesData } = await supabase
        .from('site_categories')
        .select('*')
        .order('name')

      if (categoriesData) {
        setCategories(categoriesData)
      }

      // 获取所有网站统计
      const { data: allSitesData } = await supabase
        .from('ai_sites')
        .select('id, region')
        .eq('status', 'active')

      if (allSitesData) {
        const globalCount = allSitesData.filter(site => site.region === 'global').length
        const domesticCount = allSitesData.filter(site => site.region === 'domestic').length
        setStats({
          totalCount: allSitesData.length,
          globalCount,
          domesticCount,
          categoryCount: categoriesData?.length || 0
        })
      }

      // 加载所有工具数据
      await loadAllSites()
      await loadRankingData()
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadAllSites() {
    // 加载所有活跃工具
    const { data: sitesData } = await supabase
      .from('ai_sites')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (sitesData) {
      setSites(sitesData)
    }
  }

  async function loadRankingData() {
    // 获取最新的分离榜单排名数据
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    
    const { data: globalRankingsData } = await supabase
      .from('rankings')
      .select('*')
      .eq('period_end', yesterdayStr)
      .eq('region', 'global')
      .order('rank_position')

    const { data: domesticRankingsData } = await supabase
      .from('rankings')
      .select('*')
      .eq('period_end', yesterdayStr)
      .eq('region', 'domestic')
      .order('rank_position')

    const allRankingsData = [...(globalRankingsData || []), ...(domesticRankingsData || [])]

    if (allRankingsData && allRankingsData.length > 0) {
      const grouped = allRankingsData.reduce((acc, ranking) => {
        const key = `${ranking.region}_${ranking.rank_type}`
        if (!acc[key]) {
          acc[key] = []
        }
        acc[key].push(ranking)
        return acc
      }, {} as Record<string, Ranking[]>)
      setRankings(grouped)
    } else {
      // 如果没有找到排名数据，尝试获取最新的任何可用数据
      const { data: anyRankingsData } = await supabase
        .from('rankings')
        .select('*')
        .in('region', ['global', 'domestic'])
        .order('period_end', { ascending: false })
        .limit(1000) // 增加限制以获取更多数据
      
      if (anyRankingsData && anyRankingsData.length > 0) {
        const latestPeriod = anyRankingsData[0].period_end
        const latestData = anyRankingsData.filter(r => r.period_end === latestPeriod)
        const grouped = latestData.reduce((acc, ranking) => {
          const key = `${ranking.region}_${ranking.rank_type}`
          if (!acc[key]) {
            acc[key] = []
          }
          acc[key].push(ranking)
          return acc
        }, {} as Record<string, Ranking[]>)
        setRankings(grouped)
      }
    }
  }

  // 滚动到页面顶部的辅助函数
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  // 搜索和筛选逻辑
  const filteredSites = useMemo(() => {
    return sites.filter(site => {
      const matchesCategory = selectedCategory === 'all' || site.category_id.toString() === selectedCategory
      const searchTerm = activeBoard === 'global' ? globalSearchTerm : domesticSearchTerm
      const matchesSearch = !searchTerm || 
        site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        site.description.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [sites, selectedCategory, activeBoard, globalSearchTerm, domesticSearchTerm])

  const getRankedSites = useMemo(() => {
    const currentRankings = rankings[`${activeBoard}_${activeRankType}`] || []
    
    // 先将rankings和sites关联起来
    const rankedSitesList = currentRankings
      .map(ranking => {
        const site = sites.find(s => s.id === ranking.site_id)
        return site ? { ...site, originalRank: ranking.rank_position, score: ranking.score } : null
      })
      .filter(Boolean) as (SiteWithCategory & { originalRank: number; score: number })[]
    
    // 应用搜索和分类筛选
    const filtered = rankedSitesList.filter(site => {
      const matchesCategory = selectedCategory === 'all' || site.category_id.toString() === selectedCategory
      const searchTerm = activeBoard === 'global' ? globalSearchTerm : domesticSearchTerm
      const matchesSearch = !searchTerm || 
        site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        site.description.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesCategory && matchesSearch
    })
    
    // 按score排序（从高到低）
    const sorted = filtered.sort((a, b) => b.score - a.score)
    
    // 根据是否筛选决定rank显示
    const searchTerm = activeBoard === 'global' ? globalSearchTerm : domesticSearchTerm
    if (selectedCategory !== 'all' || searchTerm) {
      // 筛选后重新从1开始编号
      return sorted.map((site, index) => ({
        ...site,
        rank: index + 1
      }))
    } else {
      // 未筛选时保持原有rank
      return sorted.map(site => ({
        ...site,
        rank: site.originalRank
      }))
    }
  }, [rankings, activeBoard, activeRankType, sites, selectedCategory, globalSearchTerm, domesticSearchTerm])

  const rankedSites = getRankedSites

  // 显示筛选提示
  const searchTerm = activeBoard === 'global' ? globalSearchTerm : domesticSearchTerm
  const showFilterHint = searchTerm || selectedCategory !== 'all'

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  AI网站追踪平台
                </h1>
                <p className="text-sm text-gray-500">发现和追踪最新的AI工具</p>
              </div>
            </div>

            <button
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="切换菜单"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* 榜单说明 */}
          <div className="mt-4 space-y-3">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <Globe className="h-5 w-5 text-indigo-600 mt-0.5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {activeBoard === 'global' ? '全球AI工具排行榜' : '国内AI工具排行榜'}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {activeBoard === 'global' 
                      ? '全球主要AI工具平台，8种维度排名算法，智能搜索与筛选，实时活跃度追踪'
                      : '国内主流AI工具平台，8种维度排名算法，智能搜索与筛选，实时活跃度追踪'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* 实时统计数据 */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2 bg-indigo-50 px-3 py-1.5 rounded-lg">
                  <span className="text-gray-600">当前榜单:</span>
                  <span className="font-semibold text-indigo-600">
                    {activeBoard === 'global' 
                      ? `${stats.globalCount || 55} 个工具`
                      : `${stats.domesticCount || 53} 个工具`
                    }
                  </span>
                </div>
                <div className="hidden sm:flex items-center space-x-2 bg-green-50 px-3 py-1.5 rounded-lg">
                  <Activity className="h-4 w-4 text-green-600" />
                  <span className="text-gray-600">实时更新</span>
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar - 增强版 */}
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={`搜索${activeBoard === 'global' ? '全球' : '国内'}AI工具名称或功能...`}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                value={activeBoard === 'global' ? globalSearchTerm : domesticSearchTerm}
                onChange={(e) => activeBoard === 'global' ? setGlobalSearchTerm(e.target.value) : setDomesticSearchTerm(e.target.value)}
                aria-label={`搜索${activeBoard === 'global' ? '全球' : '国内'}AI工具`}
                style={{ fontSize: '16px' }} // 防止iOS缩放
              />
              {(activeBoard === 'global' ? globalSearchTerm : domesticSearchTerm) && (
                <button
                  onClick={() => activeBoard === 'global' ? setGlobalSearchTerm('') : setDomesticSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="清除搜索"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Board切换按钮 */}
            <div className="flex items-center space-x-2 mt-3">
              <span className="text-sm font-medium text-gray-700">榜单类型：</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveBoard('global')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    activeBoard === 'global'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  全球榜
                </button>
                <button
                  onClick={() => setActiveBoard('domestic')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    activeBoard === 'domestic'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  国内榜
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className={`lg:block ${mobileMenuOpen ? 'block' : 'hidden'} lg:col-span-1`}>
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24 space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4 text-gray-900">分类筛选</h2>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setSelectedCategory('all')
                      scrollToTop()
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors touch-target ${
                      selectedCategory === 'all'
                        ? 'bg-indigo-100 text-indigo-700 font-medium'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                    aria-label="显示全部分类"
                  >
                    全部分类
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category.id.toString())
                        scrollToTop()
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors touch-target ${
                        selectedCategory === category.id.toString()
                          ? 'bg-indigo-100 text-indigo-700 font-medium'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                      aria-label={`筛选${category.name}分类`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 数据统计面板 */}
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-3">数据统计</h3>
                <div className="space-y-3">
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">工具总数</span>
                      <span className="text-xl font-bold text-indigo-600">{stats.totalCount}</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">分类数</span>
                      <span className="text-xl font-bold text-green-600">{stats.categoryCount}</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">榜单类型</span>
                      <span className="text-lg font-bold text-purple-600">8种</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 广告位预留 */}
              <div className="pt-6 border-t border-gray-200">
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-6 border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <DollarSign className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 font-medium">广告位</p>
                    <p className="text-xs text-gray-400 mt-1">推广位招商中</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Content Area */}
          <div className="lg:col-span-3">
            {/* Ranking Type Selector */}
            <div className="mb-6">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">排行榜类型</h2>
                  <span className="text-xs text-gray-500 hidden sm:inline">使用数字键 1-8 快速切换</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {rankTypes.map((type, index) => {
                    const Icon = type.icon
                    return (
                      <button
                        key={type.key}
                        onClick={() => {
                          setActiveRankType(type.key)
                          scrollToTop()
                        }}
                        className={`flex flex-col items-center p-3 rounded-lg transition-all duration-200 touch-target ${
                          activeRankType === type.key
                            ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg scale-105'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100 active:scale-95'
                        }`}
                        aria-label={`切换到${type.label}排行榜`}
                      >
                        <Icon className="h-5 w-5 mb-1" />
                        <span className="text-xs font-medium text-center">{type.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Rankings Display */}
            <div className="transition-all duration-300 opacity-100 translate-y-0">
              {rankedSites.length > 0 ? (
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">
                      {rankTypes.find(t => t.key === activeRankType)?.label}排行榜
                    </h2>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-gray-500">
                        {showFilterHint ? (
                          <span>
                            显示 {rankedSites.length} 个结果
                            {searchTerm && <span className="ml-1 text-indigo-600">（搜索: "{searchTerm}"）</span>}
                            {selectedCategory !== 'all' && <span className="ml-1 text-indigo-600">（已筛选分类）</span>}
                          </span>
                        ) : (
                          <span>完整榜单 - {rankedSites.length} 个AI工具</span>
                        )}
                      </p>
                      {showFilterHint && (
                        <button
                          onClick={() => {
                            setGlobalSearchTerm('')
                            setDomesticSearchTerm('')
                            setSelectedCategory('all')
                            scrollToTop()
                          }}
                          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          清除筛选
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {rankedSites.map((site) => (
                      <div 
                        key={site.id} 
                        className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/site/${site.id}`)}
                        role="article"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && navigate(`/site/${site.id}`)}
                      >
                        <div className="flex items-start space-x-4">
                          <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg ${
                            site.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                            site.rank === 2 ? 'bg-gray-100 text-gray-700' :
                            site.rank === 3 ? 'bg-orange-100 text-orange-700' :
                            'bg-indigo-50 text-indigo-600'
                          }`}>
                            {site.rank}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {site.name}
                                </h3>
                                {/* 国内平替标签 */}
                                {site.has_domestic_alternative && site.domestic_alternatives && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setShowAlternativeModal({
                                        show: true,
                                        tool: site,
                                        alternatives: site.domestic_alternatives
                                      })
                                    }}
                                    className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded hover:bg-red-600 transition-colors flex items-center space-x-1 touch-target active:scale-95"
                                    aria-label={`查看${site.name}的国内平替工具`}
                                  >
                                    <span>国内平替</span>
                                  </button>
                                )}
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                site.is_free 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {site.is_free ? '免费' : site.pricing_model === 'freemium' ? '免费增值' : '付费'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{site.description}</p>
                            <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                              <span className="flex items-center">
                                <Star className="h-3 w-3 mr-1 text-yellow-500" />
                                评分: {site.user_rating.toFixed(1)}
                              </span>
                              <span className="flex items-center">
                                <Sparkles className="h-3 w-3 mr-1 text-purple-500" />
                                奇葩度: {site.uniqueness_score}
                              </span>
                              <span className="flex items-center">
                                <Award className="h-3 w-3 mr-1 text-indigo-500" />
                                创新性: {site.innovation_score}
                              </span>
                              {activeRankType !== 'user_rating' && activeRankType !== 'uniqueness' && activeRankType !== 'innovation' && (
                                <span className="flex items-center">
                                  <Activity className="h-3 w-3 mr-1 text-green-500" />
                                  得分: {site.score.toFixed(1)}
                                </span>
                              )}
                            </div>
                            <div className="mt-3 flex items-center space-x-2">
                              {activeBoard === 'global' && isSiteAvailableInChina(site.name, 'global') && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                  国内可用
                                </span>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(site.url, '_blank')
                                }}
                                className="inline-block text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                                aria-label={`访问${site.name}网站`}
                              >
                                访问网站 →
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                  <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  {showFilterHint ? (
                    <>
                      <p className="text-gray-600 mb-2">未找到匹配的结果</p>
                      <button
                        onClick={() => {
                          setGlobalSearchTerm('')
                          setDomesticSearchTerm('')
                          setSelectedCategory('all')
                        }}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                      >
                        清除筛选条件
                      </button>
                    </>
                  ) : (
                    <p className="text-gray-600">暂无排名数据</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 平替产品Modal - 增强版 */}
      <Suspense fallback={null}>
        {showAlternativeModal.show && (
          <AlternativeModal
            tool={showAlternativeModal.tool}
            alternatives={showAlternativeModal.alternatives}
            onClose={() => setShowAlternativeModal({show: false, tool: null, alternatives: []})}
          />
        )}
      </Suspense>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
            <p>AI网站追踪平台 - 发现最新最热的AI工具</p>
            <p className="mt-2">数据实时更新 | 已收录 {stats.totalCount} 个AI工具</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
