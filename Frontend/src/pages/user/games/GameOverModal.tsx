// src/components/games/GameOverModal.tsx
import React, { useState } from "react";
import { postParticipate, postMoodEntry } from "@/services/gamesAPI";

interface Props {
  open: boolean;
  onClose: () => void;
  userId?: number | null;
  gameName: string;
  attempts: number;
  timeTakenSec: number;
  matchedPairs: string[];
  onSubmitted?: () => void;
}

const GameOverModal: React.FC<Props> = ({
  open,
  onClose,
  userId = null,
  gameName,
  attempts,
  timeTakenSec,
  matchedPairs,
  onSubmitted,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [mood, setMood] = useState<number>(4);
  const [notes, setNotes] = useState("");

  if (!open) return null;

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      // send participate
      await postParticipate({
        userId,
        gameName,
        score: matchedPairs.length,
        meta: {
          attempts,
          timeTakenSec,
          matchedPairs,
        },
      });

      // send mood entry (date filled on server-side if necessary)
      await postMoodEntry({
        userId,
        mood,
        notes: notes || null,
      });

      if (onSubmitted) onSubmitted();
      onClose();
    } catch (err) {
      console.error("Submit game results error:", err);
      alert("Failed to submit game results. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => {
          if (!submitting) onClose();
        }}
      />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h3 className="text-lg font-semibold mb-2">
          Well done — game complete!
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          You matched <strong>{matchedPairs.length}</strong> strategies in{" "}
          <strong>{timeTakenSec}s</strong> using <strong>{attempts}</strong>{" "}
          attempts.
        </p>

        <div className="mb-3">
          <label className="block text-sm mb-1">
            How do you feel after the game?
          </label>
          <div className="flex gap-2">
            {[5, 4, 3, 2, 1].map((v) => (
              <button
                key={v}
                onClick={() => setMood(v)}
                className={`px-3 py-1 rounded-full border ${
                  mood === v
                    ? "bg-gradient-to-r from-green-400 to-blue-500 text-white"
                    : "bg-transparent"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-md border px-3 py-2 bg-white dark:bg-slate-800"
            placeholder="How did this game make you feel? Any thoughts?"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-md border"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 rounded-md bg-gradient-to-r from-sky-500 to-indigo-600 text-white"
          >
            {submitting ? "Sending..." : "Submit & Log Mood"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverModal;
