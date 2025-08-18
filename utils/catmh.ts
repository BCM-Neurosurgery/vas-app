// API utilities for interacting with CAT-MH server based on official API v9 specification
// https://www.cat-mh.com/portal/secure/ for creation, https://www.cat-mh.com/interview/ for administration

export const CATMH_APP_ID = process.env.EXPO_PUBLIC_CATMH_APP_ID;
export const CATMH_ORG_ID = process.env.EXPO_PUBLIC_CATMH_ORG_ID;
export const CATMH_BASE_URL = 'https://www.cat-mh.com';

// CATMH API interfaces based on official specification
export interface CATMHInterviewCreateRequest {
  organizationID: number;
  userFirstName: string;
  userLastName: string;
  subjectID: string;
  numberOfInterviews: number;
  language: number; // 1=English, 2=Spanish, 3=Chinese-simplified, 4=Chinese-traditional
  timeframeID?: number; // 1=1h, 2=1d, 3=1w, 4=2w, 5=30d, 6=12m, 7=life
  tests: CATMHTest[];
  condTestFlags?: number[];
  complEmailFlag?: number; // 0=no email, 1=completion email, 2=email with results
}

export interface CATMHTest {
  type: string; // mdd, dep, anx, m/hm, sud, ptsd-dx, ptsd, ptsd-e, psy-c, psy-s, a/adhd, sdoh, c-ssrs, ss, p-dep, p-anx, p-m/hm, cj-dep, cj-anx, cj-m/hm, cj-sud, cj-ss
  timeframeID?: number;
}

export interface CATMHInterviewCreateResponse {
  interviews: {
    organizationID: number;
    interviewID: number;
    identifier: string;
    signature: string;
  }[];
}

export interface CATMHInterviewStatusRequest {
  organizationID: number;
  interviewID: number;
  identifier: string;
  signature: string;
}

export interface CATMHInterviewStatusResponse {
  interviewValid: boolean;
  credentialsValid: boolean;
  startTime: number | null;
  endTime: number | null;
  inProgress: boolean | null;
}

export interface CATMHInterviewSignInRequest {
  j_username: string; // identifier
  j_password: string; // signature
  interviewID?: number;
}

export interface CATMHInterviewInitResponse {
  id: number;
  startTime: number | null;
  endTime: number | null;
  iter: number;
  languageID: number;
  interviewTests: number[];
  conditionalTests: any;
  subjectID: any;
  displayResults: number;
}

export interface CATMHQuestionResponse {
  questionID: number;
  questionNumber: number;
  questionDescription: string;
  questionAnswers: CATMHQuestionAnswer[];
  questionAudioID: number;
  questionSymptom: string | null;
  questionSymptomFlag: number;
  audioExtension: string;
  timeframeID: number;
  questionNoteID: number;
  questionNote: string | null;
  answerType: number; // 1=radio buttons, 2=checkboxes
  questionFooter: string | null;
}

export interface CATMHQuestionAnswer {
  answerOrdinal: number;
  answerDescription: string;
  answerWeight: number;
}

export interface CATMHAnswerSubmission {
  questionID: number;
  response?: number; // for radio buttons (answerOrdinal)
  chkResponses?: number[]; // for checkboxes (array of answerOrdinal values)
  duration: number; // milliseconds from question display to answer submission
  curT1: number; // should be 0
  curT2: number; // should be 0
  curT3: number; // should be 0
}

export interface CATMHInterviewResults {
  interviewId: number;
  subjectId: string;
  startTime: number | null;
  endTime: number | null;
  timeframeId: number;
  tests: CATMHTestResult[];
}

export interface CATMHTestResult {
  type: string;
  label: string;
  timeframeId: number;
  diagnosis: string | null;
  confidence: number | null;
  severity: number | null;
  category: string | null;
  precision: number | null;
  prob: number | null;
  percentile: number | null;
  items: CATMHTestItem[] | null;
}

export interface CATMHTestItem {
  questionId: number;
  response: number;
  duration: number; // seconds with 3 decimal places
}

// Cookie management for session handling
export interface CATMHCookies {
  JSESSIONID: string;
  AWSELB: string;
}

