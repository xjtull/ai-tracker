import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, type AISite, type Category, type ActivityHistory } from '../lib/supabase'
import { ArrowLeft, Star, Sparkles, Award, TrendingUp, DollarSign, ExternalLink, Heart, Tag } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'

// TypeScript类型修复
const ChartComponents = {
  AreaChart: AreaChart as any,
  Area: Area as any,
  XAxis: XAxis as any,
  YAxis: YAxis as any,
  CartesianGrid: CartesianGrid as any,
  Tooltip: Tooltip as any,
  ResponsiveContainer: ResponsiveContainer as any
}

export default function SiteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [site, setSite] = useState<AISite | null>(null)
  const [category, setCategory] = useState<Category | null>(null)
  const [activityHistory, setActivityHistory] = useState<ActivityHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [isFavorited, setIsFavorited] = useState(false)

  useEffect(() => {
    if (id) {
      fetchSiteDetail()
    }
  }, [id])

  async function fetchSiteDetail() {
    try {
      setLoading(true)

      // 获取网站信息
      const { data: siteData } = await supabase
        .from('ai_sites')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (siteData) {
        setSite(siteData)

        // 获取分类信息
        const { data: categoryData } = await supabase
          .from('site_categories')
          .select('*')
          .eq('id', siteData.category_id)
          .maybeSingle()

        if (categoryData) {
          setCategory(categoryData)
        }

        // 获取活跃度历史（最近30天）
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const { data: historyData } = await supabase
          .from('activity_history')
          .select('*')
          .eq('site_id', id)
          .gte('record_date', thirtyDaysAgo.toISOString().split('T')[0])
          .order('record_date', { ascending: true })

        if (historyData) {
          setActivityHistory(historyData)
        }
      }
    } catch (error) {
      console.error('Error fetching site detail:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFavorite = async () => {
    try {
      const action = isFavorited ? 'remove' : 'add'
      const { data, error } = await supabase.functions.invoke('manage-favorite', {
        body: { action, site_id: id, user_id: null }
      })

      if (error) {
        console.error('Favorite error:', error)
        return
      }

      setIsFavorited(!isFavorited)
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (!site) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">网站不存在</h2>
          <button
            onClick={() => navigate('/')}
            className="text-indigo-600 hover:text-indigo-800"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  const chartData = activityHistory.map(h => ({
    date: new Date(h.record_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
    活跃度: h.activity_score,
    访问量: Math.round(h.daily_visits_estimate / 1000), // 转换为k为单位
    社交提及: h.social_mentions
  }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            返回首页
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Site Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <h1 className="text-3xl font-bold text-gray-900">{site.name}</h1>
                {category && (
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                    {category.name}
                  </span>
                )}
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  site.is_free 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {site.is_free ? '免费' : site.pricing_model === 'freemium' ? '免费增值' : '付费'}
                </span>
              </div>
              <p className="text-lg text-gray-600 mb-6">{site.description}</p>
              
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm text-gray-700">
                    用户评分: <span className="font-semibold">{site.user_rating.toFixed(1)}/5.0</span>
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  <span className="text-sm text-gray-700">
                    奇葩度: <span className="font-semibold">{site.uniqueness_score}/100</span>
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Award className="h-5 w-5 text-indigo-500" />
                  <span className="text-sm text-gray-700">
                    创新性: <span className="font-semibold">{site.innovation_score}/100</span>
                  </span>
                </div>
              </div>

              <div className="flex space-x-3">
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all"
                >
                  <ExternalLink className="h-5 w-5 mr-2" />
                  访问网站
                </a>
                <button
                  onClick={handleFavorite}
                  className={`inline-flex items-center px-6 py-3 rounded-lg border-2 transition-all ${
                    isFavorited
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-red-500'
                  }`}
                >
                  <Heart className={`h-5 w-5 mr-2 ${isFavorited ? 'fill-current' : ''}`} />
                  {isFavorited ? '已收藏' : '收藏'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 活跃度趋势图 */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="h-6 w-6 mr-2 text-indigo-600" />
              活跃度趋势（最近30天）
            </h2>
            {chartData.length > 0 ? (
              <ChartComponents.ResponsiveContainer width="100%" height={300}>
                <ChartComponents.AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <ChartComponents.CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <ChartComponents.XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <ChartComponents.YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <ChartComponents.Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <ChartComponents.Area 
                    type="monotone" 
                    dataKey="活跃度" 
                    stroke="#6366f1" 
                    fillOpacity={1}
                    fill="url(#colorActivity)"
                    strokeWidth={2}
                  />
                </ChartComponents.AreaChart>
              </ChartComponents.ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">
                暂无活跃度历史数据
              </div>
            )}
          </div>

          {/* 统计信息 */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">详细统计</h3>
              <div className="space-y-4">
                {activityHistory.length > 0 && (
                  <>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">当前活跃度</span>
                        <span className="text-lg font-bold text-indigo-600">
                          {activityHistory[activityHistory.length - 1]?.activity_score || 0}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full transition-all"
                          style={{ width: `${activityHistory[activityHistory.length - 1]?.activity_score || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-600">日均访问</span>
                        <span className="text-sm font-semibold">
                          {(activityHistory[activityHistory.length - 1]?.daily_visits_estimate || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-600">社交提及</span>
                        <span className="text-sm font-semibold">
                          {activityHistory[activityHistory.length - 1]?.social_mentions || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">趋势</span>
                        <span className={`text-sm font-semibold ${
                          activityHistory[activityHistory.length - 1]?.trend === 'rising' ? 'text-green-600' :
                          activityHistory[activityHistory.length - 1]?.trend === 'falling' ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {activityHistory[activityHistory.length - 1]?.trend === 'rising' ? '上升' :
                           activityHistory[activityHistory.length - 1]?.trend === 'falling' ? '下降' : '稳定'}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 广告位预留 */}
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg shadow-sm p-6 border-2 border-dashed border-gray-300">
              <div className="text-center">
                <DollarSign className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 font-medium">广告位</p>
                <p className="text-xs text-gray-400 mt-1">推广位招商中</p>
              </div>
            </div>
          </div>
        </div>

        {/* 标签系统 */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Tag className="h-5 w-5 mr-2 text-indigo-600" />
            相关标签
          </h3>
          <div className="flex flex-wrap gap-2">
            {/* 示例标签，后续可以动态化 */}
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm">
              AI工具
            </span>
            {category && (
              <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                {category.name}
              </span>
            )}
            {site.is_free && (
              <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                免费
              </span>
            )}
            {site.innovation_score > 85 && (
              <span className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-sm">
                高创新
              </span>
            )}
            {site.uniqueness_score > 85 && (
              <span className="px-3 py-1 bg-pink-50 text-pink-700 rounded-full text-sm">
                独特
              </span>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
