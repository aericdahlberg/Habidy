import { Client } from 'langsmith'
import { traceable } from 'langsmith/traceable'

export const langsmithClient = new Client()

export { traceable }
