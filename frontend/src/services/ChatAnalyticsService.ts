import { Message } from '@adoptdontshop/libs/conversations'

interface MessageMetrics {
  messageId: string
  timestamp: number
  userId: string
  chatId: string
  messageLength: number
  hasAttachments: boolean
  attachmentTypes: string[]
  reactions: string[]
  editCount: number
  deliveryTime: number
  readTime: number
}

interface UserEngagement {
  userId: string
  sessionStart: number
  sessionEnd: number
  messageCount: number
  reactionCount: number
  typingCount: number
  readCount: number
}

interface PerformanceMetrics {
  eventType: string
  timestamp: number
  duration: number
  success: boolean
  errorType?: string
}

export default class ChatAnalyticsService {
  private static instance: ChatAnalyticsService
  private messageMetrics: MessageMetrics[] = []
  private userEngagements: Map<string, UserEngagement> = new Map()
  private performanceMetrics: PerformanceMetrics[] = []

  private constructor() {
    // Initialize analytics
    this.setupPerformanceMonitoring()
  }

  public static getInstance(): ChatAnalyticsService {
    if (!ChatAnalyticsService.instance) {
      ChatAnalyticsService.instance = new ChatAnalyticsService()
    }
    return ChatAnalyticsService.instance
  }

  // Message Analytics
  public trackMessage(message: Message, deliveryTime: number): void {
    const metrics: MessageMetrics = {
      messageId: message.message_id,
      timestamp: Date.now(),
      userId: message.sender_id,
      chatId: message.chat_id,
      messageLength: message.content.length,
      hasAttachments: message.attachments?.length > 0 || false,
      attachmentTypes: message.attachments?.map((a) => a.mimeType) || [],
      reactions: [],
      editCount: 0,
      deliveryTime,
      readTime: 0,
    }

    this.messageMetrics.push(metrics)
    this.updateUserEngagement(message.sender_id, 'message')
  }

  public trackMessageEdit(messageId: string): void {
    const message = this.messageMetrics.find((m) => m.messageId === messageId)
    if (message) {
      message.editCount++
    }
  }

  public trackReaction(messageId: string, emoji: string, userId: string): void {
    const message = this.messageMetrics.find((m) => m.messageId === messageId)
    if (message) {
      message.reactions.push(emoji)
      this.updateUserEngagement(userId, 'reaction')
    }
  }

  public trackReadReceipt(messageId: string, userId: string): void {
    const message = this.messageMetrics.find((m) => m.messageId === messageId)
    if (message) {
      message.readTime = Date.now() - message.timestamp
      this.updateUserEngagement(userId, 'read')
    }
  }

  // User Engagement Analytics
  private updateUserEngagement(
    userId: string,
    action: 'message' | 'reaction' | 'typing' | 'read',
  ): void {
    let engagement = this.userEngagements.get(userId)

    if (!engagement) {
      engagement = {
        userId,
        sessionStart: Date.now(),
        sessionEnd: Date.now(),
        messageCount: 0,
        reactionCount: 0,
        typingCount: 0,
        readCount: 0,
      }
      this.userEngagements.set(userId, engagement)
    }

    engagement.sessionEnd = Date.now()

    switch (action) {
      case 'message':
        engagement.messageCount++
        break
      case 'reaction':
        engagement.reactionCount++
        break
      case 'typing':
        engagement.typingCount++
        break
      case 'read':
        engagement.readCount++
        break
    }
  }

  // Performance Analytics
  private setupPerformanceMonitoring(): void {
    if (typeof window !== 'undefined') {
      // Monitor socket connection
      this.trackPerformanceEvent('socket_connect', 0, true)

      // Monitor message delivery
      window.addEventListener('message_sent', (e: CustomEvent) => {
        this.trackPerformanceEvent(
          'message_delivery',
          e.detail.duration,
          e.detail.success,
        )
      })

      // Monitor file uploads
      window.addEventListener('file_upload', (e: CustomEvent) => {
        this.trackPerformanceEvent(
          'file_upload',
          e.detail.duration,
          e.detail.success,
        )
      })
    }
  }

  // Public method for components to track events
  public trackEvent(
    eventType: string,
    duration: number,
    success: boolean = true,
    errorType?: string,
  ): void {
    this.trackPerformanceEvent(eventType, duration, success, errorType)
  }

  public trackPerformanceEvent(
    eventType: string,
    duration: number,
    success: boolean,
    errorType?: string,
  ): void {
    const metric: PerformanceMetrics = {
      eventType,
      timestamp: Date.now(),
      duration,
      success,
      errorType,
    }
    this.performanceMetrics.push(metric)
  }

  // Analytics Reports
  public getMessageVolumeByTime(
    timeframe: 'hour' | 'day' | 'week',
  ): { timestamp: number; count: number }[] {
    // Group messages by timeframe and count
    return this.messageMetrics.reduce(
      (acc, metric) => {
        const timestamp = this.roundTimestamp(metric.timestamp, timeframe)
        const existing = acc.find((a) => a.timestamp === timestamp)
        if (existing) {
          existing.count++
        } else {
          acc.push({ timestamp, count: 1 })
        }
        return acc
      },
      [] as { timestamp: number; count: number }[],
    )
  }

  public getUserEngagementStats(): {
    userId: string
    totalMessages: number
    totalReactions: number
    averageSessionDuration: number
  }[] {
    return Array.from(this.userEngagements.values()).map((engagement) => ({
      userId: engagement.userId,
      totalMessages: engagement.messageCount,
      totalReactions: engagement.reactionCount,
      averageSessionDuration:
        (engagement.sessionEnd - engagement.sessionStart) / 1000,
    }))
  }

  public getPerformanceStats(): {
    eventType: string
    averageDuration: number
    successRate: number
    errorTypes: { [key: string]: number }
  }[] {
    return Object.entries(
      this.performanceMetrics.reduce(
        (acc, metric) => {
          if (!acc[metric.eventType]) {
            acc[metric.eventType] = {
              totalDuration: 0,
              totalEvents: 0,
              successCount: 0,
              errorTypes: {},
            }
          }

          acc[metric.eventType].totalDuration += metric.duration
          acc[metric.eventType].totalEvents++
          if (metric.success) {
            acc[metric.eventType].successCount++
          }
          if (metric.errorType) {
            acc[metric.eventType].errorTypes[metric.errorType] =
              (acc[metric.eventType].errorTypes[metric.errorType] || 0) + 1
          }

          return acc
        },
        {} as Record<string, any>,
      ),
    ).map(([eventType, stats]) => ({
      eventType,
      averageDuration: stats.totalDuration / stats.totalEvents,
      successRate: (stats.successCount / stats.totalEvents) * 100,
      errorTypes: stats.errorTypes,
    }))
  }

  private roundTimestamp(
    timestamp: number,
    timeframe: 'hour' | 'day' | 'week',
  ): number {
    const date = new Date(timestamp)
    switch (timeframe) {
      case 'hour':
        date.setMinutes(0, 0, 0)
        break
      case 'day':
        date.setHours(0, 0, 0, 0)
        break
      case 'week':
        const day = date.getDay()
        date.setDate(date.getDate() - day)
        date.setHours(0, 0, 0, 0)
        break
    }
    return date.getTime()
  }
}
