// Response shapes of the FastAPI backend (backend/app/main.py)

export interface SavedTemplate {
  id: number
  name: string
  store_name: string | null
  path: string
  url: string
  created_at: string | null
}

export interface UploadTemplateResponse {
  status: 'saved' | 'one_time'
  path: string
  url: string
  template?: SavedTemplate
}

export interface PadSearchResult {
  id: string
  title: string
  url?: string
  thumbnail?: string
  local_path?: string
}

export interface PadSearchResponse {
  part_number: string
  results: PadSearchResult[]
  message: string
}

export interface GenerateResponse {
  status: 'completed'
  job_id: number
  final_url: string
  download_url: string
  filename: string
}
