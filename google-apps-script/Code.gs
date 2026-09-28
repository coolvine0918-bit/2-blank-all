/**
 * Google Apps Script (Code.gs)
 * 중학교 사회 빈칸 채우기 평가 시스템 학생 응답 수집 웹훅
 * 
 * [배포 방법]
 * 1. 새 Google 스프레드시트 생성 (예: '중1 사회 빈칸 채우기 학생 응답 결과')
 * 2. 상단 메뉴 [확장 프로그램] -> [Apps Script] 클릭
 * 3. 이 코드 전체를 Code.gs에 붙여넣기 후 저장 (Ctrl+S)
 * 4. 우측 상단 [배포] -> [새 배포] 클릭
 * 5. 유형 선택: '웹 앱' 선택
 *    - 설명: 중1 사회 응답 수집
 *    - 다음 사용자로 실행: '나(내 계정)'
 *    - 액세스 권한이 있는 사용자: '모든 사용자(Anyone)'  <-- 반드시 '모든 사용자'로 설정!
 * 6. [배포] 버튼 클릭 후 표시되는 '웹 앱 URL'을 복사하여 우리 웹 애플리케이션의 설정창에 입력하십시오.
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // 첫 실행 시 헤더가 없으면 자동 생성
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "제출일시",
        "학번",
        "이름",
        "대단원",
        "소단원",
        "점수(15점 만점)",
        "정답률(%)",
        "틀린 문항 번호",
        "상세 응답 내역(JSON)"
      ]);
      // 헤더 서식 지정 (진한 글씨, 배경색)
      sheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#EEF2FF");
    }

    var contents = e.postData.contents;
    var data = JSON.parse(contents);

    // 오답 문항 번호 추출
    var wrongNumbers = [];
    if (data.results && Array.isArray(data.results)) {
      data.results.forEach(function(item, idx) {
        if (!item.isCorrect) {
          wrongNumbers.push((idx + 1) + "번(" + item.blankAnswer + ")");
        }
      });
    }

    // 새 응답 행 추가
    sheet.appendRow([
      data.submittedAt || new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
      data.studentId || "-",
      data.studentName || "-",
      data.unitTitle || "-",
      data.subUnitTitle || "-",
      data.score !== undefined ? data.score : 0,
      data.accuracy || 0,
      wrongNumbers.length > 0 ? wrongNumbers.join(", ") : "전원 정답",
      JSON.stringify(data.results || [])
    ]);

    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "성공적으로 저장되었습니다." }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "Middle School Social Studies Quiz Webhook Service"
  })).setMimeType(ContentService.MimeType.JSON);
}
