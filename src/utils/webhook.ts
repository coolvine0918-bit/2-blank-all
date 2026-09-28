export interface SubmissionPayload {
  studentId: string;
  studentName: string;
  unitTitle: string;
  subUnitTitle: string;
  score: number;
  totalQuestions: number;
  accuracy: number;
  submittedAt: string;
  results: {
    questionId: string;
    questionNumber: number;
    sentence: string;
    studentAnswer: string;
    blankAnswer: string;
    isCorrect: boolean;
    explanation: string;
  }[];
}

/**
 * Google Apps Script Webhook으로 학생 답안 전송
 * 브라우저 CORS 제약을 완벽히 회피하기 위해 text/plain 스트림 및 no-cors 모드로 전송합니다.
 */
export async function sendSubmissionToGoogleSheet(
  webhookUrl: string,
  payload: SubmissionPayload
): Promise<{ success: boolean; message: string }> {
  if (!webhookUrl || !webhookUrl.trim().startsWith("https://script.google.com")) {
    return {
      success: false,
      message: "올바른 Google Apps Script 웹 앱 URL이 설정되지 않았습니다."
    };
  }

  try {
    // Google Apps Script는 text/plain으로 JSON 바디를 보내면 CORS preflight 없이 안정적으로 doPost 수신 가능
    await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload),
      mode: 'no-cors' // 브라우저 크로스오리진 완벽 지원
    });

    return {
      success: true,
      message: "구글 스프레드시트로 학생 응답이 안전하게 전송되었습니다."
    };
  } catch (error: any) {
    console.error("Webhook submission error:", error);
    return {
      success: false,
      message: `전송 중 네트워크 오류가 발생했습니다: ${error?.message || error}`
    };
  }
}
