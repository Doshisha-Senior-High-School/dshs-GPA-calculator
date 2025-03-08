export interface Subject {
  Subject: string
  Credits: number
  Required: boolean
  Category?: string
  CannotTakeWith?: string[]
}

export interface YearData {
  Subjects: Subject[]
}

export interface CurriculumData {
  Grades: {
    "1st_Year": YearData
    "2nd_Year": YearData
    "3rd_Year": YearData
    [key: string]: YearData
  }
}

export interface SelectedElectives {
  [tabId: string]: {
    [rowIndex: string]: Subject
  }
}

