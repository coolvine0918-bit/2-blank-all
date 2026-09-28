"use client";

import React, { useState, useMemo } from "react";
import {
  CURRICULUM_DATA,
  MainUnit,
  SubUnit,
  Question,
} from "@/data/curriculumData";
import { sendSubmissionToGoogleSheet } from "@/utils/webhook";
import {
  BookOpen,
  LayoutDashboard,
  PenTool,
  Settings,
  Layers,
  Eye,
  EyeOff,
  Copy,
  Printer,
  Lightbulb,
  CheckCircle,
  XCircle,
  Check,
  Send,
  Sparkles,
  BookMarked,
  X,
  Webhook as WebhookIcon,
  HelpCircle,
  Info,
} from "lucide-react";

export default function Home() {
  // 모드 전환: 'teacher' (교사용) | 'student' (학생용)
  const [currentMode, setCurrentMode] = useState<"teacher" | "student">("teacher");

  // 선택된 대단원 & 소단원 ID
  const [selectedUnitId, setSelectedUnitId] = useState<string>("unit-12");
  const [selectedSubUnitId, setSelectedSubUnitId] = useState<string>("12-2");

  // 교사용 모드 상태
  const [showAnswerInTeacher, setShowAnswerInTeacher] = useState<boolean>(false);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);

  const DEFAULT_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwhAudTpneX2g1XUpPtLjDClWqyfrYs1PyILltK8glAfdSMda1jZUJL0JGxCYXm5hxG/exec";

  // 연동 설정 (LocalStorage 기반 저장)
  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("edu_webhook_url") || DEFAULT_WEBHOOK_URL;
    }
    return DEFAULT_WEBHOOK_URL;
  });
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("edu_gemini_key") || "";
    }
    return "";
  });

  // 학생용 모드 상태
  const [studentId, setStudentId] = useState<string>("");
  const [studentName, setStudentName] = useState<string>("");
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [submittingWebhook, setSubmittingWebhook] = useState<boolean>(false);
  const [webhookStatus, setWebhookStatus] = useState<"idle" | "success" | "error">("idle");

  // 맞춤 피드백 모달 상태
  const [activeFeedbackModal, setActiveFeedbackModal] = useState<Question | null>(null);

  // 현재 선택된 대단원 및 소단원 객체
  const activeUnit = useMemo(() => {
    return CURRICULUM_DATA.find((u) => u.id === selectedUnitId) || CURRICULUM_DATA[0];
  }, [selectedUnitId]);

  const activeSubUnit = useMemo(() => {
    return activeUnit.subUnits.find((s) => s.id === selectedSubUnitId) || activeUnit.subUnits[0];
  }, [activeUnit, selectedSubUnitId]);

  // 소단원 변경
  const handleSelectSubUnit = (unitId: string, subId: string) => {
    setSelectedUnitId(unitId);
    setSelectedSubUnitId(subId);
    setStudentAnswers({});
    setIsSubmitted(false);
    setWebhookStatus("idle");
  };

  // 설정 저장
  const handleSaveConfig = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("edu_webhook_url", webhookUrl);
      localStorage.setItem("edu_gemini_key", geminiApiKey);
    }
    setShowConfigModal(false);
    alert("설정이 저장되었습니다.");
  };

  // 텍스트 전체 클립보드 복사
  const handleCopyAll = () => {
    const text = activeSubUnit.questions
      .map((q, idx) => {
        return `${idx + 1}. ${q.sentence}\n   정답: ${q.blankAnswer}\n   해설: ${q.explanation}`;
      })
      .join("\n\n");

    navigator.clipboard.writeText(
      `[${activeUnit.romanNumeral}. ${activeUnit.title} > ${activeSubUnit.subNumber}. ${activeSubUnit.title}]\n\n` + text
    );
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  // 인쇄
  const handlePrint = () => {
    window.print();
  };

  // 학생 답안 입력
  const handleAnswerChange = (qId: string, val: string) => {
    setStudentAnswers((prev) => ({ ...prev, [qId]: val }));
  };

  // 정답 판정 로직
  const checkAnswer = (studentAns: string | undefined, question: Question): boolean => {
    if (!studentAns) return false;
    const cleanStudent = studentAns.trim().replace(/\s+/g, "").toLowerCase();
    const cleanAnswer = question.blankAnswer.trim().replace(/\s+/g, "").toLowerCase();
    if (cleanStudent === cleanAnswer) return true;

    if (question.acceptedAnswers && Array.isArray(question.acceptedAnswers)) {
      return question.acceptedAnswers.some(
        (ans) => ans.trim().replace(/\s+/g, "").toLowerCase() === cleanStudent
      );
    }
    return false;
  };

  // 채점 결과 계산
  const quizResults = useMemo(() => {
    let correctCount = 0;
    const details = activeSubUnit.questions.map((q, idx) => {
      const sAns = studentAnswers[q.id] || "";
      const isCorrect = checkAnswer(sAns, q);
      if (isCorrect) correctCount++;
      return {
        questionId: q.id,
        questionNumber: idx + 1,
        sentence: q.sentence,
        studentAnswer: sAns,
        blankAnswer: q.blankAnswer,
        isCorrect,
        hint: q.hint,
        explanation: q.explanation,
      };
    });

    return {
      total: activeSubUnit.questions.length,
      correctCount,
      wrongCount: activeSubUnit.questions.length - correctCount,
      accuracy: Math.round((correctCount / activeSubUnit.questions.length) * 100),
      details,
    };
  }, [activeSubUnit, studentAnswers]);

  // 제출 및 Webhook 전송
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      alert("이름을 입력해 주세요.");
      return;
    }

    setIsSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (webhookUrl && webhookUrl.trim().startsWith("https://script.google.com")) {
      setSubmittingWebhook(true);
      setWebhookStatus("idle");

      const payload = {
        studentId: studentId.trim() || "미입력",
        studentName: studentName.trim(),
        unitTitle: `${activeUnit.romanNumeral}. ${activeUnit.title}`,
        subUnitTitle: `${activeSubUnit.subNumber}. ${activeSubUnit.title}`,
        score: quizResults.correctCount,
        totalQuestions: quizResults.total,
        accuracy: quizResults.accuracy,
        submittedAt: new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
        results: quizResults.details,
      };

      const res = await sendSubmissionToGoogleSheet(webhookUrl, payload);
      setSubmittingWebhook(false);
      setWebhookStatus(res.success ? "success" : "error");
    }
  };

  // 다시 풀기
  const handleRetry = () => {
    if (confirm("답안을 모두 초기화하고 다시 풀이하시겠습니까?")) {
      setStudentAnswers({});
      setIsSubmitted(false);
      setWebhookStatus("idle");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* 상단 글로벌 헤더 */}
      <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-900 bg-clip-text text-transparent">
                  EduSocial AI
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                  중1 사회
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                비상교육 사회 ① 교과서 12개 소단원 빈칸 채우기 15문항 자동 평가 시스템
              </p>
            </div>
          </div>

          {/* 모드 전환 탭 */}
          <div className="flex items-center space-x-2">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
              <button
                onClick={() => setCurrentMode("teacher")}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentMode === "teacher"
                    ? "bg-white text-indigo-600 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>교사용 학습지기</span>
              </button>
              <button
                onClick={() => setCurrentMode("student")}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentMode === "student"
                    ? "bg-white text-emerald-600 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>학생용 풀이창</span>
              </button>
            </div>

            {/* 설정 모달 열기 버튼 */}
            <button
              onClick={() => setShowConfigModal(true)}
              title="외부 시트 Webhook 연동 설정"
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 메인 2열 레이아웃 */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">
        {/* 좌측 사이드바 트리 */}
        <aside className="no-print w-full md:w-80 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-24">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h2 className="font-bold text-sm text-slate-800">단원 선택 트리</h2>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">총 12개 소단원</span>
            </div>

            <div className="p-3 divide-y divide-slate-100 max-h-[calc(100vh-180px)] overflow-y-auto space-y-3">
              {CURRICULUM_DATA.map((unit) => {
                return (
                  <div key={unit.id} className="pt-2 first:pt-0">
                    <div className="flex items-center space-x-2 px-2 py-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-700 flex items-center justify-center font-serif text-[11px]">
                        {unit.romanNumeral}
                      </span>
                      <span>{unit.title}</span>
                    </div>

                    <div className="mt-1 space-y-1">
                      {unit.subUnits.map((sub) => {
                        const isSelected = unit.id === selectedUnitId && sub.id === selectedSubUnitId;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => handleSelectSubUnit(unit.id, sub.id)}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                              isSelected
                                ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-100"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                          >
                            <div className="flex items-center space-x-2 truncate">
                              <span
                                className={`text-[11px] px-1.5 py-0.5 rounded font-mono ${
                                  isSelected
                                    ? "bg-indigo-700 text-indigo-100"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {sub.subNumber}
                              </span>
                              <span className="truncate">{sub.title}</span>
                            </div>
                            <span
                              className={`text-[10px] ml-2 px-1.5 py-0.5 rounded-full ${
                                isSelected ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              15문
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* 우측 메인 영역 */}
        <main className="flex-1 min-w-0">
          {/* 인쇄 전용 머리글 */}
          <div className="print-only print-header border-b-2 border-slate-900 pb-3 mb-6">
            <div className="flex justify-between items-center mb-2">
              <h1 className="text-xl font-bold">
                [중1 사회] {activeUnit.romanNumeral}. {activeUnit.title}
              </h1>
              <span className="text-sm font-semibold">학번: _________ 이름: _________</span>
            </div>
            <h2 className="text-base font-semibold text-slate-700">
              소단원: {activeSubUnit.subNumber}. {activeSubUnit.title} (빈칸 채우기 15문항)
            </h2>
          </div>

          {/* ======================================================== */}
          {/* 교사용 모드 */}
          {/* ======================================================== */}
          {currentMode === "teacher" && (
            <div className="space-y-6">
              <div className="no-print bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-800">
                        {activeUnit.romanNumeral} {activeUnit.title}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-semibold text-slate-500">
                        소단원 {activeSubUnit.subNumber}
                      </span>
                    </div>
                    <h1 className="text-xl font-extrabold text-slate-900 mt-1">
                      {activeSubUnit.title}
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">{activeSubUnit.description}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setShowAnswerInTeacher(!showAnswerInTeacher)}
                      className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                        showAnswerInTeacher
                          ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {showAnswerInTeacher ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showAnswerInTeacher ? "정답 숨기기" : "정답 확인하기"}</span>
                    </button>

                    <button
                      onClick={handleCopyAll}
                      className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedToast ? "복사 완료!" : "텍스트 복사"}</span>
                    </button>

                    <button
                      onClick={handlePrint}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm shadow-indigo-100"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>학습지 인쇄</span>
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-400 mr-1">핵심 개념어:</span>
                  {activeSubUnit.coreConcepts.map((kw, i) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-medium"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>

              {/* 문항 목록 */}
              <div className="space-y-4 print-sheet">
                {activeSubUnit.questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-indigo-200 transition"
                  >
                    <div className="flex items-start space-x-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-extrabold text-xs flex items-center justify-center border border-indigo-100">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm sm:text-base leading-relaxed text-slate-800 font-medium">
                          {q.sentence.split("[ 빈칸 ]").map((part, i, arr) => (
                            <React.Fragment key={i}>
                              {part}
                              {i < arr.length - 1 && (
                                <span className="inline-block mx-1 px-3 py-0.5 rounded-lg border-2 border-dashed border-indigo-300 bg-indigo-50/60 text-indigo-800 font-bold text-sm">
                                  {showAnswerInTeacher ? q.blankAnswer : "　　　"}
                                </span>
                              )}
                            </React.Fragment>
                          ))}
                        </p>

                        {showAnswerInTeacher && (
                          <div className="mt-3 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs space-y-1">
                            <div className="flex items-center space-x-1.5 font-bold text-amber-900">
                              <CheckCircle className="w-3.5 h-3.5 text-amber-600" />
                              <span>정답: {q.blankAnswer}</span>
                              {q.acceptedAnswers && q.acceptedAnswers.length > 1 && (
                                <span className="text-amber-700 font-normal">
                                  (유사 인정: {q.acceptedAnswers.join(", ")})
                                </span>
                              )}
                            </div>
                            <p className="text-amber-800 leading-relaxed pl-5">
                              <strong>[교과서 맞춤 해설]</strong> {q.explanation}
                            </p>
                          </div>
                        )}

                        <div className="no-print mt-2 text-xs text-slate-400 flex items-center space-x-1">
                          <Lightbulb className="w-3 h-3 text-amber-500" />
                          <span>힌트: {q.hint}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 학생용 모드 */}
          {/* ======================================================== */}
          {currentMode === "student" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                        학생 풀이 모드
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-semibold text-slate-600">
                        {activeUnit.romanNumeral}. {activeUnit.title}
                      </span>
                    </div>
                    <h1 className="text-xl font-extrabold text-slate-900 mt-1">
                      {activeSubUnit.subNumber}. {activeSubUnit.title}
                    </h1>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">학번</label>
                      <input
                        type="text"
                        placeholder="예: 10415"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        disabled={isSubmitted}
                        className="w-24 px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">이름 *</label>
                      <input
                        type="text"
                        placeholder="이름 입력"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        disabled={isSubmitted}
                        className="w-28 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100"
                      />
                    </div>
                  </div>
                </div>

                {isSubmitted && (
                  <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-sm ${
                          quizResults.correctCount >= 12
                            ? "bg-emerald-500"
                            : quizResults.correctCount >= 8
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                      >
                        {quizResults.correctCount}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-base">
                          채점 완료! 총 15문제 중 {quizResults.correctCount}문제를 맞혔습니다.
                        </h3>
                        <p className="text-xs text-slate-600">
                          정답률: <strong className="text-emerald-700">{quizResults.accuracy}%</strong> | 틀린 문제는 해설 카드를 클릭하여 오답 원인을 확인하세요.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {webhookUrl && (
                        <span className="text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center space-x-1">
                          {submittingWebhook ? (
                            <span>시트 전송 중...</span>
                          ) : webhookStatus === "success" ? (
                            <span className="text-emerald-600 font-semibold flex items-center space-x-1">
                              <Check className="w-3.5 h-3.5" />
                              <span>구글 시트 전송 완료</span>
                            </span>
                          ) : (
                            <span className="text-rose-500">전송 실패 (설정 확인)</span>
                          )}
                        </span>
                      )}
                      <button
                        onClick={handleRetry}
                        className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                      >
                        다시 풀기
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 폼 문항들 */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {activeSubUnit.questions.map((q, idx) => {
                  const userAns = studentAnswers[q.id] || "";
                  const isCorrect = isSubmitted ? checkAnswer(userAns, q) : null;

                  return (
                    <div
                      key={q.id}
                      className={`bg-white rounded-2xl border p-5 shadow-sm transition-all ${
                        isSubmitted
                          ? isCorrect
                            ? "border-emerald-300 bg-emerald-50/20"
                            : "border-rose-300 bg-rose-50/20"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <span
                          className={`flex-shrink-0 w-7 h-7 rounded-lg font-extrabold text-xs flex items-center justify-center border ${
                            isSubmitted
                              ? isCorrect
                                ? "bg-emerald-500 text-white border-emerald-600"
                                : "bg-rose-500 text-white border-rose-600"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {idx + 1}
                        </span>

                        <div className="flex-1">
                          <div className="text-sm sm:text-base leading-relaxed text-slate-800 font-medium">
                            {q.sentence.split("[ 빈칸 ]").map((part, i, arr) => (
                              <React.Fragment key={i}>
                                {part}
                                {i < arr.length - 1 && (
                                  <span className="inline-block mx-1">
                                    <input
                                      type="text"
                                      value={studentAnswers[q.id] || ""}
                                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                      disabled={isSubmitted}
                                      placeholder="정답 입력"
                                      className={`w-36 text-center font-bold px-2 py-1 text-sm rounded-lg border transition-all ${
                                        isSubmitted
                                          ? isCorrect
                                            ? "bg-emerald-100 text-emerald-800 border-emerald-400 font-extrabold"
                                            : "bg-rose-100 text-rose-800 border-rose-400 font-extrabold line-through"
                                          : "bg-indigo-50/50 border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:bg-white text-slate-800"
                                      }`}
                                    />
                                  </span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>

                          {!isSubmitted && (
                            <details className="mt-2 text-xs text-slate-400 group cursor-pointer select-none">
                              <summary className="hover:text-indigo-600 inline-flex items-center space-x-1">
                                <HelpCircle className="w-3.5 h-3.5" />
                                <span>힌트 확인하기</span>
                              </summary>
                              <p className="mt-1 p-2 rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                                💡 {q.hint}
                              </p>
                            </details>
                          )}

                          {isSubmitted && (
                            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center space-x-2 text-xs font-semibold">
                                {isCorrect ? (
                                  <span className="text-emerald-600 flex items-center space-x-1">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>정답입니다!</span>
                                  </span>
                                ) : (
                                  <span className="text-rose-600 flex items-center space-x-1">
                                    <XCircle className="w-4 h-4" />
                                    <span>
                                      오답 (정답:{" "}
                                      <strong className="text-slate-900 underline">
                                        {q.blankAnswer}
                                      </strong>
                                      )
                                    </span>
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => setActiveFeedbackModal(q)}
                                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold transition"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                <span>교과서 문맥 해설 피드백 보기</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {!isSubmitted && (
                  <div className="sticky bottom-6 z-20 flex justify-end">
                    <button
                      type="submit"
                      className="flex items-center space-x-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm shadow-xl shadow-emerald-200 transition transform hover:-translate-y-0.5"
                    >
                      <Send className="w-4 h-4" />
                      <span>답안 제출 및 자동 채점하기</span>
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}
        </main>
      </div>

      {/* 맞춤 피드백 모달 */}
      {activeFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <BookMarked className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">교과서 문맥 심층 피드백</h3>
                  <p className="text-[11px] text-slate-400">비상교육 중1 사회 ① 단원 핵심 개념</p>
                </div>
              </div>
              <button
                onClick={() => setActiveFeedbackModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  문제 문맥
                </span>
                <p className="text-xs sm:text-sm text-slate-700 mt-1 p-3 bg-slate-50 rounded-xl leading-relaxed">
                  {activeFeedbackModal.sentence}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xs font-bold text-indigo-800">핵심 정답 용어:</span>
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-600 text-white font-extrabold text-xs">
                    {activeFeedbackModal.blankAnswer}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-indigo-950 leading-relaxed font-normal">
                  {activeFeedbackModal.explanation}
                </p>
              </div>

              <div className="text-xs text-slate-500 bg-amber-50/80 p-3 rounded-xl border border-amber-200/60 flex items-start space-x-2">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>학습 가이드:</strong> 문맥 속에서 제도의 목적과 취지를 파악하면 다른 개념과의 혼동을 방지할 수 있습니다.
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveFeedbackModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition"
              >
                이해했습니다
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Webhook 설정 모달 */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <WebhookIcon className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm">시스템 연동 설정</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Google Apps Script Webhook URL
                </label>
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  학생들이 제출한 답안이 실시간으로 구글 스프레드시트에 자동 기록됩니다.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Gemini API Key (선택 사항)
                </label>
                <input
                  type="password"
                  placeholder="AIZA Sy..."
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  실시간으로 추가 변형 문제를 생성할 때 활용할 수 있습니다.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                취소
              </button>
              <button
                onClick={handleSaveConfig}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
              >
                설정 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 푸터 */}
      <footer className="no-print bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-400">
          <p>
            중학교 1학년 사회 ① 비상교육 교과서 기반 AI 맞춤 평가 시스템 • 대한민국 2022 개정 교육과정 준수
          </p>
          <p className="mt-1">GitHub 저장소 관리 및 Vercel 원클릭 배포 지원</p>
        </div>
      </footer>
    </div>
  );
}
