// src/pages/games/MindMatchingGame.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import MemoryCard from "@/pages/user/games/MemoryCard";
import GameOverModal from "@/pages/user/games/GameOverModal";
import { postParticipate, postMoodEntry } from "@/services/gamesAPI";
import { format } from "date-fns";
import { useDetectDarkMode } from "@/components/ui/card";

type CardItem = {
  uid: string;
  strategyId: string;
  label: string;
  emoji?: string;
  flipped: boolean;
  matched: boolean;
};

const COPING_STRATEGIES: { id: string; label: string; emoji?: string }[] = [
  { id: "deep_breathing", label: "Deep Breathing", emoji: "🌬️" },
  { id: "journaling", label: "Journaling", emoji: "📝" },
  { id: "walking", label: "Take a Walk", emoji: "🚶" },
  { id: "progressive_muscle", label: "Muscle Relax", emoji: "💪" },
  { id: "grounding", label: "Grounding", emoji: "🌳" },
  { id: "call_friend", label: "Call a Friend", emoji: "📞" },
  { id: "listen_music", label: "Listen to Music", emoji: "🎧" },
  { id: "stretching", label: "Stretching", emoji: "🧘" },
];

const duplicateAndShuffle = (
  strategies: typeof COPING_STRATEGIES,
  pairsCount = 6
) => {
  const copy = [...strategies];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  const chosen =
    pairsCount >= copy.length
      ? copy.slice(0, copy.length)
      : copy.slice(0, pairsCount);

  const cards: CardItem[] = [];
  chosen.forEach((s) => {
    const a: CardItem = {
      uid: `${s.id}_a_${Math.random().toString(36).slice(2, 8)}`,
      strategyId: s.id,
      label: s.label,
      emoji: s.emoji,
      flipped: false,
      matched: false,
    };
    const b: CardItem = {
      uid: `${s.id}_b_${Math.random().toString(36).slice(2, 8)}`,
      strategyId: s.id,
      label: s.label,
      emoji: s.emoji,
      flipped: false,
      matched: false,
    };
    cards.push(a, b);
  });

  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  return cards;
};

