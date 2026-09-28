/**
 * Google Apps Script (Code.gs)
 * 중학교 사회 빈칸 채우기 평가 시스템 학생 응답 수집 웹훅
 * 
 * [★ 중요: 403 오류 해결 및 배포 설정 ★]
 * 1. 우측 상단 [배포] -> [배포 관리] (또는 새 배포) 클릭
 * 2. 연필 아이콘(수정) 클릭 후:
 *    - 버전: [새 버전] 선택
 *    - 다음 사용자로 실행: '나(내 계정)'
 *    - 액세스 권한이 있는 사용자: 반드시 ★ '모든 사용자(Anyone)' ★ 로 설정!
 *      (※ 'Google 계정이 있는 모든 사용자'가 아니라 로그인 없이 접근 가능한 '모든 사용자'여야 합니다)
 * 3. [배포] 클릭!
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // 동시 제출 충돌 방지 락

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    
    // 시트 헤더가 없으면 자동 생성
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
        "상세 응답 내역"
      ]);
      sheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#EEF2FF");
      sheet.setFrozenRows(1);
    }

    var data;
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      data = e.parameter;
    } else {
      data = {};
    }

    // 오답 문항 번호 추출
    var wrongNumbers = [];
    if (data.results && Array.isArray(data.results)) {
      data.results.forEach(function(item, idx) {
        if (!item.isCorrect) {
          wrongNumbers.push((idx + 1) + "번(" + item.blankAnswer + ")");
        }
      });
    }

    // 새 행 추가
    sheet.appendRow([
      data.submittedAt || Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss"),
      data.studentId || "-",
      data.studentName || "-",
      data.unitTitle || "-",
      data.subUnitTitle || "-",
      data.score !== undefined ? data.score : 0,
      data.accuracy !== undefined ? data.accuracy : 0,
      wrongNumbers.length > 0 ? wrongNumbers.join(", ") : "전원 정답",
      JSON.stringify(data.results || [])
    ]);

    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "저장 완료" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// 웹 브라우저에서 URL을 직접 열었을 때 정상 작동 확인용
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    message: "Google Apps Script 학생 응답 수집 웹훅이 정상 가동 중입니다."
  })).setMimeType(ContentService.MimeType.JSON);
}
