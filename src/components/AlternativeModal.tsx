import { X, ExternalLink, Star, Check, Info } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface AlternativeModalProps {
  tool: any
  alternatives: any[]
  onClose: () => void
}

export default function AlternativeModal({ tool, alternatives, onClose }: AlternativeModalProps) {
  const navigate = useNavigate()

  const handleViewDetail = async (altName: string) => {
    try {
      // 根据工具名称查询ID
      const { data, error } = await supabase
        .from('ai_sites')
        .select('id')
        .eq('name', altName)
        .eq('region', 'domestic')
        .single()

      if (error || !data) {
        console.error('Failed to fetch site ID:', error)
        return
      }

      navigate(`/site/${data.id}`)
      onClose()
    } catch (err) {
      console.error('Error navigating to detail:', err)
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in" 
      onClick={onClose}
      role="dialog"
      aria-labelledby="modal-title"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] overflow-hidden animate-slide-up" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 id="modal-title" className="text-xl font-bold text-gray-900">国内平替工具推荐</h3>
              <p className="text-sm text-gray-600 mt-1">为您推荐国内可访问的类似AI工具</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-white transition-colors"
              aria-label="关闭对话框"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Global Tool Info */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl font-bold text-indigo-600">
                  {tool.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h4 className="text-lg font-semibold text-gray-900">{tool.name}</h4>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                  全球工具
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{tool.description}</p>
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                {tool.user_rating && (
                  <span className="flex items-center">
                    <Star className="h-3 w-3 mr-1 text-yellow-500 fill-yellow-500" />
                    {tool.user_rating.toFixed(1)}
                  </span>
                )}
                {tool.pricing_model && (
                  <span className={`px-2 py-0.5 rounded ${
                    tool.is_free ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {tool.is_free ? '免费' : tool.pricing_model === 'freemium' ? '免费增值' : '付费'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Alternatives List */}
        <div className="p-6 overflow-y-auto max-h-[50vh] smooth-scroll">
          <div className="space-y-4">
            {alternatives && alternatives.length > 0 ? (
              alternatives.map((alt, index) => (
                <div 
                  key={index} 
                  className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-all duration-200 bg-white hover:border-indigo-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h5 className="text-lg font-semibold text-gray-900">{alt.name}</h5>
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded flex items-center space-x-1">
                          <span>国内可用</span>
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{alt.description}</p>
                    </div>
                    {alt.similarity && (
                      <div className="ml-4 flex-shrink-0">
                        <div className="flex flex-col items-center">
                          <div className="relative w-16 h-16">
                            <svg className="w-16 h-16 transform -rotate-90">
                              <circle
                                cx="32"
                                cy="32"
                                r="28"
                                stroke="#e5e7eb"
                                strokeWidth="4"
                                fill="none"
                              />
                              <circle
                                cx="32"
                                cy="32"
                                r="28"
                                stroke="#10b981"
                                strokeWidth="4"
                                fill="none"
                                strokeDasharray={`${2 * Math.PI * 28 * alt.similarity / 100} ${2 * Math.PI * 28}`}
                                className="transition-all duration-1000"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-sm font-bold text-green-600">{alt.similarity}%</span>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500 mt-1">相似度</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  {alt.features && alt.features.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-700 mb-2">核心功能：</p>
                      <div className="flex flex-wrap gap-2">
                        {alt.features.slice(0, 5).map((feature: string, idx: number) => (
                          <span 
                            key={idx} 
                            className="flex items-center space-x-1 px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded"
                          >
                            <Check className="h-3 w-3" />
                            <span>{feature}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center space-x-3 pt-3 border-t border-gray-100">
                    {alt.url && (
                      <a
                        href={alt.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors touch-target shadow-sm hover:shadow-md"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>访问工具</span>
                      </a>
                    )}
                    <button 
                      onClick={() => handleViewDetail(alt.name)}
                      className="flex items-center space-x-2 px-4 py-2 border-2 border-indigo-600 text-indigo-600 text-sm font-medium rounded-lg hover:bg-indigo-50 transition-colors touch-target"
                    >
                      <Info className="h-4 w-4" />
                      <span>查看详情</span>
                    </button>
                  </div>

                  {/* Advantages Tag */}
                  {index === 0 && (
                    <div className="mt-3 inline-flex items-center space-x-1 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                      <span>推荐首选</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">暂无平替工具推荐</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-center text-gray-500">
            平替工具由智能算法自动匹配，相似度仅供参考
          </p>
        </div>
      </div>
    </div>
  )
}
