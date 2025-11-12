import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDetectDarkMode } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

// ======================
// TYPES
// ======================
type Question = {
  id: number;
  text: string;
  hint?: string;
};

// ======================
// QUESTION POOL (Randomized source)
// ======================
const QUESTION_POOL: Question[] = [
  { id: 1, text: "I have been feeling more nervous, anxious, or on edge." },
  { id: 2, text: "I have trouble falling or staying asleep." },
  { id: 3, text: "I find it hard to relax or unwind." },
  { id: 4, text: "I have difficulty concentrating on tasks." },
  { id: 5, text: "I find myself easily irritated or angry." },
  { id: 6, text: "I feel overwhelmed by my responsibilities." },
  { id: 7, text: "I experience physical tension (headache, stomach ache)." },
  { id: 8, text: "I feel disconnected from people around me." },
  { id: 9, text: "I often feel tired even after resting." },
  { id: 10, text: "I worry about things that are out of my control." },
];

// ======================
// HELPERS
// ======================
const getRandomQuestions = (count: number): Question[] => {
  const shuffled = [...QUESTION_POOL].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

const optionLabels = [
  { value: 1, label: "Not at all" },
  { value: 2, label: "Several days" },
  { value: 3, label: "More than half the days" },
  { value: 4, label: "Nearly every day" },
  { value: 5, label: "Almost always" },
];

const computeResult = (score: number) => {
  // 6 questions * options 1..5 -> min 6, max 30
  if (score <= 10) {
    return {
      level: "Low stress",
      message:
        "Your answers show low stress levels. Keep maintaining healthy habits — consider short daily mindfulness.",
    };
  } else if (score <= 20) {
    return {
      level: "Moderate stress",
      message:
        "You may be experiencing moderate stress. Try breathing exercises, short breaks, and journaling. If this continues, consider speaking to a counsellor.",
    };
  } else {
    return {
      level: "High stress",
      message:
        "Your answers indicate higher stress. It's a good idea to reach out to a counsellor, trusted friend, or support services at your university.",
    };
  }
};

// ======================
// MAIN COMPONENT
// ======================
const StressQuiz: React.FC = () => {
  const isDark = useDetectDarkMode();
  const bgColor = isDark ? "bg-gray-900" : "bg-white";
  const textColor = isDark ? "text-gray-300" : "text-gray-800";
  const mutedText = isDark ? "text-gray-400" : "text-gray-600";
  const { user } = useAuth();
  const navigate = useNavigate();

  // Local state
  const [questions, setQuestions] = useState<Question[]>(getRandomQuestions(6));
  const [answers, setAnswers] = useState<number[]>(Array(6).fill(0));
  const [index, setIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultScore, setResultScore] = useState<number | null>(null);

  const setAnswer = (qIndex: number, value: number) => {
    const next = [...answers];
    next[qIndex] = value;
    setAnswers(next);
  };

  const allAnswered = answers.every((a) => a > 0);

  const handleSubmit = async () => {
    if (!allAnswered) {
      alert("Please answer all questions before submitting.");
      return;
    }

    const score = answers.reduce((s, v) => s + v, 0);
    setResultScore(score);
    setSubmitting(true);

    try {
      const payload = {
        userId: user?.id ?? null,
        gameName: "Stress Quiz",
        score,
      };

      await fetch("/api/games/participate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("Tracking failed:", err);
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  };

  const result = resultScore !== null ? computeResult(resultScore) : null;

  return (
    <div className={`min-h-screen py-8 px-4 ${bgColor}`}>
      <div className="max-w-3xl mx-auto">
        <Card className={`rounded-2xl shadow-lg`}>
          <CardHeader className="pb-0">
            <CardTitle className={`text-xl font-bold ${textColor}`}>
              Stress Self-Check
            </CardTitle>
            <CardDescription className={`${mutedText} mt-1`}>
              A short 6-question check to reflect on how you've been feeling
              recently. This is not a diagnosis — it's a self-check to guide
              self-care.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {!submitted ? (
              <div>
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className={`${mutedText}`}>
                      Question {index + 1} of {questions.length}
                    </div>
                    <div className={`${mutedText}`}>{`${
                      answers.filter((a) => a > 0).length
                    } answered`}</div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${((index + 1) / questions.length) * 100}%`,
                        background:
                          "linear-gradient(90deg, rgba(30,58,138,1) 0%, rgba(59,130,246,1) 100%)",
                      }}
                    />
                  </div>
                </div>

                {/* Question Card */}
                <div className="mb-6">
                  <h3 className={`text-lg font-semibold ${textColor} mb-2`}>
                    {questions[index].text}
                  </h3>
                  {questions[index].hint && (
                    <p className={`${mutedText} text-sm mb-3`}>
                      {questions[index].hint}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {optionLabels.map((opt) => {
                      const selected = answers[index] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setAnswer(index, opt.value)}
                          className={`text-left rounded-lg py-3 px-4 border transition ${
                            selected
                              ? "ring-2 ring-offset-1 ring-[#3b82f6]"
                              : "border-gray-200 dark:border-gray-700"
                          } ${selected ? "bg-[#3b82f6]/10" : ""}`}
                        >
                          <div className="flex flex-col">
                            <span className={`font-medium ${textColor}`}>
                              {opt.label}
                            </span>
                            <span className={`${mutedText} text-xs`}>
                              {opt.value}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIndex((i) => Math.max(0, i - 1))}
                    disabled={index === 0}
                    className="px-4 py-2"
                  >
                    Previous
                  </Button>

                  <div className="flex items-center gap-3">
                    {index < questions.length - 1 ? (
                      <Button
                        onClick={() =>
                          setIndex((i) => Math.min(questions.length - 1, i + 1))
                        }
                        className="px-4 py-2"
                      >
                        Next
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSubmit}
                        className="px-4 py-2"
                        disabled={!allAnswered || submitting}
                        style={{
                          background:
                            "linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%)",
                          color: "white",
                        }}
                      >
                        {submitting ? "Submitting..." : "Submit"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Result View
              <div className="space-y-4">
                <div className="p-4 rounded-lg border">
                  <h3 className="text-lg font-semibold">{result?.level}</h3>
                  <p className={`${mutedText} mt-2`}>{result?.message}</p>
                  <p className={`${mutedText} mt-2 text-sm`}>
                    Your score: <strong>{resultScore}</strong>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => {
                      setQuestions(getRandomQuestions(6)); // ✅ new set of random questions
                      setAnswers(Array(6).fill(0));
                      setIndex(0);
                      setSubmitted(false);
                      setResultScore(null);
                    }}
                    variant="outline"
                    className="px-4 py-2"
                  >
                    Try Again
                  </Button>

                  <Button
                    onClick={() => navigate("/gamezone")}
                    className="px-4 py-2"
                    style={{
                      background:
                        "linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%)",
                      color: "white",
                    }}
                  >
                    Back to GameZone
                  </Button>
                </div>

                <div className="pt-4 text-sm text-gray-500">
                  <strong>Note:</strong> This quick check is for personal
                  reflection. If you are struggling or feel in immediate danger,
                  please contact your campus counselling services or local
                  emergency services.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StressQuiz;