export const catmhAPI = {
  // ===== INTERVIEW CREATION =====

  // Create one or more interviews for a subject
  async createInterview(request: CATMHInterviewCreateRequest): Promise<CATMHInterviewCreateResponse> {
    try {
      const response = await fetch(`${CATMH_BASE_URL}/portal/secure/interview/createInterview`, {
        method: 'POST',
        headers: {
          'applicationid': CATMH_APP_ID!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`CATMH API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating CATMH interview:', error);
      throw error;
    }
  },

  // Check interview status
  async getInterviewStatus(request: CATMHInterviewStatusRequest): Promise<CATMHInterviewStatusResponse> {
    try {
      const response = await fetch(`${CATMH_BASE_URL}/portal/secure/interview/status`, {
        method: 'POST',
        headers: {
          'applicationid': CATMH_APP_ID!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`CATMH API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking interview status:', error);
      throw error;
    }
  },

  // ===== INTERVIEW ADMINISTRATION =====

  // Sign in to administer an interview (returns cookies for session)
  async signInToInterview(request: CATMHInterviewSignInRequest): Promise<CATMHCookies> {
    try {
      const formData = new URLSearchParams();
      formData.append('j_username', request.j_username);
      formData.append('j_password', request.j_password);
      if (request.interviewID) {
        formData.append('interviewID', request.interviewID.toString());
      }

      const response = await fetch(`${CATMH_BASE_URL}/interview/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
        redirect: 'manual', // Don't follow redirects, we need the cookies
      });

      if (response.status !== 302) {
        throw new Error(`Sign in failed: ${response.status} ${response.statusText}`);
      }

      // Extract cookies from response headers
      const cookies = this.extractCookiesFromResponse(response);
      if (!cookies.JSESSIONID || !cookies.AWSELB) {
        throw new Error('Failed to extract session cookies');
      }

      return cookies;
    } catch (error) {
      console.error('Error signing in to interview:', error);
      throw error;
    }
  },

  // Break lock if interview is already in progress
  async breakLock(cookies: CATMHCookies): Promise<void> {
    try {
      const response = await fetch(`${CATMH_BASE_URL}/interview/secure/breakLock`, {
        method: 'POST',
        headers: {
          'Cookie': `JSESSIONID=${cookies.JSESSIONID}; AWSELB=${cookies.AWSELB}`,
        },
        redirect: 'manual',
      });

      if (response.status !== 302) {
        throw new Error(`Break lock failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error breaking lock:', error);
      throw error;
    }
  },

  // Initialize the interview after authentication
  async initializeInterview(cookies: CATMHCookies): Promise<CATMHInterviewInitResponse> {
    try {
      const response = await fetch(`${CATMH_BASE_URL}/interview/rest/interview`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cookie': `JSESSIONID=${cookies.JSESSIONID}; AWSELB=${cookies.AWSELB}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Interview initialization failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error initializing interview:', error);
      throw error;
    }
  },

  // Get the current question
  async getCurrentQuestion(cookies: CATMHCookies): Promise<CATMHQuestionResponse | null> {
    try {
      const response = await fetch(`${CATMH_BASE_URL}/interview/rest/interview/test/question`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cookie': `JSESSIONID=${cookies.JSESSIONID}; AWSELB=${cookies.AWSELB}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get question: ${response.status} ${response.statusText}`);
      }

      const question = await response.json();
      
      // Check if interview is complete (questionID = -1)
      if (question.questionID === -1) {
        return null; // Interview completed
      }

      return question;
    } catch (error) {
      console.error('Error getting current question:', error);
      throw error;
    }
  },

  // Submit an answer to the current question
  async submitAnswer(cookies: CATMHCookies, answer: CATMHAnswerSubmission): Promise<void> {
    try {
      const response = await fetch(`${CATMH_BASE_URL}/interview/rest/interview/test/question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `JSESSIONID=${cookies.JSESSIONID}; AWSELB=${cookies.AWSELB}`,
        },
        body: JSON.stringify(answer),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit answer: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      throw error;
    }
  },

  // Get interview results
  async getInterviewResults(cookies: CATMHCookies, includeItemLevel: boolean = false): Promise<CATMHInterviewResults> {
    try {
      const url = includeItemLevel 
        ? `${CATMH_BASE_URL}/interview/rest/interview/results?itemLevel=1`
        : `${CATMH_BASE_URL}/interview/rest/interview/results`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `JSESSIONID=${cookies.JSESSIONID}; AWSELB=${cookies.AWSELB}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get interview results: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting interview results:', error);
      throw error;
    }
  },

  // Sign out and terminate the interview session
  async signOut(cookies: CATMHCookies): Promise<void> {
    try {
      const response = await fetch(`${CATMH_BASE_URL}/interview/signout`, {
        method: 'POST',
        headers: {
          'Cookie': `JSESSIONID=${cookies.JSESSIONID}; AWSELB=${cookies.AWSELB}`,
        },
        redirect: 'manual',
      });

      if (response.status !== 302) {
        console.warn(`Sign out response: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error signing out:', error);
      // Don't throw error for sign out, as it's cleanup
    }
  },

  // ===== UTILITY FUNCTIONS =====

  // Extract cookies from response headers
  extractCookiesFromResponse(response: Response): CATMHCookies {
    const cookies: CATMHCookies = { JSESSIONID: '', AWSELB: '' };
    
    const setCookieHeaders = response.headers.get('set-cookie');
    if (setCookieHeaders) {
      const cookieStrings = setCookieHeaders.split(',');
      
      for (const cookieString of cookieStrings) {
        if (cookieString.includes('JSESSIONID=')) {
          cookies.JSESSIONID = cookieString.split('JSESSIONID=')[1].split(';')[0];
        } else if (cookieString.includes('AWSELB=')) {
          cookies.AWSELB = cookieString.split('AWSELB=')[1].split(';')[0];
        }
      }
    }

    return cookies;
  },

  // Check if interview is complete based on question response
  isInterviewComplete(question: CATMHQuestionResponse | null): boolean {
    return question === null || question.questionID === -1;
  },

  // Get language name from ID
  getLanguageName(languageId: number): string {
    const languages: { [key: number]: string } = {
      1: 'English',
      2: 'Spanish',
      3: 'Chinese (Simplified)',
      4: 'Chinese (Traditional)',
    };
    return languages[languageId] || 'Unknown';
  },

  // Get timeframe description from ID
  getTimeframeDescription(timeframeId: number): string {
    const timeframes: { [key: number]: string } = {
      1: 'Past hour',
      2: 'Past day',
      3: 'Past week',
      4: 'Past 2 weeks',
      5: 'Past 30 days',
      6: 'Past 12 months',
      7: 'Lifetime',
    };
    return timeframes[timeframeId] || 'Unknown';
  },

  // Get test type name from abbreviation
  getTestTypeName(testType: string): string {
    const testTypes: { [key: string]: string } = {
      'mdd': 'Major Depressive Disorder',
      'dep': 'Depression',
      'anx': 'Anxiety Disorder',
      'm/hm': 'Mania/Hypomania',
      'sud': 'Substance Use Disorder',
      'ptsd-dx': 'PTSD-Diagnosis',
      'ptsd': 'Post-Traumatic Stress Disorder',
      'ptsd-e': 'PTSD-Expanded',
      'psy-c': 'Psychosis - Clinician',
      'psy-s': 'Psychosis - Self-Report',
      'a/adhd': 'Adult ADHD',
      'sdoh': 'Social Determinants of Health',
      'c-ssrs': 'C-SSRS Suicide Screen',
      'ss': 'Suicide Scale',
      'p-dep': 'Depression (Perinatal)',
      'p-anx': 'Anxiety Disorder (Perinatal)',
      'p-m/hm': 'Mania/Hypomania (Perinatal)',
      'cj-dep': 'Depression (Criminal Justice)',
      'cj-anx': 'Anxiety Disorder (Criminal Justice)',
      'cj-m/hm': 'Mania/Hypomania (Criminal Justice)',
      'cj-sud': 'Substance Use Disorder (Criminal Justice)',
      'cj-ss': 'Suicide Scale (Criminal Justice)',
    };
    return testTypes[testType] || testType;
  },
};
