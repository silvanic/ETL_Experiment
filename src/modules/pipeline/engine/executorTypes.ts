export type ExecutorResult = {
  nextBranch?: 'true' | 'false'
  details?: unknown
  message?: string
  dataOut?: unknown
}
