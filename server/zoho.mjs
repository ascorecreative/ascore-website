// Server-only adapter. Assistant connector access never becomes website access.
// No OAuth grants, writes, mail/send actions, or automatic synchronization here.
const origins = new Set(['https://www.zohoapis.com','https://www.zohoapis.eu','https://www.zohoapis.in','https://www.zohoapis.com.au','https://www.zohoapis.jp','https://www.zohoapis.ca','https://www.zohoapis.com.cn','https://www.zohoapis.sa'])
export function zohoStatus(env = process.env) {
  return {
    crm: { configured:!!(env.ZOHO_API_ORIGIN && env.ZOHO_CRM_ACCESS_TOKEN), connected:false, mode:'read-only adapter; verification pending' },
    books: { configured:!!(env.ZOHO_API_ORIGIN && env.ZOHO_BOOKS_ACCESS_TOKEN && env.ZOHO_BOOKS_ORGANIZATION_ID), connected:false, mode:'read-only adapter; verification pending' }
  }
}
export function mapCrmLead(record) {
  return { externalId:String(record.id), name:[record.First_Name,record.Last_Name].filter(Boolean).join(' '), email:record.Email || '', company:record.Company || '', phone:record.Phone || '', externalStatus:record.Lead_Status || '', source:'zoho-crm' }
}
export function mapBooksDocument(record, kind) {
  const id = record.invoice_id || record.estimate_id || record.bill_id
  return { externalId:String(id), kind, clientExternalId:String(record.customer_id || record.vendor_id || ''), number:record.invoice_number || record.estimate_number || record.bill_number || '', currency:record.currency_code, amount:Number(record.total), balance:Number(record.balance ?? record.total), status:record.status, issueDate:record.date, dueDate:record.due_date || null, source:'zoho-books' }
}
export function createZohoReadAdapter({ apiOrigin, crmToken, booksToken, booksOrganizationId, fetcher = fetch }) {
  if (!origins.has(apiOrigin)) throw Error('Configure a supported Zoho API data center.')
  const get = async (path, token, params = {}) => {
    if (!token) throw Error('Separately approved server-side Zoho access is not configured.')
    const url = new URL(path,apiOrigin)
    for (const [key,value] of Object.entries(params)) url.searchParams.set(key,String(value))
    const response = await fetcher(url, {method:'GET',headers:{Authorization:`Zoho-oauthtoken ${token}`,Accept:'application/json'},signal:AbortSignal.timeout(10000),redirect:'error'})
    if (!response.ok) throw Error(`Zoho read failed (${response.status}).`)
    if (response.status === 204) return {}
    const result = await response.json()
    if (result.code !== undefined && result.code !== 0) throw Error('Zoho returned an API error.')
    return result
  }
  return {
    async leads(page = 1) {
      const result = await get('/crm/v8/Leads',crmToken,{page,per_page:100,fields:'First_Name,Last_Name,Email,Company,Phone,Lead_Status'})
      return { records:(result.data || []).map(mapCrmLead), hasMore:!!result.info?.more_records }
    },
    async documents(kind, page = 1) {
      if (!booksOrganizationId) throw Error('Zoho Books organization is not verified.')
      const resource = {invoice:'invoices',quotation:'estimates',bill:'bills'}[kind]
      if (!resource) throw Error('Unsupported financial document type.')
      const result = await get(`/books/v3/${resource}`,booksToken,{organization_id:booksOrganizationId,page,per_page:100})
      return { records:(result[resource] || []).map(item => mapBooksDocument(item,kind)), hasMore:!!result.page_context?.has_more_page }
    }
  }
}
