'use client'

import React, { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  copied: boolean
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, copied: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, copied: false }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, copied: false })
  }

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, copied: false })
    window.location.href = '/'
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, copied: false })
    window.location.reload()
  }

  handleCopyError = async () => {
    if (!this.state.error) return
    const errorInfo = [
      `خطأ: ${this.state.error.message}`,
      `المكون: ${this.state.error.stack?.split('\n')[1]?.trim() || 'غير معروف'}`,
      `الوقت: ${new Date().toLocaleString('ar-SA')}`,
      `المتصفح: ${navigator.userAgent}`,
      ``,
      `Stack Trace:`,
      this.state.error.stack,
    ].join('\n')

    try {
      await navigator.clipboard.writeText(errorInfo)
      this.setState({ copied: true })
      toast.success('تم نسخ تفاصيل الخطأ')
      setTimeout(() => this.setState({ copied: false }), 3000)
    } catch {
      // Fallback
      const textarea = document.createElement('textarea')
      textarea.value = errorInfo
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      this.setState({ copied: true })
      toast.success('تم نسخ تفاصيل الخطأ')
      setTimeout(() => this.setState({ copied: false }), 3000)
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[500px] flex items-center justify-center p-6">
          <div className="max-w-lg w-full">
            {/* Error Illustration */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                {/* Outer ring */}
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-950/30 dark:to-rose-950/20 flex items-center justify-center">
                  {/* Inner ring */}
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/10 flex items-center justify-center">
                    <AlertTriangle className="w-10 h-10 text-red-500 dark:text-red-400" />
                  </div>
                </div>
                {/* Decorative dots */}
                <div className="absolute -top-1 -right-1 size-3 rounded-full bg-amber-400/60 animate-pulse" />
                <div className="absolute -bottom-2 -left-2 size-2 rounded-full bg-red-400/60 animate-pulse delay-300" />
                <div className="absolute top-1 -left-3 size-2 rounded-full bg-rose-400/40 animate-pulse delay-700" />
              </div>
            </div>

            {/* Error Message */}
            <div className="text-center space-y-3 mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                حدث خطأ غير متوقع
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-sm mx-auto">
                نعتذر عن هذا الخطأ. يمكنك المحاولة مرة أخرى أو العودة للصفحة الرئيسية.
              </p>
            </div>

            {/* Error Details Card */}
            <div className="bg-red-50/50 dark:bg-red-950/10 border border-red-200/50 dark:border-red-800/30 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="size-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="size-4 text-red-500 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">
                    تفاصيل الخطأ
                  </p>
                  <p className="text-xs font-mono text-red-600/80 dark:text-red-300/80 break-all leading-relaxed line-clamp-3">
                    {this.state.error?.message || 'خطأ غير معروف'}
                  </p>
                  {process.env.NODE_ENV === 'development' && this.state.error?.stack && (
                    <details className="mt-2">
                      <summary className="text-[10px] text-red-500 cursor-pointer hover:text-red-400">
                        عرض Stack Trace
                      </summary>
                      <pre className="mt-1 text-[10px] font-mono text-red-600/60 dark:text-red-300/60 overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={this.handleReset}
                className="gap-2 w-full sm:w-auto"
              >
                <RefreshCw className="w-4 h-4" />
                إعادة المحاولة
              </Button>
              <Button
                variant="outline"
                onClick={this.handleCopyError}
                className="gap-2 w-full sm:w-auto border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/20"
              >
                {this.state.copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    تم النسخ!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    نسخ تفاصيل الخطأ
                  </>
                )}
              </Button>
              <Button
                onClick={this.handleGoHome}
                className="gap-2 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Home className="w-4 h-4" />
                الصفحة الرئيسية
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
