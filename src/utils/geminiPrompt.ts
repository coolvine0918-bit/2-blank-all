import { Question, SubUnit } from '../data/curriculumData';

/**
 * 2단계: 핵심 추출 및 15문제 자동 생성 프롬프트 빌더
 * 교과서 소단원의 핵심 개념을 바탕으로 문맥 이해형 빈칸 채우기 15문항을 생성하도록 LLM을 지시하는 최적화된 프롬프트입니다.
 */
export function buildPromptFor15Questions(unitTitle: string, subUnit: SubUnit, customTextbookExcerpt?: string): string {
  return `당신은 대한민국 중학교 1학년 사회 교과 교육과정 전문 출제위원 및 AI 교육 보조 시스템입니다.
아래 제공된 [대단원]과 [소단원]의 학습 목표와 핵심 개념을 엄밀하게 분석하여, 중학교 1학년 학생들의 학업성취도를 평가할 수 있는 "문맥 이해형 빈칸 채우기 문제"를 정확히 15문제 출제하십시오.

[단원 정보]
- 대단원: ${unitTitle}
- 소단원: ${subUnit.subNumber}. ${subUnit.title}
- 주요 핵심 개념: ${subUnit.coreConcepts.join(', ')}
${customTextbookExcerpt ? `\n[교과서 텍스트 발췌]\n${customTextbookExcerpt}\n` : ''}

[출제 원칙 및 엄격한 제약사항]
1. 문항 수: 무조건 반드시 정확히 15문제를 생성하십시오. (1문항도 모자라거나 초과해선 안 됨)
2. 문제 형태:
   - 교과서 문장의 의미와 문맥을 이해해야만 풀 수 있는 완성도 높은 설명형 문장이어야 합니다.
   - 문장 내에서 평가하고자 하는 단 하나의 핵심 개념어 또는 핵심 법률/제도/원리 용어 부분만을 [ 빈칸 ] 형태로 정확히 표기하십시오.
   - 예시: "사람들이 사회생활을 하면서 겪는 갈등을 조정하고 해결하여 공동체 질서를 유지하는 과정을 [ 빈칸 ](이)라고 한다."
3. 정답(blankAnswer):
   - 빈칸에 들어갈 정답은 단 하나의 명확한 교과서 공식 용어여야 합니다. (불명확하거나 서술형 문장 불가)
   - 유사 허용 답안(acceptedAnswers) 배열에 띄어쓰기 차이, 동의어 등을 포함하십시오.
4. 힌트(hint):
   - 학생이 막힐 때 유추할 수 있는 1문장 분량의 핵심 단서 힌트를 제공하십시오.
5. 오답 맞춤 피드백(explanation):
   - 학생이 다른 오답을 썼을 때 왜 이 개념이 정답인지 교과서 문맥에 기반하여 친절하고 명쾌하게 2~3문장으로 설명하는 해설을 작성하십시오.
6. 출력 형식:
   - 마크다운 백틱 코드블록 없이, 오직 아래의 유효한 JSON 배열 포맷으로만 응답하십시오.

[출력 JSON 스키마]
[
  {
    "id": "${subUnit.id}-gen-01",
    "sentence": "... [ 빈칸 ] ...",
    "blankAnswer": "정답단어",
    "acceptedAnswers": ["정답단어", "대체허용단어"],
    "hint": "핵심 힌트 문장",
    "explanation": "교과서 문맥 기반의 정답 해설 및 오답 교정 피드백"
  },
  ... (총 15개 객체)
]`;
}

/**
 * Gemini API 직접 호출 유틸리티 (선택적 실시간 생성 기능)
 * 교사가 자신의 Gemini API 키를 입력했을 때 교과서 기반 신규 문제를 즉석에서 생성합니다.
 */
export async function generateQuestionsWithGemini(
  apiKey: string,
  unitTitle: string,
  subUnit: SubUnit,
  customTextbookExcerpt?: string
): Promise<Question[]> {
  const prompt = buildPromptFor15Questions(unitTitle, subUnit, customTextbookExcerpt);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Gemini API 호출 실패 (${response.status}): ${errorData}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error("Gemini로부터 유효한 응답을 수신하지 못했습니다.");

  // JSON 파싱 및 정제
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/```\s*$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/```\s*$/, "");
  }

  const parsed = JSON.parse(cleaned) as Question[];
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("문제 생성 결과가 비어 있거나 올바른 형식이 아닙니다.");
  }

  return parsed.slice(0, 15);
}
