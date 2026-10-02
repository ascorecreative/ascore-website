// Historical demo UI modules remain unused. All active portal data comes from /api.
// Fail explicitly if an old component is accidentally reintroduced.
export const db = new Proxy({}, { get() { throw new Error('Browser-storage portal data is disabled. Use the server portal API.') } })
