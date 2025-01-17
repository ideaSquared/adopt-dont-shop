import { AsyncLocalStorage } from 'async_hooks'
import { AuditContext } from '../middleware/auditContextMiddleware'

interface RequestContext {
  auditContext: AuditContext
}

const storage = new AsyncLocalStorage<RequestContext>()

export const getContext = (): RequestContext | undefined => {
  return storage.getStore()
}

export const runInContext = (
  context: RequestContext,
  callback: () => Promise<void>,
): Promise<void> => {
  return storage.run(context, callback)
}

export const getAuditContext = (): AuditContext | undefined => {
  return getContext()?.auditContext
}

export const RequestContext = {
  getContext,
  runInContext,
  getAuditContext,
}

export default RequestContext
