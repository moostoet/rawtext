import { createHash } from 'node:crypto'

export const getIP = (event: any) => getRequestIP(event) || getHeader(event, 'cf-connecting-ip') || '0.0.0.0'
export const ipHash = (ip: string) => createHash('sha256').update(ip).digest('hex').slice(0, 16)