const MindMatchingGame: React.FC = () => {
  const isDark = useDetectDarkMode();
  const bgColor = isDark ? "bg-gray-900" : "bg-white";
  const textColor = isDark ? "text-gray-300" : "text-gray-800";
  const mutedText = isDark ? "text-gray-400" : "text-gray-600";
  const gradient = "linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%)";

  const rawUserId =
    typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  const userId = rawUserId ? Number(rawUserId) || null : null;

  const PAIRS = 6;
  const [cards, setCards] = useState<CardItem[]>(() =>
    duplicateAndShuffle(COPING_STRATEGIES, PAIRS)
  );
  const [first, setFirst] = useState<CardItem | null>(null);
  const [second, setSecond] = useState<CardItem | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (startTime === null && cards.some((c) => c.flipped)) {
      setStartTime(Date.now());
    }
  }, [cards, startTime]);

  useEffect(() => {
    if (startTime !== null) {
      timerRef.current = window.setInterval(() => {
        setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 500);
      return () => {
        if (timerRef.current) window.clearInterval(timerRef.current);
      };
    }
  }, [startTime]);

  useEffect(() => {
    if (matchedCount === PAIRS) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      setShowModal(true);
    }
  }, [matchedCount]);

  const handleReset = (pairs = PAIRS) => {
    setCards(duplicateAndShuffle(COPING_STRATEGIES, pairs));
    setFirst(null);
    setSecond(null);
    setDisabled(false);
    setAttempts(0);
    setMatchedCount(0);
    setStartTime(null);
    setTimeElapsed(0);
    setShowModal(false);
  };

  const handleCardClick = (card: CardItem) => {
    if (disabled || card.flipped || card.matched) return;

    setCards((prev) =>
      prev.map((c) => (c.uid === card.uid ? { ...c, flipped: true } : c))
    );

    if (!first) {
      setFirst({ ...card, flipped: true });
      return;
    }

    if (!second && first.uid !== card.uid) {
      setSecond({ ...card, flipped: true });
      setDisabled(true);
      setAttempts((a) => a + 1);

      setTimeout(() => {
        setCards((prev) => {
          const firstCard = prev.find((c) => c.uid === first.uid)!;
          const secondCard = prev.find((c) => c.uid === card.uid)!;
          if (!firstCard || !secondCard) {
            setFirst(null);
            setSecond(null);
            setDisabled(false);
            return prev;
          }

          if (firstCard.strategyId === secondCard.strategyId) {
            const next = prev.map((c) =>
              c.strategyId === firstCard.strategyId
                ? { ...c, matched: true, flipped: true }
                : c
            );
            setMatchedCount((m) => m + 1);
            setFirst(null);
            setSecond(null);
            setDisabled(false);
            return next;
          } else {
            const next = prev.map((c) =>
              c.uid === firstCard.uid || c.uid === secondCard.uid
                ? { ...c, flipped: false }
                : c
            );
            setFirst(null);
            setSecond(null);
            setDisabled(false);
            return next;
          }
        });
      }, 800);
    }
  };

  const onModalSubmitted = () => {
    // After user submits, you might want to auto-reset the board
    handleReset(PAIRS);
  };

  const submitResultsManually = async () => {
    const matchedPairs = cards
      .filter((c) => c.matched)
      .map((c) => c.strategyId)
      .filter((v, i, arr) => arr.indexOf(v) === i);

    try {
      // post mood first so admin weekly mood picks it up
      await postMoodEntry({
        userId,
        date: format(new Date(), "yyyy-MM-dd"),
        mood: 4,
        notes: "Submitted from manual button",
      });

      await postParticipate({
        userId,
        gameName: "mind_matching",
        score: matchedPairs.length,
        meta: { attempts, timeTakenSec: timeElapsed, matchedPairs },
      });

      alert("Result submitted");
    } catch (err: any) {
      console.error(err);
      alert(err?.message ?? "Failed to submit results.");
    }
  };

  const matchedPairsUnique = useMemo(() => {
    return Array.from(
      new Set(cards.filter((c) => c.matched).map((c) => c.strategyId))
    );
  }, [cards]);

  return (
    <div className={`min-h-screen py-8 px-4 ${bgColor}`}>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2
              className={`text-2xl font-semibold ${textColor}`}
              style={{
                background: gradient,
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              Mind Matching — Coping Strategies
            </h2>
            <p className={`text-sm ${mutedText}`}>
              Practice focus and reinforce healthy coping strategies.
            </p>
          </div>

          <div className="flex gap-2 items-center">
            <div className={`text-sm ${mutedText}`}>
              Attempts: <strong>{attempts}</strong>
            </div>
            <div className={`text-sm ${mutedText}`}>
              Time: <strong>{timeElapsed}s</strong>
            </div>
            <button
              onClick={() => handleReset(PAIRS)}
              className="px-3 py-1 rounded-md border"
            >
              Reset
            </button>
          </div>
        </div>

        <p className={`mb-4 text-sm ${mutedText}`}>
          Match pairs of healthy coping strategies. Each successful match
          reinforces that strategy.
        </p>

        <div
          className="grid gap-4 justify-center"
          style={{
            gridTemplateColumns:
              cards.length <= 8
                ? "repeat(4, minmax(0, 1fr))"
                : "repeat(6, minmax(0, 1fr))",
          }}
        >
          {cards.map((c) => (
            <div key={c.uid} className="flex justify-center">
              <MemoryCard
                id={c.uid}
                label={c.label}
                emoji={c.emoji}
                flipped={c.flipped}
                matched={c.matched}
                disabled={disabled}
                onClick={() => handleCardClick(c)}
              />
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => handleReset(PAIRS)}
            className="px-4 py-2 rounded-md border"
          >
            Play Again
          </button>

          <button
            onClick={submitResultsManually}
            className="px-4 py-2 rounded-md bg-indigo-600 text-white"
          >
            Submit Results Now
          </button>
        </div>

        <GameOverModal
          open={showModal}
          onClose={() => setShowModal(false)}
          userId={userId}
          gameName="mind_matching"
          attempts={attempts}
          timeTakenSec={timeElapsed}
          matchedPairs={matchedPairsUnique.map((id) => {
            const s = COPING_STRATEGIES.find((x) => x.id === id);
            return s?.label ?? id;
          })}
          onSubmitted={onModalSubmitted}
        />
      </div>
    </div>
  );
};

export default MindMatchingGame;
