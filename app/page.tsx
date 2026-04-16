"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Step = 1 | 2 | 3 | 4 | "done";

const IDENTITY_CARDS = [
  { label: "reader",  gradient: "from-slate-800 to-slate-600" },
  { label: "athlete", gradient: "from-orange-700 to-rose-700" },
  { label: "writer",  gradient: "from-indigo-800 to-violet-700" },
  { label: "artist",  gradient: "from-pink-700 to-purple-700" },
] as const;

const FOCUS_AREAS = [
  { emoji: "🏃", label: "Health & Fitness" },
  { emoji: "💼", label: "Career & Learning" },
  { emoji: "🤝", label: "Relationships" },
  { emoji: "🎨", label: "Creativity" },
  { emoji: "🧠", label: "Mindset & Energy" },
  { emoji: "📚", label: "Something else" },
];

const TIME_OPTIONS = [
  { emoji: "⏱", label: "5 minutes" },
  { emoji: "🕐", label: "15 minutes" },
  { emoji: "🕑", label: "30 minutes" },
  { emoji: "🕓", label: "1 hour+" },
];

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [cardIndex, setCardIndex] = useState(0);
  const [identityStatement, setIdentityStatement] = useState("");
  const [goalCategory, setGoalCategory] = useState("");
  const [frictionPoint, setFrictionPoint] = useState("");
  const [saving, setSaving] = useState(false);

  // Rotate identity cards every 2.5 s on step 1
  useEffect(() => {
    if (step !== 1) return;
    const timer = setInterval(
      () => setCardIndex((i) => (i + 1) % IDENTITY_CARDS.length),
      2500
    );
    return () => clearInterval(timer);
  }, [step]);

  async function handleTimeSelect(label: string) {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      identity_statement: identityStatement,
      goal_category: goalCategory,
      friction_point: frictionPoint,
      time_available: label,
      user_id: user?.id ?? null,
      email: user?.email ?? null,
    };

    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // Offline — continue anyway
    }

    setSaving(false);
    setStep("done");
  }

  const card = IDENTITY_CARDS[cardIndex];

  return (
    <div className="flex flex-col min-h-full bg-white">
      {step !== "done" && (
        <div className="flex justify-center gap-2 pt-10 px-6">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                n === step ? "w-6 bg-zinc-800" : "w-1.5 bg-zinc-200"
              }`}
            />
          ))}
        </div>
      )}

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm">

          {/* Step 1 — Identity input with rotating cards */}
          {step === 1 && (
            <div className="flex flex-col gap-6">
              {/* Rotating identity card */}
              <div
                className={`relative w-full rounded-3xl bg-gradient-to-br ${card.gradient} px-6 py-10 transition-all duration-700`}
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
                  I am a
                </p>
                <p className="mt-1 text-4xl font-bold capitalize text-white">
                  {card.label}
                </p>
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                  {IDENTITY_CARDS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        i === cardIndex ? "w-4 bg-white" : "w-1 bg-white/40"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <h1 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-900">
                How can I help you be the person you want to be?
              </h1>
              <input
                type="text"
                value={identityStatement}
                onChange={(e) => setIdentityStatement(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && identityStatement.trim()) setStep(2);
                }}
                placeholder="I want to be someone who..."
                className="w-full border-b-2 border-zinc-200 bg-transparent py-3 text-lg text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-800 transition-colors"
                autoFocus
              />
              <button
                onClick={() => setStep(2)}
                disabled={!identityStatement.trim()}
                className="w-full rounded-2xl bg-zinc-900 py-4 text-base font-medium text-white transition-opacity disabled:opacity-30"
              >
                Let&apos;s figure it out
              </button>
            </div>
          )}

          {/* Step 2 — Focus area */}
          {step === 2 && (
            <div className="flex flex-col gap-8">
              <h2 className="text-2xl font-semibold leading-snug tracking-tight text-zinc-900">
                What area of your life matters most right now?
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {FOCUS_AREAS.map(({ emoji, label }) => (
                  <button
                    key={label}
                    onClick={() => { setGoalCategory(label); setStep(3); }}
                    className={`flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all ${
                      goalCategory === label
                        ? "border-zinc-900 bg-zinc-50"
                        : "border-zinc-100 bg-white hover:border-zinc-300"
                    }`}
                  >
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-sm font-medium leading-tight text-zinc-800">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — Friction point */}
          {step === 3 && (
            <div className="flex flex-col gap-8">
              <h2 className="text-2xl font-semibold leading-snug tracking-tight text-zinc-900">
                What&apos;s one thing you do (or don&apos;t do) every day that doesn&apos;t
                match who you want to be?
              </h2>
              <input
                type="text"
                value={frictionPoint}
                onChange={(e) => setFrictionPoint(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && frictionPoint.trim()) setStep(4);
                }}
                placeholder="Be honest — this is just for you."
                className="w-full border-b-2 border-zinc-200 bg-transparent py-3 text-lg text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-800 transition-colors"
                autoFocus
              />
              <button
                onClick={() => setStep(4)}
                disabled={!frictionPoint.trim()}
                className="w-full rounded-2xl bg-zinc-900 py-4 text-base font-medium text-white transition-opacity disabled:opacity-30"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 4 — Time available */}
          {step === 4 && (
            <div className="flex flex-col gap-8">
              <h2 className="text-2xl font-semibold leading-snug tracking-tight text-zinc-900">
                About how much time per day could you give to a new habit?
              </h2>
              <div className="flex flex-col gap-3">
                {TIME_OPTIONS.map(({ emoji, label }) => (
                  <button
                    key={label}
                    onClick={() => handleTimeSelect(label)}
                    disabled={saving}
                    className="flex items-center gap-4 rounded-2xl border-2 border-zinc-100 bg-white px-5 py-4 text-left transition-all hover:border-zinc-300 active:border-zinc-900 active:bg-zinc-50 disabled:opacity-50"
                  >
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-base font-medium text-zinc-800">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Done */}
          {step === "done" && (
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 text-2xl text-white">
                ✓
              </div>
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
                  You&apos;re all set.
                </h2>
                <p className="text-base leading-relaxed text-zinc-500">
                  Let&apos;s explore what kind of person you&apos;re becoming.
                </p>
              </div>
              <div className="mt-2 rounded-2xl bg-zinc-50 px-6 py-4 text-sm italic text-zinc-500">
                &ldquo;{identityStatement}&rdquo;
              </div>
              <button
                onClick={() => router.push("/constellation")}
                className="mt-2 w-full rounded-2xl bg-zinc-900 py-4 text-base font-medium text-white transition-opacity hover:opacity-90"
              >
                Meet your Insights agent →
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
